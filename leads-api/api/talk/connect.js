// Vercel Function: GET /api/talk/connect — a host connects their Google Calendar.
import { talkHandler } from '../../lib/talk-deps.js';

export const GET = (request) => talkHandler().CONNECT(request);
