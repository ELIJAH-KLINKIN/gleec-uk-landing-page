#!/usr/bin/env node
// Applies db/schema.sql to DATABASE_URL, all statements in one transaction.
// Usage:  npm run migrate                      (reads DATABASE_URL from env, .env.local or .env)
//         DATABASE_URL=postgres://... npm run migrate
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';
import { splitSqlStatements } from '../lib/sql-split.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

if (!process.env.DATABASE_URL) {
  for (const file of ['.env.local', '.env']) {
    const path = join(root, file);
    if (existsSync(path)) {
      process.loadEnvFile(path);
      if (process.env.DATABASE_URL) break;
    }
  }
}

const databaseUrl = (process.env.DATABASE_URL || '').trim();
if (!databaseUrl) {
  console.error('DATABASE_URL is not set (checked the environment, .env.local and .env).');
  process.exit(1);
}

const statements = splitSqlStatements(readFileSync(join(root, 'db', 'schema.sql'), 'utf8'));
const sql = neon(databaseUrl);

try {
  await sql.transaction(statements.map((statement) => sql.query(statement)));
  const [{ count }] = await sql.query('SELECT count(*)::int AS count FROM leads');
  console.log(`Schema applied (${statements.length} statements). leads table has ${count} row(s).`);
} catch (error) {
  console.error(`Migration failed: ${error.message}`);
  process.exit(1);
}
