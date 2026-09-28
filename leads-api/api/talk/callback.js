// Vercel Function: GET /api/talk/callback — Google's redirect after a host grants access.
import { talkHandler } from '../../lib/talk-deps.js';

export const config = { maxDuration: 30 };

export const GET = (request) => talkHandler().CALLBACK(request);
