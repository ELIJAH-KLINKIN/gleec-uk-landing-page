import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_SCHEDULE,
  availableSlots,
  candidateStarts,
  freeHosts,
  isBookableStart,
  pickHost,
  scheduleFromEnv,
  zonedTimeToUtc,
} from '../lib/schedule.js';

const MON_1300_LONDON = Date.parse('2026-09-28T12:00:00Z'); // BST (UTC+1)
const iso = (s) => new Date(s).toISOString();

describe('schedule: time zones', () => {
  it('converts London wall-clock time to UTC in summer and winter', () => {
    assert.equal(iso(zonedTimeToUtc({ year: 2026, month: 9, day: 29, minuteOfDay: 600 }, 'Europe/London')), '2026-09-29T09:00:00.000Z');
    assert.equal(iso(zonedTimeToUtc({ year: 2026, month: 10, day: 26, minuteOfDay: 600 }, 'Europe/London')), '2026-10-26T10:00:00.000Z');
  });

  it('keeps 10:00 London across the clocks going back (25 Oct 2026)', () => {
    const fri = Date.parse('2026-10-23T08:00:00Z');
    const days = candidateStarts(fri, { ...DEFAULT_SCHEDULE, minNoticeMinutes: 0 });
    const byDate = Object.fromEntries(days.map((d) => [d.date, d.starts]));
    assert.equal(iso(byDate['2026-10-23'][0]), '2026-10-23T09:00:00.000Z'); // BST
    assert.equal(iso(byDate['2026-10-26'][0]), '2026-10-26T10:00:00.000Z'); // GMT
  });
});

describe('schedule: candidate starts', () => {
  it('offers working days only, on a 30-minute grid from 10:00, last call ending by 17:00', () => {
    const days = candidateStarts(MON_1300_LONDON);
    assert.equal(days[0].date, '2026-09-29'); // Monday afternoon is inside the 4-hour notice
    assert.ok(days.every((d) => ![0, 6].includes(new Date(`${d.date}T12:00:00Z`).getUTCDay())));
    const tue = days[0].starts.map(iso);
    assert.equal(tue[0], '2026-09-29T09:00:00.000Z');
    assert.equal(tue.at(-1), '2026-09-29T15:30:00.000Z');
    assert.equal(tue.length, 14);
  });

  it('respects the minimum notice on the same day', () => {
    const monMorning = Date.parse('2026-09-28T07:00:00Z'); // 08:00 London
    const days = candidateStarts(monMorning);
    assert.equal(days[0].date, '2026-09-28');
    assert.equal(iso(days[0].starts[0]), '2026-09-28T11:00:00.000Z'); // 12:00 London = 08:00 + 4h
  });
});

describe('schedule: availability and hosts', () => {
  const busy = {
    'ilia@x.com': [{ start: Date.parse('2026-09-29T09:00:00Z'), end: Date.parse('2026-09-29T12:00:00Z') }],
    'andrey@x.com': [{ start: Date.parse('2026-09-29T09:00:00Z'), end: Date.parse('2026-09-29T09:20:00Z') }],
  };

  it('offers a slot when at least one host is free, keeping the gap around calls', () => {
    const tue = availableSlots(MON_1300_LONDON, busy)[0];
    assert.equal(tue.date, '2026-09-29');
    assert.equal(tue.slots[0], '2026-09-29T09:30:00.000Z'); // 09:00 taken by both; 09:30 Andrey is free again
    assert.deepEqual(freeHosts(Date.parse('2026-09-29T09:30:00Z'), busy), ['andrey@x.com']);
  });

  it('treats a call ending within the buffer as a clash', () => {
    const b = { 'a@x.com': [{ start: Date.parse('2026-09-29T09:00:00Z'), end: Date.parse('2026-09-29T09:25:00Z') }] };
    assert.deepEqual(freeHosts(Date.parse('2026-09-29T09:30:00Z'), b), []);
  });

  it('offers nothing without connected hosts', () => {
    assert.deepEqual(availableSlots(MON_1300_LONDON, {}), []);
  });

  it('round robin picks the free host with the fewest upcoming calls', () => {
    assert.equal(pickHost(['ilia@x.com', 'andrey@x.com'], { 'andrey@x.com': 2, 'ilia@x.com': 1 }), 'ilia@x.com');
    assert.equal(pickHost(['ilia@x.com', 'andrey@x.com'], {}), 'andrey@x.com');
    assert.equal(pickHost([], {}), null);
  });

  it('only accepts start times on the offered grid', () => {
    assert.equal(isBookableStart('2026-09-29T09:00:00.000Z', MON_1300_LONDON), true);
    assert.equal(isBookableStart('2026-09-29T09:10:00.000Z', MON_1300_LONDON), false);
    assert.equal(isBookableStart('2026-09-28T13:00:00.000Z', MON_1300_LONDON), false); // too soon
    assert.equal(isBookableStart('not a date', MON_1300_LONDON), false);
  });
});

describe('schedule: environment overrides', () => {
  it('reads valid TALK_* values and ignores bad ones', () => {
    const s = scheduleFromEnv({ TALK_DAY_START: '09:30', TALK_CALL_MINUTES: '30', TALK_TIMEZONE: 'Mars/Base', TALK_BUFFER_MINUTES: 'x' });
    assert.equal(s.startMinute, 570);
    assert.equal(s.durationMinutes, 30);
    assert.equal(s.timeZone, 'Europe/London');
    assert.equal(s.bufferMinutes, DEFAULT_SCHEDULE.bufferMinutes);
  });
});
