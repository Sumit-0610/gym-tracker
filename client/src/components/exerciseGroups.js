// Pure helper for the exercise picker: filter the library by a search term,
// then group what's left by muscle (A→Z), keeping each group's order.
// Kept out of the component so it can be unit tested.
//
// The search matches the exercise name or its muscle, ignoring case. Each word
// is matched on its own, so "row dumbbell" still finds "Bent-Over Dumbbell Row".
export function groupExercises(exercises, query = '') {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const byMuscle = new Map();
  for (const e of exercises) {
    const muscle = e.muscle_group || 'Other';
    const haystack = `${e.name} ${muscle}`.toLowerCase();
    if (!words.every((w) => haystack.includes(w))) continue;
    if (!byMuscle.has(muscle)) byMuscle.set(muscle, []);
    byMuscle.get(muscle).push(e);
  }
  return [...byMuscle.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
