// Logging a workout: the "Workout", "Active workout refresh", "Completion" and
// "History" sections of the old manual checklist.
const { test, expect } = require('@playwright/test');
const { signUp, startFreestyle, logSet, finishWorkout } = require('./helpers');

test('log a freestyle workout, refresh mid-session, finish it', async ({
  page,
}) => {
  await signUp(page);
  await startFreestyle(page);

  await logSet(page, { exercise: 'Barbell Bench Press', reps: 8, weight: 60 });
  const rows = page.locator('.ws-logged li.set-row');
  await expect(rows.nth(0)).toContainText('Set 1');
  await expect(rows.nth(0)).toContainText('8 reps × 60 kg');

  // Exercise, reps and weight are kept, and the set number advances.
  await expect(
    page.getByText('Logging set 2 of Barbell Bench Press'),
  ).toBeVisible();
  await logSet(page, { reps: 7, weight: 62.5 });
  await expect(rows.nth(1)).toContainText('Set 2');
  await expect(rows.nth(1)).toContainText('7 reps × 62.5 kg');

  // A refresh rebuilds the session from the URL.
  await page.reload();
  await expect(rows).toHaveCount(2);

  // While unfinished, the start screen offers to resume it.
  const url = page.url();
  await page.goto('/workout');
  await page.getByRole('button', { name: 'Resume it' }).click();
  await expect(page).toHaveURL(url);

  await page.getByRole('button', { name: 'Finish workout' }).click();
  const dialog = page.getByRole('dialog', { name: 'Workout complete' });
  await expect(dialog).toContainText('2 sets');
  await dialog.getByRole('button', { name: 'See it in history' }).click();
  await expect(page).toHaveURL(/\/history\/\d+$/);
  await expect(page.getByText(/Finished/).first()).toBeVisible();
  await expect(page.getByText('8 reps × 60 kg')).toBeVisible();

  await page.goto('/history');
  await expect(page.getByText('Freestyle').first()).toBeVisible();
  await expect(page.getByText('2 sets')).toBeVisible();
  await expect(page.getByText('In progress')).toHaveCount(0);
});

test('invalid set input is caught before anything is sent', async ({
  page,
}) => {
  await signUp(page);
  await startFreestyle(page);
  const form = page.locator('form.set-form');

  await form.getByRole('button', { name: 'Log set' }).click();
  await expect(form.getByRole('alert')).toContainText('Choose an exercise.');

  await form.getByLabel('Exercise').selectOption({ label: 'Pull-Up' });
  await form.getByLabel('Reps').fill('0');
  await form.getByLabel(/^Weight/).fill('0');
  await form.getByRole('button', { name: 'Log set' }).click();
  await expect(form.getByRole('alert')).toContainText(
    'Reps must be a whole number above 0.',
  );
  await expect(page.getByText('No sets yet')).toBeVisible();

  // Weight 0 is valid and shows as bodyweight.
  await form.getByLabel('Reps').fill('10');
  await form.getByRole('button', { name: 'Log set' }).click();
  await expect(page.locator('.ws-logged li.set-row')).toContainText(
    '10 reps × bodyweight',
  );
  await finishWorkout(page);
});
