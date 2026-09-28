// Vercel Function: POST /api/talk/book — books the chosen time with a Google Meet link.
import { talkHandler } from '../../lib/talk-deps.js';

export const config = { maxDuration: 30 };

export const POST = (request) => talkHandler().BOOK(request);
export const OPTIONS = (request) => talkHandler().BOOK_OPTIONS(request);
export const GET = (request) => talkHandler().bookMethodNotAllowed(request);
export const HEAD = (request) => talkHandler().bookMethodNotAllowed(request);
export const PUT = (request) => talkHandler().bookMethodNotAllowed(request);
export const PATCH = (request) => talkHandler().bookMethodNotAllowed(request);
export const DELETE = (request) => talkHandler().bookMethodNotAllowed(request);
