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
      null,
      null,
      null,
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
    assert.deepEqual(db.calls[0].params, ['id-1', 'sent', '2026-09-26T12:00:02.000Z', 'not_configured', null, null, null]);
  });

  it('recordNotificationResults keeps the first ping\'s chat and message id (written once)', async () => {
    const db = recordingDb();
    await createLeadRepo(db).recordNotificationResults('id-1', {
      telegramStatus: 'sent',
      telegramSentAt: null,
      crmStatus: 'not_configured',
      crmSentAt: null,
      telegramChatId: '-1001234',
      telegramMessageId: 42,
    });
    assert.deepEqual(db.calls[0].params.slice(5), ['-1001234', 42]);
    assert.match(SQL.recordNotificationResults, /telegram_message_id = COALESCE\(\$7::bigint, telegram_message_id\)/);
  });

  it('insertLeadUnlessDuplicate sends null for an email-only lead', async () => {
    const db = recordingDb({ transactionResults: [[{}], [{ id: 'new-id', created_at: new Date(), duplicate: false }]] });
    const emailOnly = { email: 'ada@example.co.uk', consent: true, consentAt: lead.consentAt, source: {} };
    await createLeadRepo(db).insertLeadUnlessDuplicate(emailOnly, { duplicateSince: new Date() });
    const params = db.calls[0].statements[1].params;
    assert.deepEqual(params.slice(0, 9), [null, 'ada@example.co.uk', null, null, null, null, [], null, null]);
  });

  it('countRecentDetailsByIpHash counts details added from the IP hash', async () => {
    const db = recordingDb({ queryRows: [{ count: 2 }] });
    const since = new Date('2026-09-26T11:50:00.000Z');
    assert.equal(await createLeadRepo(db).countRecentDetailsByIpHash('abc', since), 2);
    assert.equal(db.calls[0].text, SQL.countRecentDetailsByIpHash);
    assert.deepEqual(db.calls[0].params, ['abc', '2026-09-26T11:50:00.000Z']);
    assert.match(SQL.countRecentDetailsByIpHash, /details_ip_hash = \$1 AND details_at > \$2/);
  });

  describe('addDetailsOnce', () => {
    const ID = '3f1c2b1e-7a1d-4a55-9d0b-6a8c1e2f4b77';
    const updatedRow = {
      outcome: 'updated',
      id: ID,
      created_at: new Date('2026-09-26T12:00:00.000Z'),
      status: 'new',
      full_name: 'Ada Lovelace',
      email: 'ada@example.co.uk',
      company: 'Analytical Engines Ltd',
      country: null,
      phone: '+44 20 7946 0958',
      business_type: null,
      currencies: ['GBP'],
      monthly_volume: null,
      message: null,
      consent: true,
      consent_at: new Date('2026-09-26T12:00:00.000Z'),
      source: { page: 'https://example.com/' },
      details_at: new Date('2026-09-26T12:01:00.000Z'),
      first_name: 'Ada',
      last_name: 'Lovelace',
      company_website: 'https://analytical.example',
      telegram_chat_id: '-1001234',
      telegram_message_id: '42', // Postgres bigint arrives as a string
    };

    it('runs one parameterised statement and maps the updated row to a camelCase record', async () => {
      const db = recordingDb({ queryRows: [updatedRow] });
      const result = await createLeadRepo(db).addDetailsOnce(
        ID,
        {
          fullName: 'Ada Lovelace',
          firstName: 'Ada',
          lastName: 'Lovelace',
          company: 'Analytical Engines Ltd',
          companyWebsite: 'https://analytical.example',
          phone: '+44 20 7946 0958',
          currencies: ['GBP'],
        },
        { ipHash: 'abc' },
      );
      assert.equal(db.calls.length, 1);
      assert.equal(db.calls[0].kind, 'query');
      assert.equal(db.calls[0].text, SQL.addDetailsOnce);
      assert.deepEqual(db.calls[0].params, [
        ID,
        'Ada Lovelace',
        'Analytical Engines Ltd',
        null,
        '+44 20 7946 0958',
        null,
        ['GBP'],
        null,
        null,
        'abc',
        'Ada',
        'Lovelace',
        'https://analytical.example',
      ]);
      assert.deepEqual(result, {
        outcome: 'updated',
        record: {
          id: ID,
          createdAt: '2026-09-26T12:00:00.000Z',
          status: 'new',
          fullName: 'Ada Lovelace',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.co.uk',
          company: 'Analytical Engines Ltd',
          companyWebsite: 'https://analytical.example',
          country: null,
          phone: '+44 20 7946 0958',
          businessType: null,
          currencies: ['GBP'],
          monthlyVolume: null,
          message: null,
          consent: true,
          consentAt: '2026-09-26T12:00:00.000Z',
          source: { page: 'https://example.com/' },
          detailsAt: '2026-09-26T12:01:00.000Z',
          telegramChatId: '-1001234',
          telegramMessageId: 42,
        },
      });
    });

    it('reports already_submitted and not_found without a record', async () => {
      for (const outcome of ['already_submitted', 'not_found']) {
        const db = recordingDb({ queryRows: [{ outcome, id: null }] });
        assert.deepEqual(await createLeadRepo(db).addDetailsOnce(ID, {}, {}), { outcome });
        assert.deepEqual(db.calls[0].params, [ID, null, null, null, null, null, [], null, null, null, null, null, null]);
      }
    });

    it('fails loudly if the database returns nothing', async () => {
      await assert.rejects(createLeadRepo(recordingDb({ queryRows: [] })).addDetailsOnce(ID, {}, {}));
    });

    it('is race-safe and never overwrites a stored value', () => {
      assert.match(SQL.addDetailsOnce, /WHERE id = \$1::uuid AND details_at IS NULL/);
      assert.match(SQL.addDetailsOnce, /details_at\s+= now\(\)/);
      for (const column of ['full_name', 'company', 'country', 'phone', 'business_type', 'monthly_volume', 'message']) {
        assert.match(SQL.addDetailsOnce, new RegExp(`${column}\\s+= COALESCE\\(NULLIF\\(${column}, ''\\), \\$\\d+::text, ${column}\\)`), column);
      }
      assert.match(SQL.addDetailsOnce, /currencies\s+= CASE WHEN cardinality\(currencies\) = 0 THEN \$7::text\[\] ELSE currencies END/);
    });
  });

  it('countCompanies counts distinct emails, disqualified leads excluded', async () => {
    const db = recordingDb({ queryRows: [{ count: 42 }] });
    assert.equal(await createLeadRepo(db).countCompanies(), 42);
    assert.equal(db.calls[0].text, SQL.countCompanies);
    assert.match(SQL.countCompanies, /count\(DISTINCT lower\(email\)\)/);
    assert.match(SQL.countCompanies, /status <> 'disqualified'/);
  });

  it('every query uses placeholders, never interpolated values', () => {
    for (const text of Object.values(SQL)) {
      assert.equal(/\$\{/.test(text), false);
      assert.equal(/'[^']*@[^']*'/.test(text), false);
    }
  });
});

describe('splitSqlStatements', () => {
  it('splits db/schema.sql into its eleven statements', () => {
    const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
    const statements = splitSqlStatements(schema);
    assert.equal(statements.length, 11);
    assert.match(statements[0], /^(--[^\n]*\n\s*)*create table if not exists leads/);
    assert.match(statements[0], /constraint leads_email_lowercase_check check \(email = lower\(email\)\)\n\)$/);
    assert.match(statements[0], /full_name\s+text,/);
    assert.match(statements[0], /details_at\s+timestamptz,/);
    assert.match(statements[1], /^(--[^\n]*\n\s*)*alter table leads\n/);
    for (const column of ['full_name', 'company', 'country']) {
      assert.match(statements[1], new RegExp(`alter column ${column} drop not null`));
    }
    assert.match(statements[1], /add column if not exists details_at timestamptz/);
    assert.match(statements[1], /add column if not exists telegram_message_id bigint$/);
    for (const s of statements.slice(2, 6)) assert.match(s, /create index if not exists/);
    // "Talk to a human": hosts, call requests and their indexes (the unique one blocks double booking).
    assert.match(statements[6], /create table if not exists calendar_hosts/);
    assert.match(statements[7], /create table if not exists call_requests/);
    assert.match(statements[8], /create unique index if not exists call_requests_host_start_uidx/);
    for (const s of statements.slice(9)) assert.match(s, /create index if not exists call_requests_/);
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
