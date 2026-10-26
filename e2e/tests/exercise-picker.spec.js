// The exercise picker on the "Log a set" form shows a photo next to every
// exercise, can be searched, and closes with phone Back without leaving.
const { test, expect } = require('@playwright/test');
const { signUp, startFreestyle, pickExercise } = require('./helpers');

test('the exercise picker shows photos, searches, and picks', async ({
  page,
}) => {
  await signUp(page);
  await startFreestyle(page);
  const form = page.locator('form.set-form');

  await form.getByLabel('Exercise').click();
  const picker = page.getByRole('dialog', { name: 'Choose an exercise' });
  await expect(picker).toBeVisible();

  // Grouped by muscle, with a loaded photo on the rows.
  await expect(picker.getByRole('heading', { name: 'Back' })).toBeVisible();
  const firstPhoto = picker.locator('img.exercise-pick-thumb').first();
  await expect(firstPhoto).toBeVisible();
  await expect
    .poll(() => firstPhoto.evaluate((img) => img.naturalWidth))
    .toBeGreaterThan(0);

  // Search narrows the list; Enter picks the first match and does not
  // submit the set form behind it.
  await picker.getByLabel('Search exercises').fill('chin');
  await expect(
    picker.getByRole('button', { name: 'Chin-Up', exact: true }),
  ).toBeVisible();
  await expect(
    picker.getByRole('button', { name: 'Barbell Row', exact: true }),
  ).toHaveCount(0);
  await picker.getByLabel('Search exercises').press('Enter');
  await expect(picker).toBeHidden();
  await expect(form.getByLabel('Exercise')).toHaveText(/Chin-Up/);
  await expect(form.locator('img.exercise-pick-thumb')).toBeVisible();
  await expect(form.getByRole('alert')).toHaveCount(0);

  // Picking from the list directly works too.
  await pickExercise(page, form, 'Barbell Row');
  await expect(form.getByLabel('Exercise')).toHaveText(/Barbell Row/);
});

test('Back closes the exercise picker without leaving the workout', async ({
  page,
}) => {
  await signUp(page);
  await startFreestyle(page);
  const url = page.url();
  await page.locator('form.set-form').getByLabel('Exercise').click();
  const picker = page.getByRole('dialog', { name: 'Choose an exercise' });
  await expect(picker).toBeVisible();
  await page.goBack();
  await expect(picker).toBeHidden();
  expect(page.url()).toBe(url);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Freestyle workout' }),
  ).toBeVisible();
});
