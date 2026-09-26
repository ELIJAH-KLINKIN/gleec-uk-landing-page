// Vercel Function: GET /api/health -> { ok, db, telegram, crm } (booleans, never values).
import { healthResponse } from '../lib/health.js';

export function GET() {
  return healthResponse(process.env);
}
