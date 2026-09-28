// Booking slots for "Talk to a human". Pure functions: no I/O, no clock of their own.
//
// A slot is a call start time. Calls happen inside working hours in one time zone
// (Europe/London by default), on a fixed grid (every 30 min for a 20-min call plus a
// 10-min gap). A slot is offered when at least one host is free for the call plus the
// gap on either side; the booking goes to the free host with the fewest upcoming calls.

export const DEFAULT_SCHEDULE = Object.freeze({
  timeZone: 'Europe/London',
  days: [1, 2, 3, 4, 5], // ISO weekdays, Monday = 1
  startMinute: 10 * 60, // first call starts at 10:00
  endMinute: 17 * 60, // last call ends by 17:00
  durationMinutes: 20,
  bufferMinutes: 10, // free time kept before and after each call
  minNoticeMinutes: 4 * 60, // earliest bookable start is 4 hours from now
  horizonDays: 14, // calendar days ahead that are searched
  maxDays: 10, // at most this many days with free slots are offered
});

const MINUTE = 60_000;

/** Offset of `timeZone` from UTC at instant `ms`, in minutes (London in summer: +60). */
export function zoneOffsetMinutes(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(ms));
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / MINUTE);
}

/** The UTC instant of a wall-clock time in `timeZone` (DST-correct). */
export function zonedTimeToUtc({ year, month, day, minuteOfDay }, timeZone) {
  const guess = Date.UTC(year, month - 1, day, 0, minuteOfDay);
  let ms = guess - zoneOffsetMinutes(guess, timeZone) * MINUTE;
  // One correction step settles instants near a DST change.
  ms = guess - zoneOffsetMinutes(ms, timeZone) * MINUTE;
  return ms;
}

/** Calendar date (y, m, d) and ISO weekday of instant `ms` in `timeZone`. */
export function zonedDate(ms, timeZone) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date(ms));
  const get = (type) => parts.find((p) => p.type === type).value;
  const weekday = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[get('weekday')];
  return { year: Number(get('year')), month: Number(get('month')), day: Number(get('day')), weekday };
}

const isoDate = ({ year, month, day }) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

/**
 * Every grid start time in the search window, grouped by local date:
 * [{ date: '2026-09-29', starts: [ms, …] }]. Busy calendars are not considered here.
 */
export function candidateStarts(now, schedule = DEFAULT_SCHEDULE) {
  const { timeZone, days, startMinute, endMinute, durationMinutes, bufferMinutes, minNoticeMinutes, horizonDays } =
    schedule;
  const step = durationMinutes + bufferMinutes;
  const earliest = now + minNoticeMinutes * MINUTE;
  const out = [];
  // Walk local calendar days from today; noon avoids DST edge cases when stepping days.
  const today = zonedDate(now, timeZone);
  for (let i = 0; i < horizonDays; i++) {
    const noon = zonedTimeToUtc({ ...today, minuteOfDay: 12 * 60 }, timeZone) + i * 24 * 60 * MINUTE;
    const date = zonedDate(noon, timeZone);
    if (!days.includes(date.weekday)) continue;
    const starts = [];
    for (let m = startMinute; m + durationMinutes <= endMinute; m += step) {
      const start = zonedTimeToUtc({ ...date, minuteOfDay: m }, timeZone);
      if (start >= earliest) starts.push(start);
    }
    if (starts.length) out.push({ date: isoDate(date), starts });
  }
  return out;
}

/** True when [start, end) overlaps any busy interval ({ start, end } in ms). */
function overlaps(start, end, busy) {
  return busy.some((b) => b.start < end && b.end > start);
}

/** Hosts free for a call starting at `start` (the gap on both sides included). */
export function freeHosts(start, busyByHost, schedule = DEFAULT_SCHEDULE) {
  const from = start - schedule.bufferMinutes * MINUTE;
  const to = start + (schedule.durationMinutes + schedule.bufferMinutes) * MINUTE;
  return Object.keys(busyByHost).filter((host) => !overlaps(from, to, busyByHost[host]));
}

/**
 * Slots to offer: [{ date, slots: [isoString, …] }], at most schedule.maxDays days.
 * @param {number} now ms epoch
 * @param {Record<string, {start:number,end:number}[]>} busyByHost one entry per connected host
 */
export function availableSlots(now, busyByHost, schedule = DEFAULT_SCHEDULE) {
  if (!Object.keys(busyByHost).length) return [];
  const days = [];
  for (const { date, starts } of candidateStarts(now, schedule)) {
    const slots = starts.filter((s) => freeHosts(s, busyByHost, schedule).length > 0);
    if (slots.length) days.push({ date, slots: slots.map((s) => new Date(s).toISOString()) });
    if (days.length >= schedule.maxDays) break;
  }
  return days;
}

/**
 * Is `startIso` a slot this schedule could ever offer at `now` (on the grid, in hours,
 * not too soon, not too far)? Guards the booking endpoint against arbitrary times.
 */
export function isBookableStart(startIso, now, schedule = DEFAULT_SCHEDULE) {
  const start = Date.parse(startIso);
  if (!Number.isFinite(start)) return false;
  return candidateStarts(now, schedule).some((d) => d.starts.includes(start));
}

/** Round robin: the free host with the fewest upcoming calls (ties: alphabetical). */
export function pickHost(free, upcomingCounts = {}) {
  return [...free].sort((a, b) => (upcomingCounts[a] ?? 0) - (upcomingCounts[b] ?? 0) || a.localeCompare(b))[0] ?? null;
}

/** Reads optional TALK_* overrides from the environment; bad values keep the default. */
export function scheduleFromEnv(env = {}) {
  const int = (name, min, max, fallback) => {
    const raw = String(env[name] ?? '').trim();
    if (!/^\d+$/.test(raw)) return fallback;
    const n = Number(raw);
    return n >= min && n <= max ? n : fallback;
  };
  const time = (name, fallback) => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(env[name] ?? '').trim());
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return fallback;
    return Number(m[1]) * 60 + Number(m[2]);
  };
  const d = DEFAULT_SCHEDULE;
  let timeZone = String(env.TALK_TIMEZONE ?? '').trim() || d.timeZone;
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone });
  } catch {
    timeZone = d.timeZone;
  }
  const schedule = {
    ...d,
    timeZone,
    startMinute: time('TALK_DAY_START', d.startMinute),
    endMinute: time('TALK_DAY_END', d.endMinute),
    durationMinutes: int('TALK_CALL_MINUTES', 10, 120, d.durationMinutes),
    bufferMinutes: int('TALK_BUFFER_MINUTES', 0, 60, d.bufferMinutes),
    minNoticeMinutes: int('TALK_MIN_NOTICE_MINUTES', 0, 14 * 24 * 60, d.minNoticeMinutes),
    horizonDays: int('TALK_HORIZON_DAYS', 1, 60, d.horizonDays),
  };
  if (schedule.endMinute <= schedule.startMinute) {
    schedule.startMinute = d.startMinute;
    schedule.endMinute = d.endMinute;
  }
  return Object.freeze(schedule);
}
