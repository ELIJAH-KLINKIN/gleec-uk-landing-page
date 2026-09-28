// Google Calendar over plain HTTPS (no SDK): OAuth for the hosts who take calls,
// free/busy lookups, and creating the event with a Google Meet link. Every function
// takes `fetch` so tests can fake Google. Tokens are never logged.
import { fetchWithTimeout } from './http.js';

export const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.freebusy',
  'https://www.googleapis.com/auth/calendar.events',
];

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CALENDAR = 'https://www.googleapis.com/calendar/v3';
const TIMEOUT_MS = 8000;

export class GoogleError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'GoogleError';
    this.status = status;
  }
}

async function call(fetch, url, init) {
  const response = await fetchWithTimeout(fetch, url, init, TIMEOUT_MS);
  let data = null;
  try {
    data = response.text ? JSON.parse(response.text) : null;
  } catch {
    // non-JSON error page
  }
  if (!response.ok) {
    const reason = data?.error_description || data?.error?.message || data?.error || `HTTP ${response.status}`;
    throw new GoogleError(String(reason).slice(0, 200), response.status);
  }
  return data;
}

/** The consent screen URL a host opens once to connect their calendar. */
export function authorizationUrl({ clientId, redirectUri, state }) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline', // we need a refresh token
    prompt: 'consent', // …every time, even if the host connected before
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params}`;
}

/** Exchanges the ?code from the consent screen for tokens. */
export async function exchangeCode({ fetch, clientId, clientSecret, redirectUri, code }) {
  return call(fetch, TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
}

/** A fresh access token (valid ~1 hour) from a host's refresh token. */
export async function refreshAccessToken({ fetch, clientId, clientSecret, refreshToken }) {
  const data = await call(fetch, TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!data?.access_token) throw new GoogleError('no access_token in refresh response', 502);
  return data.access_token;
}

/**
 * Claims from the id_token returned by the token endpoint. It came straight from Google
 * over TLS in exchange for our client secret, so its signature need not be re-checked.
 */
export function idTokenClaims(idToken) {
  if (typeof idToken !== 'string') return null;
  const payload = idToken.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

/** Busy intervals of the host's primary calendar: [{ start, end }] in ms. */
export async function busyIntervals({ fetch, accessToken, calendarId = 'primary', timeMin, timeMax }) {
  const data = await call(fetch, `${CALENDAR}/freeBusy`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      timeMin: new Date(timeMin).toISOString(),
      timeMax: new Date(timeMax).toISOString(),
      items: [{ id: calendarId }],
    }),
  });
  const cal = data?.calendars?.[calendarId];
  if (!cal || (cal.errors && cal.errors.length)) {
    throw new GoogleError(`freeBusy error: ${cal?.errors?.[0]?.reason || 'no calendar'}`, 502);
  }
  return (cal.busy || []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
}

/**
 * Creates the call on the host's calendar with a Google Meet link and invites the guest
 * (Google emails them the invitation). requestId makes a retry idempotent on Google's side.
 */
export async function createMeetEvent({ fetch, accessToken, calendarId = 'primary', event, requestId }) {
  const url = `${CALENDAR}/calendars/${encodeURIComponent(calendarId)}/events?conferenceDataVersion=1&sendUpdates=all`;
  const data = await call(fetch, url, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      ...event,
      conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    }),
  });
  const meetUrl =
    data?.hangoutLink || data?.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri || null;
  return { eventId: data?.id ?? null, meetUrl, htmlLink: data?.htmlLink ?? null };
}
