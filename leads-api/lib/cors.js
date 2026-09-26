// CORS with an exact-match allow-list. Only an allowed origin is ever echoed.

export function isOriginAllowed(origin, allowedOrigins) {
  return typeof origin === 'string' && origin !== '' && allowedOrigins.has(origin);
}

/** Headers for a normal (non-preflight) response. */
export function corsHeaders(origin, allowedOrigins) {
  const headers = { vary: 'Origin' };
  if (isOriginAllowed(origin, allowedOrigins)) {
    headers['access-control-allow-origin'] = origin;
  }
  return headers;
}

/** Headers for a successful preflight from an allowed origin. */
export function preflightHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'Content-Type',
    'access-control-max-age': '7200',
    vary: 'Origin, Access-Control-Request-Method, Access-Control-Request-Headers',
  };
}
