import './SetList.css';

// Group the flat set list (server order = log order, oldest first) by exercise,
// keeping each exercise in the order it first appeared in the workout.
// The underlying rows are unchanged server records — this is display only.
function groupByExercise(sets) {
  const order = [];
  const map = new Map();
  for (const s of sets) {
    if (!map.has(s.exercise_id)) {
      map.set(s.exercise_id, {
        exercise_id: s.exercise_id,
        name: s.exercise_name,
        muscle_group: s.muscle_group,
        rows: [],
      });
      order.push(s.exercise_id);
    }
    map.get(s.exercise_id).rows.push(s);
  }
  return order.map((id) => map.get(id));
}

function weightLabel(w) {
  return w === 0 ? 'bodyweight' : `${w} kg`;
}

export default function SetList({ sets }) {
  const groups = groupByExercise(sets);

  return (
    <ul className="set-groups">
      {groups.map((g) => (
        <li key={g.exercise_id} className="set-group">
          <div className="set-group-head">
            <span className="set-group-name">{g.name}</span>
            {g.muscle_group && (
              <span className="set-group-muscle">{g.muscle_group}</span>
            )}
          </div>
          <ol className="set-rows">
            {g.rows.map((s) => (
              <li key={s.id} className="set-row">
                <span className="set-row-n">Set {s.set_number}</span>
                <span className="set-row-detail">
                  {s.reps} reps × {weightLabel(s.weight)}
                </span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  );
}
