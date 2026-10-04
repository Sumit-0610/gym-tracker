const { expect } = require('@playwright/test');

const PASSWORD = 'secret123';

/** A username no other test (or earlier run on a reused DB) has taken. */
function uniqueName(prefix = 'user') {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * Sign up through the UI and wait for the dashboard.
 * @param {import('@playwright/test').Page} page
 */
async function signUp(page, username = uniqueName()) {
  await page.goto('/signup');
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: username }),
  ).toBeVisible();
  return username;
}

/**
 * Start a freestyle workout from /workout and wait for the session screen.
 * @param {import('@playwright/test').Page} page
 */
async function startFreestyle(page) {
  await page.goto('/workout');
  const freestyle = page.getByRole('radio', { name: /Freestyle/ });
  // With no routines, freestyle is the only option and the radios are hidden.
  if (await freestyle.isVisible()) await freestyle.check();
  await page.getByRole('button', { name: 'Start freestyle workout' }).click();
  await expect(page).toHaveURL(/\/workout\/\d+$/);
  await expect(
    page.getByRole('heading', { level: 1, name: 'Freestyle workout' }),
  ).toBeVisible();
}

/**
 * Fill and submit the "Log a set" form, then wait for the set to be listed.
 * @param {import('@playwright/test').Page} page
 * @param {{ exercise?: string, reps: number, weight: number }} set
 */
async function logSet(page, { exercise, reps, weight }) {
  const form = page.locator('form.set-form');
  if (exercise) {
    await form.getByLabel('Exercise').selectOption({ label: exercise });
  }
  await form.getByLabel('Reps').fill(String(reps));
  await form.getByLabel(/^Weight/).fill(String(weight));
  const logged = page.locator('.ws-logged li.set-row');
  const before = await logged.count();
  await form.getByRole('button', { name: 'Log set' }).click();
  await expect(logged).toHaveCount(before + 1);
}

/**
 * Finish the current workout and dismiss the celebration.
 * @param {import('@playwright/test').Page} page
 */
async function finishWorkout(page) {
  await page.getByRole('button', { name: 'Finish workout' }).click();
  const dialog = page.getByRole('dialog', { name: 'Workout complete' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'See it in history' }).click();
  await expect(page).toHaveURL(/\/history\/\d+$/);
}

module.exports = {
  PASSWORD,
  uniqueName,
  signUp,
  startFreestyle,
  logSet,
  finishWorkout,
};
