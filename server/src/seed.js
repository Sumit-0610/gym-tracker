// Seeds the shared exercise library.
//
// Runs on every boot: it inserts any exercise from the list below that isn't
// already in the table (matched by name), and brings each existing row's
// muscle group, picture and video up to date. So adding to (or editing) the
// list here and redeploying tops up an existing database without disturbing
// user data — sets and routines point at exercise ids, which never change.
//
// Each entry is [name, muscle group, image, YouTube video id]:
//   image  = file name (without .webp) in client/public/exercise-images/, or
//            null when there is no picture. Each file shows the start and end
//            position side by side. The photos come from the public-domain
//            Free Exercise DB (see client/public/exercise-images/CREDITS.md).
//   video  = id of a YouTube form tutorial. The app only links to it; nothing
//            is embedded or downloaded.
//
// "Full Body" lifts have no weekly volume target (see analytics.LANDMARKS), so
// they are logged and charted like any other lift but left out of the
// per-muscle volume card.

/** @type {[string, string, string | null, string][]} */
const EXERCISES = [
  // Chest
  ['Barbell Bench Press', 'Chest', 'barbell-bench-press', 'rT7DgCr-3pg'],
  [
    'Incline Barbell Bench Press',
    'Chest',
    'incline-barbell-bench-press',
    '2jFFCy8JBU8',
  ],
  ['Incline Dumbbell Press', 'Chest', 'incline-dumbbell-press', 'oZVCBM9f8Eo'],
  ['Flat Dumbbell Press', 'Chest', 'flat-dumbbell-press', 'M0tN99QgPyU'],
  ['Dumbbell Fly', 'Chest', 'dumbbell-fly', 'Nhvz9EzdJ4U'],
  ['Cable Fly', 'Chest', 'cable-fly', 'QcTcWpkn_bw'],
  ['Machine Chest Press', 'Chest', 'machine-chest-press', 'zgP-UCKGe24'],
  ['Push-Up', 'Chest', 'push-up', 'zF0jbubK_jU'],
  ['Dip', 'Chest', 'dip', 'yN6Q1UI_xkE'],
  [
    'Decline Barbell Bench Press',
    'Chest',
    'decline-barbell-bench-press',
    'ep9K_4nYnvw',
  ],
  ['Decline Dumbbell Press', 'Chest', 'decline-dumbbell-press', '0xRvl4Qv3ZY'],
  ['Incline Dumbbell Fly', 'Chest', 'incline-dumbbell-fly', 'JSDpq14vCZ8'],
  ['Pec Deck', 'Chest', 'pec-deck', '-DZXcuPi4vk'],
  [
    'Smith Machine Bench Press',
    'Chest',
    'smith-machine-bench-press',
    '7FyJdsXeta8',
  ],
  ['Incline Push-Up', 'Chest', 'incline-push-up', '0JUrOH--Kdk'],
  ['Decline Push-Up', 'Chest', 'decline-push-up', 'SKPab2YC8BE'],
  ['Dumbbell Pullover', 'Chest', 'dumbbell-pullover', 'tcHaHIQStsk'],

  // Back
  ['Conventional Deadlift', 'Back', 'conventional-deadlift', 'Ymr0AIcnaJ8'],
  ['Barbell Row', 'Back', 'barbell-row', 'ZtTwgJTBjOQ'],
  ['Pendlay Row', 'Back', null, 'C_p-s66KBpg'],
  ['Dumbbell Row', 'Back', 'dumbbell-row', 'ZRSGpBUVcNw'],
  ['Lat Pulldown', 'Back', 'lat-pulldown', 'CAwf7n6Luuc'],
  ['Pull-Up', 'Back', 'pull-up', 'sIvJTfGxdFo'],
  ['Chin-Up', 'Back', 'chin-up', 'T78xCiw_R6g'],
  ['Seated Cable Row', 'Back', 'seated-cable-row', 'f_r95UajQcg'],
  ['T-Bar Row', 'Back', 't-bar-row', '5foJiIVhs8Q'],
  ['Straight-Arm Pulldown', 'Back', 'straight-arm-pulldown', 'lJsiuRq7Bts'],
  ['Face Pull', 'Back', 'face-pull', 'eTCBSFlCJ_s'],
  ['Back Extension', 'Back', 'back-extension', 'JzovzOGudfc'],
  ['Rack Pull', 'Back', 'rack-pull', 'Y99s0dNWpUw'],
  ['Deficit Deadlift', 'Back', 'deficit-deadlift', 'hnuPZZfeRzs'],
  ['Inverted Row', 'Back', 'inverted-row', '0AsxBmXeOIo'],
  [
    'Chest-Supported Dumbbell Row',
    'Back',
    'chest-supported-dumbbell-row',
    'ro2vfHfD0DQ',
  ],
  ['Bent-Over Dumbbell Row', 'Back', 'bent-over-dumbbell-row', '6gvmcqr226U'],
  [
    'Reverse-Grip Barbell Row',
    'Back',
    'reverse-grip-barbell-row',
    'tyHegMDIEbQ',
  ],
  ['Close-Grip Lat Pulldown', 'Back', 'close-grip-lat-pulldown', 'IjoFCmLX7z0'],
  ['Single-Arm Lat Pulldown', 'Back', 'single-arm-lat-pulldown', 'eM162KNncD8'],
  ['Machine High Row', 'Back', 'machine-high-row', 'beKbbq6NhWY'],

  // Shoulders
  ['Overhead Press', 'Shoulders', 'overhead-press', 'nNMR9fRGRjQ'],
  [
    'Seated Dumbbell Shoulder Press',
    'Shoulders',
    'seated-dumbbell-shoulder-press',
    'WKEl69bIGus',
  ],
  ['Arnold Press', 'Shoulders', 'arnold-press', 'KXNh5_ZAPR8'],
  ['Lateral Raise', 'Shoulders', 'lateral-raise', 'ssAo_xwFt5c'],
  ['Cable Lateral Raise', 'Shoulders', 'cable-lateral-raise', 'Z5FA9aq3L6A'],
  ['Rear Delt Fly', 'Shoulders', 'rear-delt-fly', 'Lec8GC1SiS8'],
  ['Front Raise', 'Shoulders', 'front-raise', 'zkP0MsTcIVU'],
  ['Upright Row', 'Shoulders', 'upright-row', 'nIJGvsdNtFE'],
  ['Barbell Shrug', 'Shoulders', 'barbell-shrug', 'X26Ji1j9LWA'],
  ['Push Press', 'Shoulders', 'push-press', 'HKx22sWywxc'],
  [
    'Seated Barbell Overhead Press',
    'Shoulders',
    'seated-barbell-overhead-press',
    '5tp6hM_IMqY',
  ],
  [
    'Machine Shoulder Press',
    'Shoulders',
    'machine-shoulder-press',
    'Anu8s_nkNpM',
  ],
  ['Reverse Pec Deck', 'Shoulders', 'reverse-pec-deck', 'e4dJ1QoxUtI'],
  ['Cable Rear Delt Fly', 'Shoulders', 'cable-rear-delt-fly', 'er15V96hG5U'],
  ['Cable Front Raise', 'Shoulders', 'cable-front-raise', 'vtH93qBItdk'],
  ['Dumbbell Shrug', 'Shoulders', 'dumbbell-shrug', 'RLHxN6hq8NA'],
  ['Handstand Push-Up', 'Shoulders', 'handstand-push-up', '7wSZnHQZChI'],

  // Quads
  ['Barbell Back Squat', 'Quads', 'barbell-back-squat', '-bJIpOq-LWk'],
  ['Front Squat', 'Quads', 'front-squat', '6PLvU0rjw18'],
  ['Hack Squat', 'Quads', 'hack-squat', '-lAnEGH2blE'],
  ['Leg Press', 'Quads', 'leg-press', 'cDGOn-yfKJA'],
  ['Leg Extension', 'Quads', 'leg-extension', 'iW83kMs0OHw'],
  ['Bulgarian Split Squat', 'Quads', 'bulgarian-split-squat', 'VPhhE6bBzZE'],
  ['Walking Lunge', 'Quads', 'walking-lunge', 'YYWhkctnP2o'],
  ['Goblet Squat', 'Quads', 'goblet-squat', 'JO7D6GJ98wY'],
  ['Smith Machine Squat', 'Quads', 'smith-machine-squat', 'iAcRGCsG_PY'],
  ['Box Squat', 'Quads', 'box-squat', 'u87j5n6ClC8'],
  ['Bodyweight Squat', 'Quads', 'bodyweight-squat', 'DlS-GAF8Edg'],
  ['Dumbbell Lunge', 'Quads', 'dumbbell-lunge', 'pT7K8D8SLk4'],
  ['Reverse Lunge', 'Quads', 'reverse-lunge', 'Ry-wqegeKlE'],
  ['Step-Up', 'Quads', 'step-up', '9ZknEYboBOQ'],
  ['Sissy Squat', 'Quads', 'sissy-squat', '30_K-UpUerk'],

  // Hamstrings
  ['Romanian Deadlift', 'Hamstrings', 'romanian-deadlift', '_oyxCn2iSjU'],
  ['Stiff-Leg Deadlift', 'Hamstrings', 'stiff-leg-deadlift', 'yYB9e6ZWGTc'],
  ['Lying Leg Curl', 'Hamstrings', 'lying-leg-curl', 'SbSNUXPRkc8'],
  ['Seated Leg Curl', 'Hamstrings', 'seated-leg-curl', 'SjqyLjxSlCY'],
  ['Good Morning', 'Hamstrings', 'good-morning', 'Nh9L4bWuOyM'],
  ['Standing Leg Curl', 'Hamstrings', 'standing-leg-curl', 'CZVTv9T_Ml8'],
  [
    'Dumbbell Romanian Deadlift',
    'Hamstrings',
    'dumbbell-romanian-deadlift',
    'hQgFixeXdZo',
  ],
  [
    'Single-Leg Romanian Deadlift',
    'Hamstrings',
    'single-leg-romanian-deadlift',
    '6pEL3KxnlEo',
  ],
  [
    'Nordic Hamstring Curl',
    'Hamstrings',
    'nordic-hamstring-curl',
    'Yn7aqLkeF0U',
  ],
  ['Glute-Ham Raise', 'Hamstrings', 'glute-ham-raise', 'RtwVVDS3vAM'],
  ['Kettlebell Swing', 'Hamstrings', 'kettlebell-swing', 'DU4HHdW0uaA'],

  // Glutes
  ['Hip Thrust', 'Glutes', 'hip-thrust', 'huIb360qhkY'],
  ['Glute Bridge', 'Glutes', 'glute-bridge', 'bcnun1NjZ1E'],
  ['Cable Kickback', 'Glutes', 'cable-kickback', 'VSgMyiOu0uE'],
  ['Sumo Deadlift', 'Glutes', 'sumo-deadlift', 'JbY72Him34Q'],
  ['Barbell Glute Bridge', 'Glutes', 'barbell-glute-bridge', 'ztzkeNhbpMg'],
  [
    'Single-Leg Glute Bridge',
    'Glutes',
    'single-leg-glute-bridge',
    '3NXv0Nany-Q',
  ],
  ['Hip Abduction Machine', 'Glutes', 'hip-abduction-machine', '5O_Y9l__iao'],
  ['Cable Pull-Through', 'Glutes', 'cable-pull-through', '_u4gJO0ELhE'],
  ['Glute Kickback', 'Glutes', 'glute-kickback', 'H4pN32BNeHk'],

  // Biceps
  ['Barbell Curl', 'Biceps', 'barbell-curl', 'QZEqB6wUPxQ'],
  ['Dumbbell Curl', 'Biceps', 'dumbbell-curl', 'ykJmrZ5v0Oo'],
  ['Hammer Curl', 'Biceps', 'hammer-curl', 'CFBZ4jN1CMI'],
  ['Preacher Curl', 'Biceps', 'preacher-curl', 'Fl8C_-E0Pig'],
  ['Incline Dumbbell Curl', 'Biceps', 'incline-dumbbell-curl', 'kfetl1P4vB0'],
  ['Cable Curl', 'Biceps', 'cable-curl', '16aEi1a68E0'],
  ['EZ-Bar Curl', 'Biceps', 'ez-bar-curl', 'SDFZBaJcTsU'],
  ['Concentration Curl', 'Biceps', 'concentration-curl', 'ZcU2hN76UyA'],
  ['Spider Curl', 'Biceps', 'spider-curl', '9Dd8iiEUs_Q'],
  ['Zottman Curl', 'Biceps', 'zottman-curl', 'HkCxX3mQlVg'],
  ['Cable Hammer Curl', 'Biceps', 'cable-hammer-curl', 'PslvRTdHJHY'],
  ['Machine Preacher Curl', 'Biceps', 'machine-preacher-curl', 'g7hiWfUH6i8'],
  ['Overhead Cable Curl', 'Biceps', 'overhead-cable-curl', 'NUoI-eDwY0U'],

  // Triceps
  ['Triceps Pushdown', 'Triceps', 'triceps-pushdown', '8JBHlaS7Dkk'],
  [
    'Overhead Triceps Extension',
    'Triceps',
    'overhead-triceps-extension',
    'bVfZIlxBMqU',
  ],
  ['Skull Crusher', 'Triceps', 'skull-crusher', 'GaK2da6B2zM'],
  [
    'Close-Grip Bench Press',
    'Triceps',
    'close-grip-bench-press',
    'a2G3IdaTcPU',
  ],
  ['Triceps Dip', 'Triceps', 'triceps-dip', 'SAqfMbjFaPo'],
  ['Rope Pushdown', 'Triceps', 'rope-pushdown', 'vPeQu_L-1n0'],
  ['Reverse-Grip Pushdown', 'Triceps', 'reverse-grip-pushdown', '573yzQkprl8'],
  ['Dumbbell Kickback', 'Triceps', 'dumbbell-kickback', 'xi806yP2EIE'],
  [
    'Cable Overhead Triceps Extension',
    'Triceps',
    'cable-overhead-triceps-extension',
    'JryE2ih4g-M',
  ],
  [
    'Single-Arm Overhead Extension',
    'Triceps',
    'single-arm-overhead-extension',
    'bjXPpf5jQnw',
  ],
  ['Bench Dip', 'Triceps', 'bench-dip', 'rtR5B0XTkpk'],
  ['Close-Grip Push-Up', 'Triceps', 'close-grip-push-up', 'zGEkpb42jhU'],

  // Calves
  ['Standing Calf Raise', 'Calves', 'standing-calf-raise', 'SorIB5_zO9A'],
  ['Seated Calf Raise', 'Calves', 'seated-calf-raise', '6O5hh1rBtx8'],
  ['Leg Press Calf Raise', 'Calves', 'leg-press-calf-raise', 'dhRz1Ns60Zg'],
  ['Donkey Calf Raise', 'Calves', 'donkey-calf-raise', 'wuI4jjPS6vg'],
  [
    'Smith Machine Calf Raise',
    'Calves',
    'smith-machine-calf-raise',
    'avO_qtvHJAg',
  ],
  ['Dumbbell Calf Raise', 'Calves', 'dumbbell-calf-raise', 'wxwY7GXxL4k'],

  // Core
  ['Plank', 'Core', 'plank', '6LqqeBtFn9M'],
  ['Hanging Leg Raise', 'Core', 'hanging-leg-raise', 'zll3yV6hLcg'],
  ['Cable Crunch', 'Core', 'cable-crunch', '0KEP6A1deBE'],
  ['Russian Twist', 'Core', 'russian-twist', 'wkD8rjkodUI'],
  ['Ab Wheel Rollout', 'Core', 'ab-wheel-rollout', 'yBg4UoOXxLo'],
  ['Crunch', 'Core', 'crunch', 'M6yAoJJQvGY'],
  ['Decline Crunch', 'Core', 'decline-crunch', 'FRzQXeN1hro'],
  ['Reverse Crunch', 'Core', 'reverse-crunch', 'XY8KzdDcMFg'],
  ['Bicycle Crunch', 'Core', 'bicycle-crunch', 'wpRI3xBhJmo'],
  ['Side Plank', 'Core', 'side-plank', 'Np5FR3qN3Gg'],
  ['Lying Leg Raise', 'Core', 'lying-leg-raise', 'SuIxXbKnwx4'],
  [
    "Captain's Chair Knee Raise",
    'Core',
    'captain-s-chair-knee-raise',
    '7KDDZtaUaxw',
  ],
  ['Dead Bug', 'Core', 'dead-bug', '-gRN_JyVTLY'],
  ['Mountain Climber', 'Core', 'mountain-climber', 're3dtmzGCOc'],
  ['Pallof Press', 'Core', 'pallof-press', 'Te5VAYXy0wQ'],
  ['Oblique Crunch', 'Core', 'oblique-crunch', '98eX0ndm7Z4'],

  // Forearms
  ['Wrist Curl', 'Forearms', 'wrist-curl', 'cayd9eTTMIc'],
  ['Reverse Curl', 'Forearms', 'reverse-curl', '10AFVfSUzsU'],
  ['Reverse Wrist Curl', 'Forearms', 'reverse-wrist-curl', 'hCMC4Vh2g_s'],
  ["Farmer's Walk", 'Forearms', 'farmer-s-walk', 'Fkzk_RqlYig'],
  ['Plate Pinch', 'Forearms', 'plate-pinch', 'jFTV3DQf3HE'],
  ['Wrist Roller', 'Forearms', 'wrist-roller', 'gUYXMoBpT8o'],

  // Full Body
  ['Power Clean', 'Full Body', 'power-clean', 'lI35socHJ4k'],
  ['Hang Clean', 'Full Body', 'hang-clean', 'QCQuZITCnPk'],
  ['Clean and Jerk', 'Full Body', 'clean-and-jerk', 'cnmHXtRH_Bk'],
  ['Power Snatch', 'Full Body', 'power-snatch', 'zUYMUr-m084'],
  ['Kettlebell Thruster', 'Full Body', 'kettlebell-thruster', '0-6iaZ-4-Cg'],
  ['Turkish Get-Up', 'Full Body', 'turkish-get-up', 'MA15oiX4XhE'],
  ['Battle Ropes', 'Full Body', 'battle-ropes', '7P211KiAUmg'],
  ['Sled Push', 'Full Body', 'sled-push', '1PmO6kzBEc8'],
];

const imageUrl = (/** @type {string | null} */ file) =>
  file ? `/exercise-images/${file}.webp` : null;
const videoUrl = (/** @type {string} */ id) =>
  `https://www.youtube.com/watch?v=${id}`;

/** @param {import('@libsql/client').Client} db */
async function seed(db) {
  const existing = await db.execute(
    'SELECT name, muscle_group, image_url, video_url FROM exercises',
  );
  const have = new Map(existing.rows.map((r) => [r.name, r]));

  /** @type {{ sql: string, args: any[] }[]} */
  const writes = [];
  let added = 0;
  let updated = 0;
  for (const [name, muscle, image, video] of EXERCISES) {
    const row = have.get(name);
    const img = imageUrl(image);
    const vid = videoUrl(video);
    if (!row) {
      writes.push({
        sql: 'INSERT INTO exercises (name, muscle_group, image_url, video_url) VALUES (?, ?, ?, ?)',
        args: [name, muscle, img, vid],
      });
      added++;
    } else if (
      row.muscle_group !== muscle ||
      row.image_url !== img ||
      row.video_url !== vid
    ) {
      writes.push({
        sql: 'UPDATE exercises SET muscle_group = ?, image_url = ?, video_url = ? WHERE name = ?',
        args: [muscle, img, vid, name],
      });
      updated++;
    }
  }
  if (writes.length === 0) return;

  // One transaction: all the changes land together or not at all.
  await db.batch(writes, 'write');
  console.log(`Seeded exercises: ${added} added, ${updated} updated`);
}

// The list is exported too, so a unit test can check every entry.
module.exports = Object.assign(seed, { EXERCISES });
