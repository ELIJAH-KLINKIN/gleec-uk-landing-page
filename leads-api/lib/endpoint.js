// Request plumbing shared by the functions: origin gate, preflight, 405, JSON body and
// post-response work. Each handler factory builds on these; none of them does I/O itself.
import { MAX_BODY_BYTES } from './constants.js';
import { corsHeaders, isOriginAllowed, preflightHeaders } from './cors.js';
import { BodyTooLargeError, describeError, isJsonContentType, json, readBodyText } from './http.js';
import { MESSAGES, isPlainObject } from './validate.js';

/**
 * CORS responses for one endpoint.
 * @param {Set<string>} allowedOrigins
 * @param {string} methods what the endpoint answers, e.g. 'POST, OPTIONS' (preflight + Allow header)
 */
export function createCorsGate(allowedOrigins, methods) {
  const isAllowed = (origin) => isOriginAllowed(origin, allowedOrigins);
  const headers = (origin) => corsHeaders(origin, allowedOrigins);
  const forbidden = () => json(403, { ok: false, error: 'origin_not_allowed' }, { vary: 'Origin' });

  function preflight(request) {
    const origin = request.headers.get('origin');
    if (!isAllowed(origin)) return forbidden();
    return new Response(null, { status: 204, headers: preflightHeaders(origin, methods) });
  }

  function methodNotAllowed(request) {
    const h = { ...headers(request.headers.get('origin')), allow: methods };
    if (request.method === 'HEAD') {
      return new Response(null, { status: 405, headers: { ...h, 'cache-control': 'no-store' } });
    }
    return json(405, { ok: false, error: 'method_not_allowed' }, h);
  }

  return { isAllowed, headers, forbidden, preflight, methodNotAllowed };
}

/**
 * Reads a JSON-object body (Content-Type application/json, at most maxBytes).
 * @returns {Promise<{ ok: true, body: object } | { ok: false, status: number, body: object }>}
 */
export async function readJsonObject(request, maxBytes = MAX_BODY_BYTES) {
  if (!isJsonContentType(request.headers.get('content-type'))) {
    return { ok: false, status: 415, body: { ok: false, error: 'unsupported_media_type' } };
  }

  let text;
  try {
    text = await readBodyText(request, maxBytes);
  } catch (error) {
    if (error instanceof BodyTooLargeError) return { ok: false, status: 413, body: { ok: false, error: 'payload_too_large' } };
    throw error;
  }

  const notAnObject = { ok: false, status: 400, body: { ok: false, error: 'validation', fields: { body: MESSAGES.body } } };
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return notAnObject;
  }
  return isPlainObject(body) ? { ok: true, body } : notAnObject;
}

/**
 * Hands post-response work (notifications) to waitUntil. Without waitUntil — or when it
 * throws — the work is awaited before responding instead, so it is never lost.
 */
export async function afterResponse(task, { waitUntil, log, event }) {
  if (waitUntil) {
    try {
      waitUntil(task);
      return;
    } catch (error) {
      log.warn(event, { error: describeError(error) });
    }
  }
  await task;
}
