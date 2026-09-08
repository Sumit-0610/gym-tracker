// Seeds the shared exercise library.
//
// Runs on every boot: it inserts any exercise from the list below that isn't
// already in the table (matched by name), so adding to the list here and
// redeploying tops up an existing database without disturbing user data.

const EXERCISES = [
  // Chest
  ['Barbell Bench Press', 'Chest'],
  ['Incline Barbell Bench Press', 'Chest'],
  ['Incline Dumbbell Press', 'Chest'],
  ['Flat Dumbbell Press', 'Chest'],
  ['Dumbbell Fly', 'Chest'],
  ['Cable Fly', 'Chest'],
  ['Machine Chest Press', 'Chest'],
  ['Push-Up', 'Chest'],
  ['Dip', 'Chest'],

  // Back
  ['Conventional Deadlift', 'Back'],
  ['Barbell Row', 'Back'],
  ['Pendlay Row', 'Back'],
  ['Dumbbell Row', 'Back'],
  ['Lat Pulldown', 'Back'],
  ['Pull-Up', 'Back'],
  ['Chin-Up', 'Back'],
  ['Seated Cable Row', 'Back'],
  ['T-Bar Row', 'Back'],
  ['Straight-Arm Pulldown', 'Back'],
  ['Face Pull', 'Back'],
  ['Back Extension', 'Back'],

  // Shoulders
  ['Overhead Press', 'Shoulders'],
  ['Seated Dumbbell Shoulder Press', 'Shoulders'],
  ['Arnold Press', 'Shoulders'],
  ['Lateral Raise', 'Shoulders'],
  ['Cable Lateral Raise', 'Shoulders'],
  ['Rear Delt Fly', 'Shoulders'],
  ['Front Raise', 'Shoulders'],
  ['Upright Row', 'Shoulders'],
  ['Barbell Shrug', 'Shoulders'],

  // Quads
  ['Barbell Back Squat', 'Quads'],
  ['Front Squat', 'Quads'],
  ['Hack Squat', 'Quads'],
  ['Leg Press', 'Quads'],
  ['Leg Extension', 'Quads'],
  ['Bulgarian Split Squat', 'Quads'],
  ['Walking Lunge', 'Quads'],
  ['Goblet Squat', 'Quads'],

  // Hamstrings
  ['Romanian Deadlift', 'Hamstrings'],
  ['Stiff-Leg Deadlift', 'Hamstrings'],
  ['Lying Leg Curl', 'Hamstrings'],
  ['Seated Leg Curl', 'Hamstrings'],
  ['Good Morning', 'Hamstrings'],

  // Glutes
  ['Hip Thrust', 'Glutes'],
  ['Glute Bridge', 'Glutes'],
  ['Cable Kickback', 'Glutes'],
  ['Sumo Deadlift', 'Glutes'],

  // Biceps
  ['Barbell Curl', 'Biceps'],
  ['Dumbbell Curl', 'Biceps'],
  ['Hammer Curl', 'Biceps'],
  ['Preacher Curl', 'Biceps'],
  ['Incline Dumbbell Curl', 'Biceps'],
  ['Cable Curl', 'Biceps'],

  // Triceps
  ['Triceps Pushdown', 'Triceps'],
  ['Overhead Triceps Extension', 'Triceps'],
  ['Skull Crusher', 'Triceps'],
  ['Close-Grip Bench Press', 'Triceps'],
  ['Triceps Dip', 'Triceps'],

  // Calves
  ['Standing Calf Raise', 'Calves'],
  ['Seated Calf Raise', 'Calves'],
  ['Leg Press Calf Raise', 'Calves'],

  // Core
  ['Plank', 'Core'],
  ['Hanging Leg Raise', 'Core'],
  ['Cable Crunch', 'Core'],
  ['Russian Twist', 'Core'],
  ['Ab Wheel Rollout', 'Core'],

  // Forearms
  ['Wrist Curl', 'Forearms'],
  ['Reverse Curl', 'Forearms'],
];

module.exports = async function seed(db) {
  const existing = await db.execute('SELECT name FROM exercises');
  const have = new Set(existing.rows.map((r) => r.name));

  const missing = EXERCISES.filter(([name]) => !have.has(name));
  if (missing.length === 0) return;

  // One transaction: all the new rows land together or not at all.
  await db.batch(
    missing.map(([name, muscle_group]) => ({
      sql: 'INSERT INTO exercises (name, muscle_group) VALUES (?, ?)',
      args: [name, muscle_group],
    })),
    'write'
  );
  console.log(`Seeded ${missing.length} exercise(s)`);
};
