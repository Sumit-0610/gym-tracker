// Group the flat set list (server order = log order, oldest first) by exercise,
// keeping each exercise in the order it first appeared in the workout. The
// underlying rows are unchanged server records — this is a display transform,
// recomputed on every render, never stored.

/**
 * @param {Array<{id:number, exercise_id:number, exercise_name?:string, muscle_group?:string}>} sets
 * @returns {Array<{exercise_id:number, name?:string, muscle_group?:string, rows:Array}>}
 */
export function groupByExercise(sets) {
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
