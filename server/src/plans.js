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
//
// How the plans were checked (the unit test enforces the first two):
//   - Every plan trains each major muscle group at least twice a week. The
//     ACSM 2026 resistance training position stand recommends this, and the
//     frequency meta-analysis (Schoenfeld et al., 2016) found twice a week
//     beats once when weekly sets are equal.
//   - Weekly sets per muscle rise with level: roughly 6-12 for beginners, around
//     10 (the ACSM hypertrophy figure) for intermediates, and up to about 20 for
//     experts. More sets help, with diminishing returns (Schoenfeld et al., 2017;
//     Pelland et al., 2026).
//   - Three plans follow the layout of well-known free programs, linked in
//     `based_on`, so their structure can be cross-checked.

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
 *   based_on: { name: string, url: string } | null,
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
      'Two short full-body workouts you alternate. Every session trains each big muscle group, so you practise the main movements often.',
    schedule:
      'Three days a week with a rest day in between, e.g. Mon / Wed / Fri. Alternate A and B: A, B, A one week, then B, A, B the next.',
    progression:
      'When you hit every set and rep with good form, add the smallest weight step next time (2.5 kg on barbells, 1–2 kg on dumbbells). If you miss reps on a lift three sessions in a row, drop its weight by 10% and build back up.',
    based_on: {
      name: "Phrak's Greyskull LP (same A/B, three-day layout)",
      url: 'https://www.liftosaur.com/programs/phrakgreyskull',
    },
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
        focus: 'Legs, press, row',
        exercises: [
          ['Leg Press', 3, 10],
          ['Seated Dumbbell Shoulder Press', 3, 10],
          ['Seated Cable Row', 3, 10],
          ['Push-Up', 3, 10],
          ['Lying Leg Curl', 2, 12],
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
      'Use the same weight until all sets reach the target reps, then add a small step of weight and build the reps back up.',
    based_on: null,
    workouts: [
      {
        name: 'Upper',
        focus: 'Chest, back, shoulders, arms',
        exercises: [
          ['Flat Dumbbell Press', 3, 10],
          ['Lat Pulldown', 3, 10],
          ['Machine Shoulder Press', 3, 10],
          ['Seated Cable Row', 3, 10],
          ['Cable Fly', 2, 12],
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
    id: 'beginner-upper-lower-full',
    name: 'Upper / Lower / Full Body',
    short: 'ULF Starter',
    level: 'beginner',
    split: 'Upper / lower / full',
    days_per_week: 3,
    minutes: 45,
    summary:
      'Three different days: upper body, lower body, then a full-body day. Only three sessions, but every muscle still gets trained twice a week.',
    schedule:
      'Three days a week, e.g. Mon Upper, Wed Lower, Fri Full Body. Keep at least one rest day between sessions.',
    progression:
      'Add one rep per set each week. Once every set reaches 12 reps, add weight and go back to 8–10.',
    based_on: null,
    workouts: [
      {
        name: 'Upper',
        focus: 'Chest, back, shoulders, arms',
        exercises: [
          ['Machine Chest Press', 3, 10],
          ['Lat Pulldown', 3, 10],
          ['Seated Dumbbell Shoulder Press', 3, 10],
          ['Seated Cable Row', 3, 10],
          ['Hammer Curl', 2, 12],
          ['Rope Pushdown', 2, 12],
        ],
      },
      {
        name: 'Lower',
        focus: 'Quads, hamstrings, calves',
        exercises: [
          ['Goblet Squat', 3, 10],
          ['Dumbbell Romanian Deadlift', 3, 10],
          ['Leg Extension', 2, 12],
          ['Lying Leg Curl', 2, 12],
          ['Standing Calf Raise', 3, 12],
          ['Dead Bug', 2, 10],
        ],
      },
      {
        name: 'Full Body',
        focus: 'A bit of everything',
        exercises: [
          ['Leg Press', 3, 10],
          ['Incline Dumbbell Press', 3, 10],
          ['Chest-Supported Dumbbell Row', 3, 10],
          ['Seated Leg Curl', 2, 12],
          ['Lateral Raise', 2, 15],
          ['Crunch', 2, 15],
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
    based_on: {
      name: 'PHUL: Power Hypertrophy Upper Lower (same four-day layout)',
      url: 'https://www.muscleandstrength.com/workouts/phul-workout',
    },
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
          ['Seated Calf Raise', 3, 15],
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
    days_per_week: 6,
    minutes: 60,
    summary:
      'The popular six-day split: three workouts, each done twice a week, so every muscle is trained twice. Each day starts with a heavy compound lift.',
    schedule:
      'Pull, Push, Legs, Pull, Push, Legs, then one rest day. If you can only train three days, run each workout once a week, but expect slower progress.',
    progression:
      'Add weight to the first lift of each day whenever you hit all sets. For the rest, add reps until the top of the range, then weight. If you miss reps three sessions in a row, drop 10% and build back up.',
    based_on: {
      name: "Reddit's beginner PPL by Metallicadpa (same six-day layout)",
      url: 'https://www.liftosaur.com/programs/metallicadpappl',
    },
    workouts: [
      {
        name: 'Push',
        focus: 'Chest, shoulders, triceps',
        exercises: [
          ['Barbell Bench Press', 4, 6],
          ['Seated Dumbbell Shoulder Press', 3, 8],
          ['Incline Dumbbell Press', 3, 10],
          ['Cable Lateral Raise', 3, 15],
          ['Overhead Triceps Extension', 3, 12],
        ],
      },
      {
        name: 'Pull',
        focus: 'Back, rear delts, biceps',
        exercises: [
          ['Barbell Row', 4, 6],
          ['Lat Pulldown', 3, 10],
          ['Face Pull', 3, 15],
          ['Hammer Curl', 3, 12],
          ['Dumbbell Curl', 2, 12],
        ],
      },
      {
        name: 'Legs',
        focus: 'Quads, hamstrings, glutes, calves',
        exercises: [
          ['Barbell Back Squat', 3, 6],
          ['Romanian Deadlift', 3, 8],
          ['Leg Press', 3, 10],
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
    based_on: null,
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
          ['Standing Calf Raise', 3, 12],
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
          ['Cable Fly', 3, 12],
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
      'Six different workouts, every muscle twice a week. The A days are heavy and the B days use more volume and different exercises.',
    schedule:
      'Push A, Pull A, Legs A, Push B, Pull B, Legs B, then one rest day.',
    progression:
      'Push the A-day main lifts with small weekly jumps. Take an easier week (about half the sets) every 6–8 weeks.',
    based_on: null,
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
    id: 'expert-ulppl',
    name: 'Upper / Lower + Push / Pull / Legs',
    short: 'ULPPL',
    level: 'expert',
    split: 'Hybrid 5-day',
    days_per_week: 5,
    minutes: 70,
    summary:
      'Two heavy days (upper and lower) followed by three high-volume days (push, pull, legs). Five sessions, with every muscle trained twice a week.',
    schedule:
      'Mon Upper, Tue Lower, Wed rest, Thu Push, Fri Pull, Sat Legs, Sun rest.',
    progression:
      'Upper and Lower days: add weight to the first two lifts each week you complete them. Push, Pull and Legs: beat last week on reps or weight, keeping 1–2 reps in reserve.',
    based_on: null,
    workouts: [
      {
        name: 'Upper',
        focus: 'Heavy press and pull',
        exercises: [
          ['Barbell Bench Press', 4, 5],
          ['Pull-Up', 4, 6],
          ['Overhead Press', 3, 6],
          ['Pendlay Row', 3, 6],
          ['EZ-Bar Curl', 2, 10],
          ['Skull Crusher', 2, 10],
        ],
      },
      {
        name: 'Lower',
        focus: 'Heavy squat and hinge',
        exercises: [
          ['Barbell Back Squat', 4, 5],
          ['Romanian Deadlift', 3, 6],
          ['Leg Press', 3, 10],
          ['Lying Leg Curl', 3, 10],
          ['Standing Calf Raise', 4, 10],
        ],
      },
      {
        name: 'Push',
        focus: 'Chest, shoulders, triceps volume',
        exercises: [
          ['Incline Dumbbell Press', 4, 10],
          ['Machine Shoulder Press', 3, 10],
          ['Pec Deck', 3, 15],
          ['Cable Lateral Raise', 4, 15],
          ['Rope Pushdown', 3, 12],
          ['Cable Overhead Triceps Extension', 3, 12],
        ],
      },
      {
        name: 'Pull',
        focus: 'Back and biceps volume',
        exercises: [
          ['Lat Pulldown', 4, 10],
          ['Chest-Supported Dumbbell Row', 4, 10],
          ['Single-Arm Lat Pulldown', 3, 12],
          ['Reverse Pec Deck', 3, 15],
          ['Incline Dumbbell Curl', 3, 12],
          ['Hammer Curl', 3, 12],
        ],
      },
      {
        name: 'Legs',
        focus: 'Legs and glutes volume',
        exercises: [
          ['Hack Squat', 4, 10],
          ['Hip Thrust', 3, 10],
          ['Bulgarian Split Squat', 3, 10],
          ['Seated Leg Curl', 3, 12],
          ['Leg Extension', 3, 15],
          ['Seated Calf Raise', 4, 15],
          ['Hanging Leg Raise', 3, 12],
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
    minutes: 80,
    summary:
      'Built around the four big barbell lifts. Each day starts with heavy low-rep work on one lift, then adds bodybuilding work for size.',
    schedule:
      'Mon Squat, Tue Bench, Thu Deadlift, Fri Overhead Press. Rest between Tue and Thu.',
    progression:
      'Add 2.5 kg (upper) or 5 kg (lower) to the main lift each week until you miss reps, then drop 10% and build back up. Take an easier week every 6–8 weeks.',
    based_on: null,
    workouts: [
      {
        name: 'Squat Day',
        focus: 'Squat and legs',
        exercises: [
          ['Barbell Back Squat', 5, 3],
          ['Front Squat', 3, 6],
          ['Romanian Deadlift', 4, 8],
          ['Leg Extension', 3, 12],
          ['Standing Calf Raise', 4, 10],
        ],
      },
      {
        name: 'Bench Day',
        focus: 'Bench and upper back',
        exercises: [
          ['Barbell Bench Press', 5, 3],
          ['Close-Grip Bench Press', 3, 6],
          ['Incline Dumbbell Press', 3, 10],
          ['Chest-Supported Dumbbell Row', 4, 10],
          ['Cable Lateral Raise', 3, 15],
          ['Triceps Pushdown', 3, 12],
        ],
      },
      {
        name: 'Deadlift Day',
        focus: 'Deadlift and back',
        exercises: [
          ['Conventional Deadlift', 5, 3],
          ['Barbell Row', 4, 8],
          ['Pull-Up', 3, 8],
          ['Leg Press', 3, 10],
          ['Glute-Ham Raise', 4, 8],
          ['Seated Calf Raise', 3, 15],
        ],
      },
      {
        name: 'Press Day',
        focus: 'Overhead press, chest and arms',
        exercises: [
          ['Overhead Press', 5, 3],
          ['Incline Barbell Bench Press', 3, 8],
          ['Lateral Raise', 4, 15],
          ['Face Pull', 3, 15],
          ['Barbell Curl', 3, 10],
          ['Overhead Triceps Extension', 3, 12],
          ['Hanging Leg Raise', 3, 12],
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

/**
 * Direct sets per muscle group per week, and how many days that muscle is
 * trained. "Direct" means the exercise's own muscle group in the library; the
 * helpers a compound lift also works (e.g. triceps on bench press) are not
 * counted, so the real totals are a bit higher.
 *
 * Each workout runs days_per_week / workouts.length times a week (1.5 for a
 * two-workout plan done three days a week).
 *
 * @param {Plan} plan
 * @param {(name: string) => string | undefined} muscleOf exercise name -> group
 * @returns {Record<string, { sets: number, days: number }>}
 */
function weeklyVolume(plan, muscleOf) {
  const perWeek = plan.days_per_week / plan.workouts.length;
  /** @type {Record<string, { sets: number, days: number }>} */
  const out = {};
  for (const w of plan.workouts) {
    const seen = new Set();
    for (const [name, sets] of w.exercises) {
      const muscle = muscleOf(name);
      if (!muscle) continue;
      out[muscle] ??= { sets: 0, days: 0 };
      out[muscle].sets += sets * perWeek;
      if (!seen.has(muscle)) {
        out[muscle].days += perWeek;
        seen.add(muscle);
      }
    }
  }
  for (const v of Object.values(out)) {
    v.sets = Math.round(v.sets * 10) / 10;
    v.days = Math.round(v.days * 10) / 10;
  }
  return out;
}

module.exports = { PLANS, LEVELS, findPlan, routineName, weeklyVolume };
