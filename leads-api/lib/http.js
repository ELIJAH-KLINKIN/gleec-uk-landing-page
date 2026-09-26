// Small HTTP helpers built on the Web-standard Request/Response/fetch APIs.

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...headers },
  });
}

export function isJsonContentType(value) {
  if (typeof value !== 'string') return false;
  return value.split(';')[0].trim().toLowerCase() === 'application/json';
}

export class BodyTooLargeError extends Error {
  constructor() {
    super('Request body too large');
    this.name = 'BodyTooLargeError';
  }
}

/**
 * Reads the body as UTF-8 text, refusing (BodyTooLargeError) as soon as it
 * exceeds maxBytes — checked against Content-Length first, then while streaming,
 * so an oversized body is never buffered in full.
 */
export async function readBodyText(request, maxBytes) {
  const declared = request.headers.get('content-length');
  if (declared !== null && /^\d+$/.test(declared.trim()) && Number(declared) > maxBytes) {
    throw new BodyTooLargeError();
  }
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      reader.cancel().catch(() => {});
      throw new BodyTooLargeError();
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * fetch() with a hard deadline that covers both the response headers and the
 * body. Resolves to { ok, status, text }; rejects on network error or timeout.
 */
export async function fetchWithTimeout(fetchFn, url, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(new Error(`timed out after ${timeoutMs} ms`)),
    timeoutMs,
  );
  try {
    const response = await fetchFn(url, { ...init, signal: controller.signal });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } finally {
    clearTimeout(timer);
  }
}

/** Short, single-line error description for logs and status columns. */
export function describeError(error) {
  if (!error) return 'unknown error';
  const message = error instanceof Error ? error.message : String(error);
  const cause = error instanceof Error && error.cause ? ` (${error.cause.code || error.cause.message || error.cause})` : '';
  return `${message}${cause}`.replace(/\s+/g, ' ').trim();
}
