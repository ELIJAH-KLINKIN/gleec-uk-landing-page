// Postgres access. The repository talks to a tiny adapter so tests can fake it:
//   db.query(text, params)                 -> Promise<rows[]>
//   db.transaction([{ text, params }], opts) -> Promise<rows[][]>
import { neon } from '@neondatabase/serverless';

/** Adapter over Neon's HTTP driver (one HTTPS request per query/transaction). */
export function createNeonDb(databaseUrl) {
  const sql = neon(databaseUrl);
  return {
    query: (text, params = []) => sql.query(text, params),
    transaction: (statements, options) =>
      sql.transaction(
        statements.map((s) => sql.query(s.text, s.params ?? [])),
        options,
      ),
  };
}

// Arbitrary constant namespacing our advisory locks from anyone else's.
const LOCK_NAMESPACE = 704_512;

export const SQL = {
  countRecentByIpHash: `
    SELECT count(*)::int AS count
    FROM leads
    WHERE ip_hash = $1 AND created_at > $2::timestamptz`,

  // Serialises concurrent submissions for the same email (released at commit).
  lockEmail: `SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}, hashtext($1::text))`,

  // Inserts unless the same email already submitted after $15; returns exactly one row.
  insertUnlessDuplicate: `
    WITH existing AS (
      SELECT id, created_at
      FROM leads
      WHERE email = $2::text AND created_at > $15::timestamptz
      ORDER BY created_at DESC
      LIMIT 1
    ), inserted AS (
      INSERT INTO leads (
        full_name, email, company, country, phone, business_type, currencies,
        monthly_volume, message, consent, consent_at, source, ip_hash, user_agent
      )
      SELECT $1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::text[],
             $8::text, $9::text, $10::boolean, $11::timestamptz, $12::jsonb, $13::text, $14::text
      WHERE NOT EXISTS (SELECT 1 FROM existing)
      RETURNING id, created_at
    )
    SELECT id, created_at, false AS duplicate FROM inserted
    UNION ALL
    SELECT id, created_at, true AS duplicate FROM existing`,

  recordNotificationResults: `
    UPDATE leads
    SET telegram_status = $2, telegram_sent_at = $3::timestamptz,
        crm_status = $4, crm_sent_at = $5::timestamptz
    WHERE id = $1::uuid`,
};

const toIso = (value) => (value == null ? null : new Date(value).toISOString());

export function createLeadRepo(db) {
  return {
    async countRecentByIpHash(ipHash, since) {
      const rows = await db.query(SQL.countRecentByIpHash, [ipHash, toIso(since)]);
      return Number(rows[0]?.count ?? 0);
    },

    /** @returns {Promise<{ id: string, createdAt: string, duplicate: boolean }>} */
    async insertLeadUnlessDuplicate(lead, { duplicateSince }) {
      const params = [
        lead.fullName,
        lead.email,
        lead.company,
        lead.country,
        lead.phone ?? null,
        lead.businessType ?? null,
        lead.currencies ?? [],
        lead.monthlyVolume ?? null,
        lead.message ?? null,
        lead.consent === true,
        toIso(lead.consentAt),
        JSON.stringify(lead.source ?? {}),
        lead.ipHash ?? null,
        lead.userAgent ?? null,
        toIso(duplicateSince),
      ];
      const results = await db.transaction(
        [
          { text: SQL.lockEmail, params: [lead.email] },
          { text: SQL.insertUnlessDuplicate, params },
        ],
        { isolationLevel: 'ReadCommitted' },
      );
      const row = results[1]?.[0];
      if (!row || !row.id) throw new Error('insert returned no row');
      return { id: row.id, createdAt: toIso(row.created_at), duplicate: row.duplicate === true };
    },

    async recordNotificationResults(id, { telegramStatus, telegramSentAt, crmStatus, crmSentAt }) {
      await db.query(SQL.recordNotificationResults, [
        id,
        telegramStatus ?? null,
        toIso(telegramSentAt),
        crmStatus ?? null,
        toIso(crmSentAt),
      ]);
    },
  };
}
