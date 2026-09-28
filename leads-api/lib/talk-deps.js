// Real dependencies for the /api/talk functions (one handler per warm instance).
import { waitUntil } from '@vercel/functions';
import { createNeonDb, createTalkRepo } from './db.js';
import { createTalkHandler } from './talk-handler.js';

let handler = null;

export function talkHandler() {
  if (!handler) {
    const databaseUrl = (process.env.DATABASE_URL || '').trim();
    handler = createTalkHandler({
      env: process.env,
      repo: databaseUrl ? createTalkRepo(createNeonDb(databaseUrl)) : null,
      fetch: (...args) => globalThis.fetch(...args),
      waitUntil,
    });
  }
  return handler;
}
