import { describe, it, expect } from 'vitest';
import { addDays, presetRange } from './exportRange';

describe('export range presets', () => {
  it('addDays crosses month and year boundaries', () => {
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
  });

  it('30 and 90 days include today', () => {
    expect(presetRange('30d', '2026-10-14')).toEqual({
      from: '2026-09-15',
      to: '2026-10-14',
    });
    expect(presetRange('90d', '2026-10-14').from).toBe('2026-07-17');
  });

  it('this year starts on 1 January', () => {
    expect(presetRange('year', '2026-10-14')).toEqual({
      from: '2026-01-01',
      to: '2026-10-14',
    });
  });

  it('all time starts the day before the account was created', () => {
    expect(presetRange('all', '2026-10-14', '2026-05-02 08:15:00')).toEqual({
      from: '2026-05-01',
      to: '2026-10-14',
    });
    expect(presetRange('all', '2026-10-14').from).toBe('2000-01-01');
    // never starts after today
    expect(presetRange('all', '2026-10-14', '2026-10-15 00:00:00').from).toBe(
      '2026-10-14',
    );
  });
});
