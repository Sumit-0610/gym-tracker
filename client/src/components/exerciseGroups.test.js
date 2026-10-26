import { describe, it, expect } from 'vitest';
import { groupExercises } from './exerciseGroups';

const lib = [
  { id: 1, name: 'Barbell Row', muscle_group: 'Back' },
  { id: 2, name: 'Bench Press', muscle_group: 'Chest' },
  { id: 3, name: 'Bent-Over Dumbbell Row', muscle_group: 'Back' },
  { id: 4, name: 'Mystery Move', muscle_group: null },
];

describe('groupExercises', () => {
  it('groups by muscle, A to Z, with no search', () => {
    const groups = groupExercises(lib);
    expect(groups.map(([m]) => m)).toEqual(['Back', 'Chest', 'Other']);
    expect(groups[0][1].map((e) => e.id)).toEqual([1, 3]);
  });

  it('matches each word on its own, ignoring case', () => {
    const groups = groupExercises(lib, '  ROW dumbbell ');
    expect(groups).toEqual([['Back', [lib[2]]]]);
  });

  it('matches the muscle name too', () => {
    const groups = groupExercises(lib, 'chest');
    expect(groups).toEqual([['Chest', [lib[1]]]]);
  });

  it('returns no groups when nothing matches', () => {
    expect(groupExercises(lib, 'squat')).toEqual([]);
  });
});
