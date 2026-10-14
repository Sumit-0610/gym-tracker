// Settings → Export data: download the date range as CSV / JSON.
const fs = require('node:fs');
const { test, expect } = require('@playwright/test');
const { signUp, startFreestyle, logSet, finishWorkout } = require('./helpers');

test('exports the last 30 days as CSV and JSON', async ({ page }) => {
  await signUp(page);
  await startFreestyle(page);
  await logSet(page, { exercise: 'Barbell Bench Press', reps: 8, weight: 60 });
  await logSet(page, { reps: 6, weight: 65 });
  await finishWorkout(page);

  await page.goto('/settings');
  const card = page.locator('fieldset.export');
  await expect(card.getByRole('group', { name: 'Quick ranges' })).toBeVisible();
  // No email provider on the test server, so only download is offered.
  await expect(card.getByRole('button', { name: 'Send email' })).toHaveCount(0);

  await card.getByRole('button', { name: '30 days' }).click();
  const [csv] = await Promise.all([
    page.waitForEvent('download'),
    card.getByRole('button', { name: 'Download' }).click(),
  ]);
  expect(csv.suggestedFilename()).toMatch(
    /^gym-tracker-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}\.csv$/,
  );
  const lines = fs
    .readFileSync(await csv.path(), 'utf8')
    .trim()
    .split('\r\n');
  expect(lines[0]).toBe(
    'date,workout_id,routine,exercise,muscle_group,set_number,set_type,reps,weight,unit,rpe',
  );
  expect(lines).toHaveLength(3);
  expect(lines[1]).toContain(',Barbell Bench Press,Chest,1,normal,8,60,kg,');
  expect(lines[2]).toContain(',Barbell Bench Press,Chest,2,normal,6,65,kg,');
  await expect(card.getByRole('status')).toHaveText('Download started.');

  await card.getByRole('radio', { name: 'JSON' }).check();
  const [json] = await Promise.all([
    page.waitForEvent('download'),
    card.getByRole('button', { name: 'Download' }).click(),
  ]);
  expect(json.suggestedFilename()).toMatch(/\.json$/);
  const data = JSON.parse(fs.readFileSync(await json.path(), 'utf8'));
  expect(data.workouts).toHaveLength(1);
  expect(data.workouts[0].sets).toHaveLength(2);
});

test('rejects a start date after the end date', async ({ page }) => {
  await signUp(page);
  await page.goto('/settings');
  const card = page.locator('fieldset.export');
  await card.getByLabel('From').fill('2026-02-10');
  await card.getByLabel('To').fill('2026-02-01');
  await expect(
    card.getByText('The start date must be on or before the end date.'),
  ).toBeVisible();
  await expect(card.getByRole('button', { name: 'Download' })).toBeDisabled();
});
