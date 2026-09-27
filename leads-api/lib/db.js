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

  // Rate limit for the details step: details added from this IP hash inside the window.
  countRecentDetailsByIpHash: `
    SELECT count(*)::int AS count
    FROM leads
    WHERE details_ip_hash = $1 AND details_at > $2::timestamptz`,

  // Details step, once per lead, in one statement. Only empty columns are filled (a stored
  // value is never overwritten). The WHERE on details_at makes it race-safe: of two
  // concurrent calls only one updates; the other re-checks the row after the lock and
  // matches nothing. Always returns exactly one row: outcome + the updated columns (or NULLs).
  addDetailsOnce: `
    WITH target AS (
      SELECT id FROM leads WHERE id = $1::uuid
    ), updated AS (
      UPDATE leads
      SET full_name       = COALESCE(NULLIF(full_name, ''), $2::text, full_name),
          company         = COALESCE(NULLIF(company, ''), $3::text, company),
          country         = COALESCE(NULLIF(country, ''), $4::text, country),
          phone           = COALESCE(NULLIF(phone, ''), $5::text, phone),
          business_type   = COALESCE(NULLIF(business_type, ''), $6::text, business_type),
          currencies      = CASE WHEN cardinality(currencies) = 0 THEN $7::text[] ELSE currencies END,
          monthly_volume  = COALESCE(NULLIF(monthly_volume, ''), $8::text, monthly_volume),
          message         = COALESCE(NULLIF(message, ''), $9::text, message),
          details_ip_hash = $10::text,
          details_at      = now()
      WHERE id = $1::uuid AND details_at IS NULL
      RETURNING id, created_at, status, full_name, email, company, country, phone, business_type,
                currencies, monthly_volume, message, consent, consent_at, source, details_at
    )
    SELECT CASE
             WHEN EXISTS (SELECT 1 FROM updated) THEN 'updated'
             WHEN EXISTS (SELECT 1 FROM target) THEN 'already_submitted'
             ELSE 'not_found'
           END AS outcome,
           updated.*
    FROM (SELECT 1) AS one
    LEFT JOIN updated ON true`,

  // Public waitlist size: distinct emails, disqualified leads excluded.
  countCompanies: `
    SELECT count(DISTINCT lower(email))::int AS count
    FROM leads
    WHERE status <> 'disqualified'`,
};

const toIso = (value) => (value == null ? null : new Date(value).toISOString());

/** A leads row (snake_case, as RETURNING gives it) as the camelCase record notify.js uses. */
function toRecord(row) {
  return {
    id: row.id,
    createdAt: toIso(row.created_at),
    status: row.status,
    fullName: row.full_name ?? null,
    email: row.email,
    company: row.company ?? null,
    country: row.country ?? null,
    phone: row.phone ?? null,
    businessType: row.business_type ?? null,
    currencies: row.currencies ?? [],
    monthlyVolume: row.monthly_volume ?? null,
    message: row.message ?? null,
    consent: row.consent === true,
    consentAt: toIso(row.consent_at),
    source: row.source ?? {},
    detailsAt: toIso(row.details_at),
  };
}

export function createLeadRepo(db) {
  return {
    async countRecentByIpHash(ipHash, since) {
      const rows = await db.query(SQL.countRecentByIpHash, [ipHash, toIso(since)]);
      return Number(rows[0]?.count ?? 0);
    },

    /** @returns {Promise<{ id: string, createdAt: string, duplicate: boolean }>} */
    async insertLeadUnlessDuplicate(lead, { duplicateSince }) {
      const params = [
        lead.fullName ?? null,
        lead.email,
        lead.company ?? null,
        lead.country ?? null,
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

    async countRecentDetailsByIpHash(ipHash, since) {
      const rows = await db.query(SQL.countRecentDetailsByIpHash, [ipHash, toIso(since)]);
      return Number(rows[0]?.count ?? 0);
    },

    /**
     * @param {string} id  canonical lead UUID
     * @param {object} details  validated detail fields (null / [] = not given)
     * @returns {Promise<{ outcome: 'updated', record: object } | { outcome: 'already_submitted' | 'not_found' }>}
     */
    async addDetailsOnce(id, details, { ipHash = null } = {}) {
      const rows = await db.query(SQL.addDetailsOnce, [
        id,
        details.fullName ?? null,
        details.company ?? null,
        details.country ?? null,
        details.phone ?? null,
        details.businessType ?? null,
        details.currencies ?? [],
        details.monthlyVolume ?? null,
        details.message ?? null,
        ipHash,
      ]);
      const row = rows[0];
      if (!row || !row.outcome) throw new Error('details update returned no row');
      if (row.outcome !== 'updated') return { outcome: row.outcome };
      return { outcome: 'updated', record: toRecord(row) };
    },

    async countCompanies() {
      const rows = await db.query(SQL.countCompanies, []);
      return Number(rows[0]?.count ?? 0);
    },
  };
}
