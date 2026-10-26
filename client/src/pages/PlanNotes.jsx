// Safety note and research sources shared by the plans screens.

// Where the plans' numbers come from. Shown under "Sources" so anyone can
// cross-check them. Keep in sync with the comment at the top of
// server/src/plans.js.
const SOURCES = [
  {
    title: 'ACSM resistance training position stand (2026)',
    note: 'Train each major muscle group at least twice a week; about 10 sets per muscle per week for muscle growth.',
    url: 'https://acsm.org/resistance-training-guidelines-update-2026/',
  },
  {
    title: 'Weekly training volume and muscle growth: meta-analysis (2017)',
    note: '10 or more weekly sets per muscle gave more growth than fewer.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27433992/',
  },
  {
    title: 'Training frequency and muscle growth: meta-analysis (2016)',
    note: 'Training a muscle twice a week beat once a week at the same weekly sets.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/27102172/',
  },
  {
    title: 'The resistance training dose response (Sports Medicine, 2026)',
    note: 'More weekly sets keep helping, with diminishing returns, faster for strength than for size.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41343037/',
  },
  {
    title: 'PAR-Q+ readiness questionnaire',
    note: 'A short self-check of whether to see a doctor before starting.',
    url: 'https://www.healthlinkbc.ca/living-well/physical-activity/general-information-and-tools/tools-and-resources/par-q-and-eparmed-x',
  },
];

// `full` adds the longer list of when to stop and who should check first.
export function SafetyNote({ full = false }) {
  return (
    <aside className="plan-safety" aria-label="Safety note">
      <p className="plan-safety-title">Check with a professional first</p>
      <p>
        These plans are general guidance, not medical advice. If you are new to
        lifting, a session or two with a qualified personal trainer to learn
        good form is worth it.
      </p>
      {full && (
        <ul>
          <li>
            See a doctor before starting if you have a heart, joint or other
            health condition, an injury, are pregnant, or have not exercised in
            a long time. The{' '}
            <a href={SOURCES[4].url} target="_blank" rel="noopener noreferrer">
              PAR-Q+ questionnaire
            </a>{' '}
            is a quick self-check.
          </li>
          <li>Warm up, and start lighter than you think you need.</li>
          <li>
            Stop and get help if you feel chest pain, dizziness, or sharp joint
            pain.
          </li>
        </ul>
      )}
    </aside>
  );
}

export function Sources() {
  return (
    <section className="plan-sources">
      <h2>Sources</h2>
      <p className="plan-sources-intro">
        Every plan trains each major muscle at least twice a week, with more
        weekly sets at higher levels. These are the guidelines and studies
        behind those numbers.
      </p>
      <ul>
        {SOURCES.map((s) => (
          <li key={s.url}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.title}
            </a>
            <span>{s.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
