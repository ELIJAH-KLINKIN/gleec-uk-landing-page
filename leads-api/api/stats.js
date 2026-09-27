// Vercel Function: GET /api/stats -> { ok, companies } (public waitlist count, CDN-cached).
// All logic lives in lib/stats-handler.js; this file only wires real dependencies.
import { createLeadRepo, createNeonDb } from '../lib/db.js';
import { createStatsHandler } from '../lib/stats-handler.js';

const databaseUrl = (process.env.DATABASE_URL || '').trim();

const handler = createStatsHandler({
  env: process.env,
  repo: databaseUrl ? createLeadRepo(createNeonDb(databaseUrl)) : null,
});

export const config = { maxDuration: 10 };

export function GET(request) {
  return handler.GET(request);
}

export function HEAD(request) {
  return handler.HEAD(request);
}

export function OPTIONS(request) {
  return handler.OPTIONS(request);
}

// Every other method gets an explicit 405 with an Allow header.
export function POST(request) {
  return handler.methodNotAllowed(request);
}
export function PUT(request) {
  return handler.methodNotAllowed(request);
}
export function PATCH(request) {
  return handler.methodNotAllowed(request);
}
export function DELETE(request) {
  return handler.methodNotAllowed(request);
}
