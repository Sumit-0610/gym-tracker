import { describe, it, expect } from 'vitest';
import {
  formatWeight,
  toKg,
  fromKg,
  formatVolume,
  formatDuration,
  formatDay,
  setTypeLabel,
  describeError,
  todayLocal,
} from './format';

describe('weight conversion', () => {
  it('toKg — passes kg through, converts lb', () => {
    expect(toKg(60, 'kg')).toBe(60);
    expect(toKg('60', 'kg')).toBe(60);
    expect(toKg(135, 'lb')).toBeCloseTo(61.235, 3);
  });

  it('fromKg — passes kg through, converts lb, rounds to 1dp', () => {
    expect(fromKg(60, 'kg')).toBe(60);
    expect(fromKg(61.234969, 'lb')).toBe(135);
    expect(fromKg(62.5, 'kg')).toBe(62.5);
  });

  it('round-trips a lb entry losslessly to the eye', () => {
    const kg = toKg(135, 'lb');
    expect(fromKg(kg, 'lb')).toBe(135);
    expect(formatWeight(kg, 'lb')).toBe('135 lb');
  });

  it('formatWeight — unit suffix, 1dp, bodyweight for 0', () => {
    expect(formatWeight(0, 'kg')).toBe('bodyweight');
    expect(formatWeight(0, 'lb')).toBe('bodyweight');
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg');
    expect(formatWeight(60, 'lb')).toBe('132.3 lb');
  });
});

describe('formatVolume', () => {
  it('rounds to a whole number and groups thousands', () => {
    expect(formatVolume(7380, 'kg')).toBe('7,380 kg');
    expect(formatVolume(999, 'kg')).toBe('999 kg');
    expect(formatVolume(1234.6, 'kg')).toBe('1,235 kg');
  });
  it('converts for lb', () => {
    // 7380 kg -> ~16270 lb
    expect(formatVolume(7380, 'lb')).toBe('16,270 lb');
  });
});

describe('formatDuration', () => {
  it('m:ss', () => {
    expect(formatDuration(0)).toBe('0:00');
    expect(formatDuration(9)).toBe('0:09');
    expect(formatDuration(90)).toBe('1:30');
    expect(formatDuration(600)).toBe('10:00');
  });
});

describe('formatDay', () => {
  it('renders the right day with no time component (locale-independent checks)', () => {
    // The exact wording follows the runtime locale; assert the parts, not the
    // format. UTC-pinned so a timestamp on the same date still reads that date.
    for (const input of [
      '2026-09-08',
      '2026-09-08 05:30:00',
      '2026-09-08 23:59:00',
    ]) {
      const out = formatDay(input);
      expect(out).toMatch(/2026/);
      expect(out).toMatch(/\b8\b/);
      expect(out).not.toMatch(/:/); // no time
      expect(out.toLowerCase()).toMatch(/sep/);
    }
  });
  it('empty / bad input', () => {
    expect(formatDay('')).toBe('');
    expect(formatDay(null)).toBe('');
    expect(formatDay('not-a-date')).toBe('not-a-date');
  });
});

describe('todayLocal', () => {
  it('is an ISO date string', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('setTypeLabel', () => {
  it('maps non-normal types, blank for normal/unknown', () => {
    expect(setTypeLabel('warmup')).toBe('Warm-up');
    expect(setTypeLabel('dropset')).toBe('Drop set');
    expect(setTypeLabel('failure')).toBe('To failure');
    expect(setTypeLabel('normal')).toBe('');
    expect(setTypeLabel(undefined)).toBe('');
  });
});

describe('describeError', () => {
  it('maps known statuses', () => {
    expect(describeError({ status: 0 })).toMatch(/reach the server/i);
    expect(describeError({ status: 401 })).toMatch(/session/i);
    expect(describeError({ status: 404 })).toMatch(/no longer exists/i);
    expect(describeError({ status: 429 })).toMatch(/too many/i);
    expect(describeError({ status: 500 })).toMatch(/went wrong/i);
  });
  it('prefers the server message for 400/409', () => {
    expect(describeError({ status: 400, message: 'bad name' })).toBe(
      'bad name',
    );
    expect(describeError({ status: 409, message: 'taken' })).toBe('taken');
  });
  it('falls back for unknown / missing', () => {
    expect(describeError(null)).toMatch(/unexpected/i);
    expect(describeError({ status: 418, message: 'teapot' })).toBe('teapot');
  });
});
