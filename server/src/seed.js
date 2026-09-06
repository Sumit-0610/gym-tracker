// Seeds the shared exercise library on first boot only.
// If the exercises table already has rows, this is a no-op — so it's safe
// to call on every server start.

const EXERCISES = [
  ['Barbell Bench Press', 'Chest'],
  ['Incline Dumbbell Press', 'Chest'],
  ['Push-Up', 'Chest'],
  ['Barbell Back Squat', 'Quads'],
  ['Leg Press', 'Quads'],
  ['Leg Extension', 'Quads'],
  ['Romanian Deadlift', 'Hamstrings'],
  ['Lying Leg Curl', 'Hamstrings'],
  ['Conventional Deadlift', 'Back'],
  ['Barbell Row', 'Back'],
  ['Lat Pulldown', 'Back'],
  ['Pull-Up', 'Back'],
  ['Seated Cable Row', 'Back'],
  ['Overhead Press', 'Shoulders'],
  ['Lateral Raise', 'Shoulders'],
  ['Barbell Curl', 'Biceps'],
  ['Dumbbell Curl', 'Biceps'],
  ['Triceps Pushdown', 'Triceps'],
  ['Standing Calf Raise', 'Calves'],
  ['Hip Thrust', 'Glutes'],
  ['Plank', 'Core'],
];

module.exports = async function seed(db) {
  const res = await db.execute('SELECT COUNT(*) AS count FROM exercises');
  if (res.rows[0].count > 0) return;

  // db.batch sends every INSERT in a single round trip and wraps them in one
  // transaction ('write' = all-or-nothing) — quicker and safer than 21
  // separate calls to a remote database on first boot.
  await db.batch(
    EXERCISES.map(([name, muscle_group]) => ({
      sql: 'INSERT INTO exercises (name, muscle_group) VALUES (?, ?)',
      args: [name, muscle_group],
    })),
    'write'
  );
  console.log(`Seeded ${EXERCISES.length} exercises`);
};
