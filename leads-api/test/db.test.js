import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { SQL, createLeadRepo } from '../lib/db.js';
import { splitSqlStatements } from '../lib/sql-split.js';

/** Records every call; answers with the queued results. */
function recordingDb({ queryRows = [], transactionResults = [] } = {}) {
  const calls = [];
  return {
    calls,
    async query(text, params) {
      calls.push({ kind: 'query', text, params });
      return queryRows;
    },
    async transaction(statements, options) {
      calls.push({ kind: 'transaction', statements, options });
      return transactionResults;
    },
  };
}

const lead = {
  fullName: 'Ada Lovelace',
  email: 'ada@example.co.uk',
  company: 'Analytical Engines Ltd',
  country: 'United Kingdom',
  phone: null,
  businessType: 'group',
  currencies: ['GBP', 'USD'],
  monthlyVolume: 'gt_5m',
  message: null,
  consent: true,
  consentAt: '2026-09-26T12:00:00.000Z',
  source: { page: 'https://example.com/' },
  ipHash: 'abc',
  userAgent: 'UA',
};

describe('createLeadRepo', () => {
  it('countRecentByIpHash sends a parameterised query and returns a number', async () => {
    const db = recordingDb({ queryRows: [{ count: 3 }] });
    const repo = createLeadRepo(db);
    const since = new Date('2026-09-26T11:50:00.000Z');
    assert.equal(await repo.countRecentByIpHash('abc', since), 3);
    assert.deepEqual(db.calls[0].params, ['abc', '2026-09-26T11:50:00.000Z']);
    assert.equal(db.calls[0].text, SQL.countRecentByIpHash);
  });

  it('insertLeadUnlessDuplicate locks on the email then inserts in one READ COMMITTED transaction', async () => {
    const created = new Date('2026-09-26T12:00:01.000Z');
    const db = recordingDb({ transactionResults: [[{}], [{ id: 'new-id', created_at: created, duplicate: false }]] });
    const repo = createLeadRepo(db);
    const result = await repo.insertLeadUnlessDuplicate(lead, { duplicateSince: new Date('2026-09-25T12:00:00.000Z') });

    assert.deepEqual(result, { id: 'new-id', createdAt: '2026-09-26T12:00:01.000Z', duplicate: false });
    const [call] = db.calls;
    assert.equal(call.kind, 'transaction');
    assert.deepEqual(call.options, { isolationLevel: 'ReadCommitted' });
    assert.equal(call.statements[0].text, SQL.lockEmail);
    assert.deepEqual(call.statements[0].params, ['ada@example.co.uk']);
    assert.equal(call.statements[1].text, SQL.insertUnlessDuplicate);
    assert.deepEqual(call.statements[1].params, [
      'Ada Lovelace',
      'ada@example.co.uk',
      'Analytical Engines Ltd',
      'United Kingdom',
      null,
      'group',
      ['GBP', 'USD'],
      'gt_5m',
      null,
      true,
      '2026-09-26T12:00:00.000Z',
      '{"page":"https://example.com/"}',
      'abc',
      'UA',
      '2026-09-25T12:00:00.000Z',
    ]);
  });

  it('insertLeadUnlessDuplicate reports an existing lead as a duplicate', async () => {
    const db = recordingDb({
      transactionResults: [[{}], [{ id: 'old-id', created_at: '2026-09-26T09:00:00.000Z', duplicate: true }]],
    });
    const result = await createLeadRepo(db).insertLeadUnlessDuplicate(lead, { duplicateSince: new Date() });
    assert.deepEqual(result, { id: 'old-id', createdAt: '2026-09-26T09:00:00.000Z', duplicate: true });
  });

  it('insertLeadUnlessDuplicate fails loudly if the database returns nothing', async () => {
    const db = recordingDb({ transactionResults: [[{}], []] });
    await assert.rejects(createLeadRepo(db).insertLeadUnlessDuplicate(lead, { duplicateSince: new Date() }));
  });

  it('recordNotificationResults updates by id', async () => {
    const db = recordingDb();
    await createLeadRepo(db).recordNotificationResults('id-1', {
      telegramStatus: 'sent',
      telegramSentAt: new Date('2026-09-26T12:00:02.000Z'),
      crmStatus: 'not_configured',
      crmSentAt: null,
    });
    assert.equal(db.calls[0].text, SQL.recordNotificationResults);
    assert.deepEqual(db.calls[0].params, ['id-1', 'sent', '2026-09-26T12:00:02.000Z', 'not_configured', null]);
  });

  it('every query uses placeholders, never interpolated values', () => {
    for (const text of Object.values(SQL)) {
      assert.equal(/\$\{/.test(text), false);
      assert.equal(/'[^']*@[^']*'/.test(text), false);
    }
  });
});

describe('splitSqlStatements', () => {
  it('splits db/schema.sql into its four statements', () => {
    const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
    const statements = splitSqlStatements(schema);
    assert.equal(statements.length, 4);
    assert.match(statements[0], /^(--[^\n]*\n\s*)*create table if not exists leads/);
    assert.match(statements[0], /constraint leads_email_lowercase_check check \(email = lower\(email\)\)\n\)$/);
    for (const s of statements.slice(1)) assert.match(s, /create index if not exists/);
  });

  it('ignores semicolons inside strings, identifiers, comments and dollar quotes', () => {
    const script = `
      -- a comment; with a semicolon
      select 'a;b', "we;ird";
      /* block; comment */
      create function f() returns int as $body$ begin return 1; end; $body$ language plpgsql;
      select $$x;y$$;
      select 'it''s; fine';
      -- trailing comment only
    `;
    const statements = splitSqlStatements(script);
    assert.equal(statements.length, 4);
    assert.match(statements[0], /select 'a;b', "we;ird"$/);
    assert.match(statements[1], /\$body\$ begin return 1; end; \$body\$ language plpgsql$/);
    assert.match(statements[2], /select \$\$x;y\$\$$/);
    assert.match(statements[3], /select 'it''s; fine'$/);
  });

  it('keeps $1 placeholders intact', () => {
    assert.deepEqual(splitSqlStatements('select $1; select $2'), ['select $1', 'select $2']);
  });
});
