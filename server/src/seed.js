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

module.exports = function seed(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM exercises').get();
  if (count > 0) return;

  const insert = db.prepare(
    'INSERT INTO exercises (name, muscle_group) VALUES (?, ?)'
  );
  for (const [name, muscleGroup] of EXERCISES) {
    insert.run(name, muscleGroup);
  }
  console.log(`Seeded ${EXERCISES.length} exercises`);
};
