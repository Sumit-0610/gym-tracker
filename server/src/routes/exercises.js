// Exercise routes.
//
// The exercise library is shared reference data (seeded in seed.js), not
// per-user data — so there is no ownership check here, only authentication.

const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/exercises
//   Auth:     session required
//   Body:     none
//   Returns:  200 [{ id, name, muscle_group }, ...]
//
// SQL notes:
//   - No WHERE clause: every row in the library is public to any logged-in user.
//   - Explicit ORDER BY: SQLite gives no ordering guarantee without one. We sort
//     by muscle_group then name so the response is stable across calls and
//     already grouped for a UI. muscle_group is nullable; NULLs would sort first,
//     but every seeded row has one.
//   - No parameters, so nothing to parameterize — there is no user input in
//     this query at all.
router.get('/exercises', (req, res) => {
  const exercises = db
    .prepare(
      `SELECT id, name, muscle_group
         FROM exercises
        ORDER BY muscle_group, name`
    )
    .all();

  res.json(exercises);
});

module.exports = router;
