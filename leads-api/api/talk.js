// Vercel Function: POST /api/talk (request a call) and GET /api/talk (free times).
// All logic lives in lib/talk-handler.js.
import { talkHandler } from '../lib/talk-deps.js';

export const config = { maxDuration: 30 };

export const POST = (request) => talkHandler().POST(request);
export const GET = (request) => talkHandler().GET(request);
export const OPTIONS = (request) => talkHandler().OPTIONS(request);
export const HEAD = (request) => talkHandler().methodNotAllowed(request);
export const PUT = (request) => talkHandler().methodNotAllowed(request);
export const PATCH = (request) => talkHandler().methodNotAllowed(request);
export const DELETE = (request) => talkHandler().methodNotAllowed(request);
