// Small shared helpers for the suggested-plans screens.

export const LEVELS = [
  {
    id: 'beginner',
    label: 'Beginner',
    blurb:
      'New to the gym or back after a long break. Simple lifts, 3–4 days a week.',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    blurb:
      'Training steadily for 6+ months. Heavier barbell work and more variety.',
  },
  {
    id: 'expert',
    label: 'Expert',
    blurb: 'Years of consistent training. High volume, 4–6 days a week.',
  },
];

export const levelLabel = (id) => LEVELS.find((l) => l.id === id)?.label ?? id;

// "3 days/week · ~45 min"
export const planMeta = (p) =>
  `${p.days_per_week} days/week · ~${p.minutes} min`;
