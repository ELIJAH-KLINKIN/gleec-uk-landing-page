import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TALK_SQL, createTalkRepo } from '../lib/db.js';

function fakeDb(respond) {
  const calls = [];
  return { calls, query: async (text, params) => (calls.push({ text, params }), respond(text, params)) };
}

describe('createTalkRepo', () => {
  it('claimSlot: claimed / not_requested / slot_taken (unique violation)', async () => {
    const at = { hostEmail: 'a@x.com', startAt: Date.parse('2026-09-29T09:00:00Z'), endAt: Date.parse('2026-09-29T09:20:00Z') };
    assert.equal(await createTalkRepo(fakeDb(() => [{ id: 'x' }])).claimSlot('x', at), 'claimed');
    assert.equal(await createTalkRepo(fakeDb(() => [])).claimSlot('x', at), 'not_requested');
    const dup = Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });
    assert.equal(await createTalkRepo(fakeDb(() => { throw dup; })).claimSlot('x', at), 'slot_taken');
    await assert.rejects(createTalkRepo(fakeDb(() => { throw new Error('boom'); })).claimSlot('x', at), /boom/);
  });

  it('insertRequest sends the source as JSON and maps rows to camelCase', async () => {
    const db = fakeDb((text) =>
      text === TALK_SQL.insertRequest
        ? [{ id: 'id-1', created_at: '2026-09-28T12:00:00Z' }]
        : [{ id: 'id-1', email: 'a@x.com', first_name: 'Ada', last_name: 'L', status: 'requested', source: {} }],
    );
    const repo = createTalkRepo(db);
    await repo.insertRequest({ email: 'a@x.com', firstName: 'Ada', lastName: 'L', source: { page: 'p' } });
    assert.equal(db.calls[0].params[7], '{"page":"p"}');
    const row = await repo.getRequest('id-1');
    assert.equal(row.firstName, 'Ada');
    assert.equal(row.status, 'requested');
  });
});
