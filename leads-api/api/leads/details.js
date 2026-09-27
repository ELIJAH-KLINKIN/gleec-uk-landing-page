// Vercel Function: POST /api/leads/details (second, optional step of the email-first form).
// All logic lives in lib/details-handler.js; this file only wires real dependencies.
import { waitUntil } from '@vercel/functions';
import { createLeadRepo, createNeonDb } from '../../lib/db.js';
import { createDetailsHandler } from '../../lib/details-handler.js';

const databaseUrl = (process.env.DATABASE_URL || '').trim();

const handler = createDetailsHandler({
  env: process.env,
  repo: databaseUrl ? createLeadRepo(createNeonDb(databaseUrl)) : null,
  fetch: (...args) => globalThis.fetch(...args),
  // Telegram + CRM run after the response is sent; waitUntil keeps the function alive for them.
  waitUntil,
});

export const config = { maxDuration: 30 };

export function POST(request) {
  return handler.POST(request);
}

export function OPTIONS(request) {
  return handler.OPTIONS(request);
}

// Every other method gets an explicit 405 with an Allow header.
export function GET(request) {
  return handler.methodNotAllowed(request);
}
export function HEAD(request) {
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
