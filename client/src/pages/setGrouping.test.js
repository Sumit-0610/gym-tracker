import { describe, it, expect } from 'vitest';
import { groupByExercise } from './setGrouping';

const set = (id, exId, name) => ({
  id,
  exercise_id: exId,
  exercise_name: name,
  muscle_group: 'X',
  reps: 10,
  weight: 60,
});

describe('groupByExercise', () => {
  it('empty -> empty', () => {
    expect(groupByExercise([])).toEqual([]);
  });

  it('groups consecutive and interleaved sets by exercise_id', () => {
    const sets = [
      set(1, 5, 'Bench'),
      set(2, 5, 'Bench'),
      set(3, 9, 'OHP'),
      set(4, 5, 'Bench'), // back to bench after OHP
    ];
    const groups = groupByExercise(sets);
    expect(groups.map((g) => g.exercise_id)).toEqual([5, 9]);
    expect(groups[0].rows.map((r) => r.id)).toEqual([1, 2, 4]);
    expect(groups[1].rows.map((r) => r.id)).toEqual([3]);
  });

  it('keeps first-seen order, carries name + muscle_group', () => {
    const groups = groupByExercise([set(1, 9, 'OHP'), set(2, 5, 'Bench')]);
    expect(groups.map((g) => g.name)).toEqual(['OHP', 'Bench']);
    expect(groups[0].muscle_group).toBe('X');
  });

  it('does not mutate the input rows', () => {
    const sets = [set(1, 5, 'Bench')];
    const snapshot = JSON.stringify(sets);
    groupByExercise(sets);
    expect(JSON.stringify(sets)).toBe(snapshot);
  });
});
