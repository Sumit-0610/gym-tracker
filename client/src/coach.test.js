import { describe, it, expect } from 'vitest';
import {
  workingVolumeKg,
  workingSetCount,
  checkSetSanity,
  describePRs,
  RPE_OPTIONS,
} from './coach';

describe('workingVolumeKg / workingSetCount', () => {
  const sets = [
    { reps: 10, weight: 60, set_type: 'normal' },
    { reps: 8, weight: 62.5, set_type: 'failure' },
    { reps: 5, weight: 200, set_type: 'warmup' },
    { reps: 12, weight: 0 },
  ];
  it('leaves warm-ups out of volume', () => {
    expect(workingVolumeKg(sets)).toBe(10 * 60 + 8 * 62.5);
  });
  it('leaves warm-ups out of the set count', () => {
    expect(workingSetCount(sets)).toBe(3);
  });
  it('handles an empty workout', () => {
    expect(workingVolumeKg([])).toBe(0);
    expect(workingSetCount([])).toBe(0);
  });
});

describe('checkSetSanity', () => {
  const last = [
    { reps: 10, weight: 60, set_type: 'normal' },
    { reps: 5, weight: 100, set_type: 'warmup' }, // ignored: warm-up
  ];
  it('accepts a normal set', () => {
    expect(
      checkSetSanity({ reps: 10, weightKg: 62.5, previousSets: last }),
    ).toBeNull();
  });
  it('accepts a first-ever set (no history to compare with)', () => {
    expect(checkSetSanity({ reps: 8, weightKg: 400 })).toBeNull();
  });
  it('flags absurd reps and absurd weight', () => {
    expect(checkSetSanity({ reps: 101, weightKg: 20 })).toMatch(/reps/);
    expect(checkSetSanity({ reps: 5, weightKg: 501 })).toMatch(/very heavy/);
  });
  it('flags a weight more than 3x last time (a classic extra zero)', () => {
    expect(
      checkSetSanity({ reps: 10, weightKg: 600 / 10, previousSets: last }),
    ).toBeNull(); // exactly 1x
    const msg = checkSetSanity({
      reps: 10,
      weightKg: 180.5,
      previousSets: last,
    });
    expect(msg).toMatch(/more than 3×/);
    expect(msg).toMatch(/60 kg/);
  });
  it('flags a weight far below last time (a missing digit)', () => {
    expect(
      checkSetSanity({ reps: 10, weightKg: 6, previousSets: last }),
    ).toMatch(/far below/);
  });
  it('does not compare against warm-ups or bodyweight', () => {
    // last top working weight is 60 (not the 100 warm-up)
    expect(
      checkSetSanity({ reps: 10, weightKg: 24, previousSets: last }),
    ).toBeNull();
    expect(
      checkSetSanity({ reps: 10, weightKg: 0, previousSets: last }),
    ).toBeNull();
  });
  it('lets a light warm-up through', () => {
    expect(
      checkSetSanity({
        reps: 10,
        weightKg: 6,
        previousSets: last,
        setType: 'warmup',
      }),
    ).toBeNull();
  });
  it('speaks in the user unit', () => {
    expect(
      checkSetSanity({
        reps: 10,
        weightKg: 6,
        previousSets: last,
        unit: 'lb',
      }),
    ).toMatch(/lb/);
  });
});

describe('describePRs', () => {
  it('leads with the most meaningful record per exercise', () => {
    const lines = describePRs(
      [
        {
          exercise_id: 1,
          exercise_name: 'Bench Press',
          e1rm: { previous: 90, current: 92.5 },
          weight: { previous: 80, current: 82.5 },
          volume: null,
        },
        {
          exercise_id: 2,
          exercise_name: 'Squat',
          e1rm: null,
          weight: { previous: 100, current: 105 },
          volume: null,
        },
        {
          exercise_id: 3,
          exercise_name: 'Row',
          e1rm: null,
          weight: null,
          volume: { previous: 400, current: 450 },
        },
      ],
      'kg',
    );
    expect(lines[0]).toBe('Bench Press — est. 1RM 92.5 kg (was 90 kg)');
    expect(lines[1]).toMatch(/Squat — heaviest set 105 kg \(was 100 kg\)/);
    expect(lines[2]).toMatch(/Row — best set volume up from 400 kg to 450 kg/);
  });
  it('converts for lb users and handles empty input', () => {
    const [line] = describePRs(
      [
        {
          exercise_id: 1,
          exercise_name: 'Bench Press',
          e1rm: { previous: 100, current: 102.5 },
          weight: null,
          volume: null,
        },
      ],
      'lb',
    );
    expect(line).toMatch(/lb/);
    expect(describePRs([], 'kg')).toEqual([]);
  });
});

describe('RPE_OPTIONS', () => {
  it('runs 6 to 10 in half steps', () => {
    expect(RPE_OPTIONS[0]).toBe(6);
    expect(RPE_OPTIONS.at(-1)).toBe(10);
    expect(RPE_OPTIONS.length).toBe(9);
  });
});
