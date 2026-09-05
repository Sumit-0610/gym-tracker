import { useMemo } from 'react';
import Select from './Select';

// A <Select> over the exercise library, grouped into <optgroup>s by muscle.
// Shared by the routine builder (11c) and workout set logging (11d).
//
// `exercises` is the raw GET /api/exercises array. `value` is the selected id
// as a string (""=nothing). `onChange` gets the native change event.
export default function ExerciseSelect({
  exercises,
  value,
  onChange,
  label = 'Exercise',
}) {
  const groups = useMemo(() => {
    const byMuscle = new Map();
    for (const e of exercises) {
      const key = e.muscle_group || 'Other';
      if (!byMuscle.has(key)) byMuscle.set(key, []);
      byMuscle.get(key).push(e);
    }
    return [...byMuscle.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [exercises]);

  return (
    <Select label={label} value={value} onChange={onChange}>
      <option value="">Select an exercise…</option>
      {groups.map(([muscle, list]) => (
        <optgroup key={muscle} label={muscle}>
          {list.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
