// AI Coach Recap route. See coach-recap.js for how the facts are built and
// ai.js for the provider call.
//
// Flow: check opt-in + ownership -> fetch the workout's sets and history ->
// return the cached recap if the sets haven't changed -> otherwise compute
// facts with the rules engine, ask the LLM to narrate them, cache, return.

const crypto = require('node:crypto');
const express = require('express');
const { get, run } = require('../db');
const requireAuth = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rate-limit');
const { parseId } = require('../validation');
const { muscleSummary } = require('../analytics');
const { weekStartOf, localToday } = require('../dates');
const {
  workoutWithHistory,
  weeklyMuscleCounts,
  lastTrainedByMuscle,
} = require('../training-data');
const { buildRecapFacts, buildRecapPrompt } = require('../coach-recap');
const ai = require('../ai');

const router = express.Router();
router.use(requireAuth);

// POST /api/workouts/:id/recap
//   A short AI-written recap of a finished workout. Generated once and cached;
//   regenerated only if the workout's sets change afterwards.
//   Returns: 200 { text, created_at, cached }
//            403 the caller has not turned the AI recap on in Settings
//            404 workout not found or not the caller's
//            409 workout not finished yet, or it has no working sets
//            429 too many requests (aiLimiter)
//            502 the AI provider failed or timed out
//            503 no AI provider configured on this server
router.post('/workouts/:id/recap', aiLimiter, async (req, res, next) => {
  try {
    const workoutId = parseId(req.params.id);
    if (workoutId === null) {
      return res.status(404).json({ error: 'workout not found' });
    }

    const user = await get(
      'SELECT weight_unit, ai_enabled FROM users WHERE id = ?',
      req.userId,
    );
    if (!user?.ai_enabled) {
      return res
        .status(403)
        .json({ error: 'Turn on the AI coach recap in Settings first.' });
    }

    const workout = await get(
      'SELECT id, date, completed_at FROM workouts WHERE id = ? AND user_id = ?',
      workoutId,
      req.userId,
    );
    if (!workout) {
      return res.status(404).json({ error: 'workout not found' });
    }
    if (!workout.completed_at) {
      return res
        .status(409)
        .json({ error: 'Finish the workout to get a recap.' });
    }

    const { rows, exercises } = await workoutWithHistory(req.userId, workout);
    const fingerprint = crypto
      .createHash('sha256')
      .update(
        JSON.stringify(
          rows.map((r) => [r.id, r.reps, r.weight, r.set_type, r.rpe]),
        ),
      )
      .digest('hex');

    const cached = await get(
      'SELECT text, created_at, fingerprint FROM ai_recaps WHERE workout_id = ?',
      workoutId,
    );
    if (cached && cached.fingerprint === fingerprint) {
      return res.json({
        text: cached.text,
        created_at: cached.created_at,
        cached: true,
      });
    }

    if (!ai.isConfigured()) {
      return res
        .status(503)
        .json({ error: 'The AI coach is not set up on this server.' });
    }

    const today = localToday();
    const [counts, lastTrained] = await Promise.all([
      weeklyMuscleCounts(req.userId, weekStartOf(today)),
      lastTrainedByMuscle(req.userId),
    ]);
    const facts = buildRecapFacts({
      unit: user.weight_unit === 'lb' ? 'lb' : 'kg',
      exercises,
      muscles: muscleSummary({ counts, lastTrained, today }),
    });
    if (facts.total_working_sets === 0) {
      return res
        .status(409)
        .json({ error: 'This workout has no working sets to recap.' });
    }

    let text;
    try {
      text = await ai.generateText(buildRecapPrompt(facts));
    } catch (err) {
      console.error(
        `[ai] recap for workout ${workoutId} failed: ${err.message}`,
      );
      return res.status(502).json({
        error: 'The AI coach is unavailable right now. Try again later.',
      });
    }

    await run(
      `INSERT INTO ai_recaps (workout_id, fingerprint, text) VALUES (?, ?, ?)
       ON CONFLICT (workout_id) DO UPDATE
         SET fingerprint = excluded.fingerprint,
             text = excluded.text,
             created_at = CURRENT_TIMESTAMP`,
      workoutId,
      fingerprint,
      text,
    );
    const saved = await get(
      'SELECT text, created_at FROM ai_recaps WHERE workout_id = ?',
      workoutId,
    );
    res.json({ text: saved.text, created_at: saved.created_at, cached: false });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
