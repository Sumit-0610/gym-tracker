// Suggested workout plans: ready-made programs for three experience levels.
//
// A plan is a few workouts (e.g. Push, Pull, Legs) plus a weekly schedule.
// It is static data, not a table: everyone sees the same plans, and changing a
// plan is a code change reviewed like any other. A user who likes one "starts"
// it, which copies each workout into their own routines (see routes/plans.js).
// From then on those routines are ordinary user data they can add to.
//
// Exercises are named, not referenced by id, because ids differ between
// databases while names are stable (the seed matches by name too). A unit test
// checks that every name here exists in the exercise library.
//
// Each exercise is [name, target sets, target reps].

/**
 * @typedef {[string, number, number]} PlanExercise
 * @typedef {{ name: string, focus: string, exercises: PlanExercise[] }} PlanWorkout
 * @typedef {{
 *   id: string,
 *   name: string,
 *   short: string,
 *   level: 'beginner' | 'intermediate' | 'expert',
 *   split: string,
 *   days_per_week: number,
 *   minutes: number,
 *   summary: string,
 *   schedule: string,
 *   progression: string,
 *   workouts: PlanWorkout[],
 * }} Plan
 */

const LEVELS = ['beginner', 'intermediate', 'expert'];

/** @type {Plan[]} */
const PLANS = [
  // ---------------------------------------------------------------- beginner
  {
    id: 'beginner-full-body',
    name: 'Full Body Basics',
    short: 'Full Body Basics',
    level: 'beginner',
    split: 'Full body',
    days_per_week: 3,
    minutes: 45,
    summary:
      'Two short full-body workouts you alternate. Every session trains each big muscle group, so you practise the main lifts often.',
    schedule:
      'Three days a week with a rest day in between, e.g. Mon / Wed / Fri. Alternate A and B: A, B, A one week, then B, A, B the next.',
    progression:
      'When you hit every set and rep with good form, add the smallest weight step next time (2.5 kg on barbells, 1–2 kg on dumbbells).',
    workouts: [
      {
        name: 'Workout A',
        focus: 'Squat, push, pull',
        exercises: [
          ['Goblet Squat', 3, 10],
          ['Machine Chest Press', 3, 10],
          ['Lat Pulldown', 3, 10],
          ['Dumbbell Romanian Deadlift', 3, 10],
          ['Lateral Raise', 2, 12],
          ['Dead Bug', 2, 10],
        ],
      },
      {
        name: 'Workout B',
        focus: 'Hinge, press, row',
        exercises: [
          ['Leg Press', 3, 10],
          ['Seated Dumbbell Shoulder Press', 3, 10],
          ['Seated Cable Row', 3, 10],
          ['Glute Bridge', 3, 12],
          ['Dumbbell Curl', 2, 12],
          ['Triceps Pushdown', 2, 12],
        ],
      },
    ],
  },
  {
    id: 'beginner-upper-lower',
    name: 'Upper / Lower Starter',
    short: 'Upper Lower Starter',
    level: 'beginner',
    split: 'Upper / lower',
    days_per_week: 4,
    minutes: 45,
    summary:
      'One upper-body day and one lower-body day, each done twice a week. A gentle step up for people who can train four days.',
    schedule:
      'Four days a week, e.g. Mon Upper, Tue Lower, Thu Upper, Fri Lower. Rest on the other days.',
    progression:
      'Use the same weight until all sets reach the top rep count, then add a small step of weight and build the reps back up.',
    workouts: [
      {
        name: 'Upper',
        focus: 'Chest, back, shoulders, arms',
        exercises: [
          ['Flat Dumbbell Press', 3, 10],
          ['Lat Pulldown', 3, 10],
          ['Machine Shoulder Press', 3, 10],
          ['Seated Cable Row', 3, 10],
          ['Dumbbell Curl', 2, 12],
          ['Rope Pushdown', 2, 12],
        ],
      },
      {
        name: 'Lower',
        focus: 'Quads, hamstrings, glutes, calves',
        exercises: [
          ['Leg Press', 3, 10],
          ['Dumbbell Romanian Deadlift', 3, 10],
          ['Leg Extension', 2, 12],
          ['Seated Leg Curl', 2, 12],
          ['Standing Calf Raise', 3, 12],
          ['Crunch', 2, 15],
        ],
      },
    ],
  },
  {
    id: 'beginner-ppl',
    name: 'Push / Pull / Legs Lite',
    short: 'PPL Lite',
    level: 'beginner',
    split: 'Push / pull / legs',
    days_per_week: 3,
    minutes: 40,
    summary:
      'The classic three-way split with fewer exercises and lighter volume. Mostly machines and dumbbells, so it is easy to learn.',
    schedule:
      'Three days a week, e.g. Mon Push, Wed Pull, Fri Legs. Keep at least one rest day between sessions.',
    progression:
      'Add one rep per set each week. Once you reach 12 reps on every set, add weight and go back to 8.',
    workouts: [
      {
        name: 'Push',
        focus: 'Chest, shoulders, triceps',
        exercises: [
          ['Machine Chest Press', 3, 10],
          ['Incline Dumbbell Press', 3, 10],
          ['Lateral Raise', 3, 12],
          ['Triceps Pushdown', 3, 12],
        ],
      },
      {
        name: 'Pull',
        focus: 'Back, rear delts, biceps',
        exercises: [
          ['Lat Pulldown', 3, 10],
          ['Seated Cable Row', 3, 10],
          ['Face Pull', 3, 15],
          ['Hammer Curl', 3, 12],
        ],
      },
      {
        name: 'Legs',
        focus: 'Quads, hamstrings, calves',
        exercises: [
          ['Goblet Squat', 3, 10],
          ['Lying Leg Curl', 3, 12],
          ['Walking Lunge', 2, 10],
          ['Seated Calf Raise', 3, 15],
        ],
      },
    ],
  },

  // ------------------------------------------------------------ intermediate
  {
    id: 'intermediate-upper-lower',
    name: 'Upper / Lower Strength & Size',
    short: 'Upper Lower',
    level: 'intermediate',
    split: 'Upper / lower',
    days_per_week: 4,
    minutes: 60,
    summary:
      'Four different workouts: a heavy day and a higher-rep day for both upper and lower body. Builds strength on the big lifts and muscle with the rest.',
    schedule:
      'Four days a week, e.g. Mon Upper Strength, Tue Lower Strength, Thu Upper Volume, Fri Lower Volume.',
    progression:
      'On strength days add 2.5 kg when you complete every set. On volume days, add reps first, then weight.',
    workouts: [
      {
        name: 'Upper Strength',
        focus: 'Heavy press and row',
        exercises: [
          ['Barbell Bench Press', 4, 6],
          ['Barbell Row', 4, 6],
          ['Overhead Press', 3, 8],
          ['Pull-Up', 3, 8],
          ['EZ-Bar Curl', 2, 10],
          ['Skull Crusher', 2, 10],
        ],
      },
      {
        name: 'Lower Strength',
        focus: 'Heavy squat and hinge',
        exercises: [
          ['Barbell Back Squat', 4, 6],
          ['Romanian Deadlift', 3, 8],
          ['Leg Press', 3, 10],
          ['Lying Leg Curl', 3, 10],
          ['Standing Calf Raise', 4, 10],
        ],
      },
      {
        name: 'Upper Volume',
        focus: 'Higher reps for size',
        exercises: [
          ['Incline Dumbbell Press', 3, 10],
          ['Chest-Supported Dumbbell Row', 3, 10],
          ['Cable Fly', 3, 12],
          ['Lat Pulldown', 3, 12],
          ['Lateral Raise', 3, 15],
          ['Incline Dumbbell Curl', 3, 12],
          ['Rope Pushdown', 3, 12],
        ],
      },
      {
        name: 'Lower Volume',
        focus: 'Higher reps for size',
        exercises: [
          ['Hack Squat', 3, 10],
          ['Hip Thrust', 3, 10],
          ['Bulgarian Split Squat', 3, 10],
          ['Seated Leg Curl', 3, 12],
          ['Leg Extension', 3, 15],
          ['Hanging Leg Raise', 3, 12],
        ],
      },
    ],
  },
  {
    id: 'intermediate-ppl',
    name: 'Push / Pull / Legs',
    short: 'PPL',
    level: 'intermediate',
    split: 'Push / pull / legs',
    days_per_week: 3,
    minutes: 60,
    summary:
      'Each muscle group gets its own day with a heavy compound lift first. Run it three days a week, or six to train everything twice.',
    schedule:
      'Three days (Mon Push, Wed Pull, Fri Legs) or six days (Push, Pull, Legs, Push, Pull, Legs, rest).',
    progression:
      'Add weight to the first lift of each day whenever you hit all sets. For the rest, add reps until the top of the range, then weight.',
    workouts: [
      {
        name: 'Push',
        focus: 'Chest, shoulders, triceps',
        exercises: [
          ['Barbell Bench Press', 4, 6],
          ['Seated Dumbbell Shoulder Press', 3, 8],
          ['Incline Dumbbell Press', 3, 10],
          ['Cable Lateral Raise', 3, 12],
          ['Overhead Triceps Extension', 3, 12],
        ],
      },
      {
        name: 'Pull',
        focus: 'Back, rear delts, biceps',
        exercises: [
          ['Conventional Deadlift', 3, 5],
          ['Pull-Up', 3, 8],
          ['Seated Cable Row', 3, 10],
          ['Face Pull', 3, 15],
          ['Barbell Curl', 3, 10],
        ],
      },
      {
        name: 'Legs',
        focus: 'Quads, hamstrings, glutes, calves',
        exercises: [
          ['Barbell Back Squat', 4, 6],
          ['Romanian Deadlift', 3, 8],
          ['Walking Lunge', 3, 10],
          ['Lying Leg Curl', 3, 12],
          ['Standing Calf Raise', 4, 12],
        ],
      },
    ],
  },
  {
    id: 'intermediate-full-body',
    name: 'Full Body 3-Day',
    short: 'Full Body 3-Day',
    level: 'intermediate',
    split: 'Full body',
    days_per_week: 3,
    minutes: 60,
    summary:
      'Three different full-body days, each built around one main barbell lift. Good when you can only train three times a week.',
    schedule:
      'Three days a week with rest days between, e.g. Mon Day 1, Wed Day 2, Fri Day 3.',
    progression:
      'Add weight to the main lift (the first exercise) every week you complete it. Change accessory weights when they feel easy.',
    workouts: [
      {
        name: 'Day 1',
        focus: 'Squat focus',
        exercises: [
          ['Barbell Back Squat', 4, 6],
          ['Flat Dumbbell Press', 3, 10],
          ['Chest-Supported Dumbbell Row', 3, 10],
          ['Lying Leg Curl', 3, 12],
          ['Lateral Raise', 3, 15],
        ],
      },
      {
        name: 'Day 2',
        focus: 'Bench focus',
        exercises: [
          ['Barbell Bench Press', 4, 6],
          ['Romanian Deadlift', 3, 8],
          ['Lat Pulldown', 3, 10],
          ['Bulgarian Split Squat', 3, 10],
          ['Hammer Curl', 3, 12],
        ],
      },
      {
        name: 'Day 3',
        focus: 'Deadlift focus',
        exercises: [
          ['Conventional Deadlift', 3, 5],
          ['Overhead Press', 3, 8],
          ['Pull-Up', 3, 8],
          ['Leg Press', 3, 12],
          ['Rope Pushdown', 3, 12],
          ['Cable Crunch', 3, 15],
        ],
      },
    ],
  },

  // ------------------------------------------------------------------ expert
  {
    id: 'expert-ppl-6',
    name: 'Push / Pull / Legs × 2',
    short: 'PPL x2',
    level: 'expert',
    split: 'Push / pull / legs',
    days_per_week: 6,
    minutes: 75,
    summary:
      'Six days, every muscle twice a week. The A days are heavy and the B days use more volume and different exercises.',
    schedule:
      'Push A, Pull A, Legs A, Push B, Pull B, Legs B, then one rest day.',
    progression:
      'Push the A-day main lifts with small weekly jumps. Take an easier week (about half the sets) every 6–8 weeks.',
    workouts: [
      {
        name: 'Push A',
        focus: 'Heavy chest and shoulders',
        exercises: [
          ['Barbell Bench Press', 5, 5],
          ['Overhead Press', 3, 6],
          ['Incline Dumbbell Press', 3, 8],
          ['Dip', 3, 10],
          ['Cable Lateral Raise', 4, 12],
          ['Skull Crusher', 3, 10],
        ],
      },
      {
        name: 'Pull A',
        focus: 'Heavy back',
        exercises: [
          ['Conventional Deadlift', 4, 4],
          ['Pendlay Row', 4, 6],
          ['Pull-Up', 4, 8],
          ['Face Pull', 3, 15],
          ['Barbell Curl', 3, 8],
          ['Hammer Curl', 3, 12],
        ],
      },
      {
        name: 'Legs A',
        focus: 'Heavy squat',
        exercises: [
          ['Barbell Back Squat', 5, 5],
          ['Romanian Deadlift', 4, 8],
          ['Leg Press', 3, 10],
          ['Lying Leg Curl', 3, 10],
          ['Standing Calf Raise', 4, 10],
          ['Hanging Leg Raise', 3, 12],
        ],
      },
      {
        name: 'Push B',
        focus: 'Chest and shoulder volume',
        exercises: [
          ['Incline Barbell Bench Press', 4, 8],
          ['Seated Dumbbell Shoulder Press', 3, 10],
          ['Pec Deck', 3, 12],
          ['Lateral Raise', 4, 15],
          ['Rope Pushdown', 3, 12],
          ['Cable Overhead Triceps Extension', 3, 12],
        ],
      },
      {
        name: 'Pull B',
        focus: 'Back width and arms',
        exercises: [
          ['Lat Pulldown', 4, 10],
          ['Chest-Supported Dumbbell Row', 4, 10],
          ['Straight-Arm Pulldown', 3, 12],
          ['Reverse Pec Deck', 3, 15],
          ['Incline Dumbbell Curl', 3, 12],
          ['Cable Curl', 3, 15],
        ],
      },
      {
        name: 'Legs B',
        focus: 'Legs and glutes volume',
        exercises: [
          ['Front Squat', 4, 8],
          ['Hip Thrust', 4, 10],
          ['Bulgarian Split Squat', 3, 10],
          ['Nordic Hamstring Curl', 3, 6],
          ['Leg Extension', 3, 15],
          ['Seated Calf Raise', 4, 15],
        ],
      },
    ],
  },
  {
    id: 'expert-body-part',
    name: 'Five-Day Body Part Split',
    short: 'Body Part Split',
    level: 'expert',
    split: 'Body part split',
    days_per_week: 5,
    minutes: 70,
    summary:
      'A bodybuilding-style week where each day hits one or two muscle groups very hard, with lots of sets per muscle.',
    schedule: 'Mon Chest, Tue Back, Wed Legs, Thu Shoulders, Fri Arms.',
    progression:
      'Aim to beat last week on reps or weight for each exercise. Keep the last set of each exercise close to failure.',
    workouts: [
      {
        name: 'Chest',
        focus: 'Chest',
        exercises: [
          ['Barbell Bench Press', 4, 6],
          ['Incline Dumbbell Press', 4, 8],
          ['Decline Dumbbell Press', 3, 10],
          ['Cable Fly', 3, 12],
          ['Pec Deck', 3, 15],
          ['Dip', 3, 10],
        ],
      },
      {
        name: 'Back',
        focus: 'Back and rear delts',
        exercises: [
          ['Rack Pull', 4, 5],
          ['Pull-Up', 4, 8],
          ['T-Bar Row', 4, 8],
          ['Single-Arm Lat Pulldown', 3, 12],
          ['Seated Cable Row', 3, 12],
          ['Dumbbell Shrug', 3, 12],
        ],
      },
      {
        name: 'Legs',
        focus: 'Quads, hamstrings, calves',
        exercises: [
          ['Barbell Back Squat', 5, 5],
          ['Hack Squat', 3, 10],
          ['Romanian Deadlift', 4, 8],
          ['Walking Lunge', 3, 12],
          ['Seated Leg Curl', 3, 12],
          ['Leg Extension', 3, 15],
          ['Standing Calf Raise', 5, 12],
        ],
      },
      {
        name: 'Shoulders',
        focus: 'Delts and core',
        exercises: [
          ['Overhead Press', 4, 6],
          ['Arnold Press', 3, 10],
          ['Cable Lateral Raise', 4, 15],
          ['Cable Rear Delt Fly', 3, 15],
          ['Upright Row', 3, 12],
          ['Ab Wheel Rollout', 3, 10],
        ],
      },
      {
        name: 'Arms',
        focus: 'Biceps, triceps, forearms',
        exercises: [
          ['Close-Grip Bench Press', 4, 8],
          ['EZ-Bar Curl', 4, 8],
          ['Skull Crusher', 3, 10],
          ['Preacher Curl', 3, 10],
          ['Rope Pushdown', 3, 15],
          ['Spider Curl', 3, 12],
          ['Reverse Curl', 3, 12],
        ],
      },
    ],
  },
  {
    id: 'expert-powerbuilding',
    name: 'Powerbuilding 4-Day',
    short: 'Powerbuilding',
    level: 'expert',
    split: 'Strength + size',
    days_per_week: 4,
    minutes: 75,
    summary:
      'Built around the four big barbell lifts. Each day starts with heavy low-rep work on one lift, then adds bodybuilding work for size.',
    schedule:
      'Mon Squat, Tue Bench, Thu Deadlift, Fri Overhead Press. Rest between Tue and Thu.',
    progression:
      'Add 2.5 kg (upper) or 5 kg (lower) to the main lift each week until you miss reps, then drop 10% and build back up.',
    workouts: [
      {
        name: 'Squat Day',
        focus: 'Squat and quads',
        exercises: [
          ['Barbell Back Squat', 5, 3],
          ['Front Squat', 3, 6],
          ['Leg Press', 3, 10],
          ['Leg Extension', 3, 12],
          ['Standing Calf Raise', 4, 10],
        ],
      },
      {
        name: 'Bench Day',
        focus: 'Bench and chest',
        exercises: [
          ['Barbell Bench Press', 5, 3],
          ['Close-Grip Bench Press', 3, 6],
          ['Incline Dumbbell Press', 3, 10],
          ['Chest-Supported Dumbbell Row', 4, 10],
          ['Triceps Pushdown', 3, 12],
        ],
      },
      {
        name: 'Deadlift Day',
        focus: 'Deadlift and back',
        exercises: [
          ['Conventional Deadlift', 5, 3],
          ['Deficit Deadlift', 3, 5],
          ['Barbell Row', 4, 8],
          ['Glute-Ham Raise', 3, 8],
          ['Pull-Up', 3, 8],
          ['Hanging Leg Raise', 3, 12],
        ],
      },
      {
        name: 'Press Day',
        focus: 'Overhead press and arms',
        exercises: [
          ['Overhead Press', 5, 3],
          ['Push Press', 3, 5],
          ['Lateral Raise', 4, 15],
          ['Face Pull', 3, 15],
          ['Barbell Curl', 3, 10],
          ['Overhead Triceps Extension', 3, 12],
        ],
      },
    ],
  },
];

/** The routine name a plan workout becomes, e.g. "PPL · Push". */
const routineName = (/** @type {Plan} */ plan, /** @type {PlanWorkout} */ w) =>
  `${plan.short} · ${w.name}`;

/** @param {string} id */
const findPlan = (id) => PLANS.find((p) => p.id === id);

module.exports = { PLANS, LEVELS, findPlan, routineName };
