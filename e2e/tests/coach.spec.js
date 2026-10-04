// The rules-based coach: "suggested routine today", the next-set suggestion
// (double progression from last session) and the typo guard.
const { test, expect } = require('@playwright/test');
const { signUp, logSet, finishWorkout } = require('./helpers');

test('coach suggests a routine, then the next set from last session', async ({
  page,
}) => {
  await signUp(page);

  // A routine with one chest exercise, 3×12.
  await page.goto('/routines');
  await page.getByLabel('New routine').fill('Push Day');
  await page.getByRole('button', { name: 'Create routine' }).click();
  await page.getByRole('link', { name: /Push Day/ }).click();
  await page
    .getByLabel('Exercise')
    .selectOption({ label: 'Barbell Bench Press' });
  await page.getByLabel('Target sets').fill('3');
  await page.getByLabel('Target reps').fill('12');
  await page.getByRole('button', { name: 'Add to routine' }).click();
  await expect(page.getByText('3 sets × 12 reps')).toBeVisible();

  // Suggested today: the routine whose muscles have rested longest.
  await page.goto('/workout');
  const recommend = page.locator('.ws-recommend');
  await expect(
    recommend.getByRole('heading', { name: 'Push Day' }),
  ).toBeVisible();
  await expect(recommend).toContainText(
    'Longest rest: Chest (not trained yet)',
  );
  await recommend.getByRole('button', { name: 'Start Push Day' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Push Day' }),
  ).toBeVisible();

  // First session: nothing to build on, so no suggestion yet.
  await page.getByRole('button', { name: /Barbell Bench Press/ }).click();
  const form = page.locator('form.set-form');
  await expect(form.getByLabel('Exercise')).toHaveValue(/\d+/);
  await expect(
    form.getByText('Logging set 1 of Barbell Bench Press'),
  ).toBeVisible();
  await expect(form.locator('.set-form-suggest')).toHaveCount(0);

  // Typo guard: an absurd rep count asks before logging.
  await form.getByLabel('Reps').fill('150');
  await form.getByLabel(/^Weight/).fill('50');
  await form.getByRole('button', { name: 'Log set' }).click();
  await expect(form.getByRole('alert')).toContainText(
    '150 reps is a lot — is that right?',
  );
  await form.getByRole('button', { name: 'Change it' }).click();
  await expect(page.getByText('No sets yet')).toBeVisible();

  for (let i = 0; i < 3; i++) {
    await logSet(page, { reps: 12, weight: 50 });
  }
  await finishWorkout(page);

  // Second session: every set hit 12 reps, so add load and drop to 8 reps.
  await page.goto('/workout');
  await page
    .locator('.ws-recommend')
    .getByRole('button', { name: 'Start Push Day' })
    .click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Push Day' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /Barbell Bench Press/ }).click();

  await expect(form.locator('.set-form-previous')).toContainText(
    '12 × 50 kg · 12 × 50 kg · 12 × 50 kg',
  );
  const suggest = form.locator('.set-form-suggest');
  await expect(suggest).toContainText('8 × 52.5 kg');
  await expect(suggest).toContainText(
    'All your sets hit 12 reps, so add a little weight',
  );
  await suggest.click();
  await expect(form.getByLabel('Reps')).toHaveValue('8');
  await expect(form.getByLabel(/^Weight/)).toHaveValue('52.5');

  const rows = page.locator('.ws-logged li.set-row');
  await form.getByRole('button', { name: 'Log set' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.nth(0)).toContainText('8 reps × 52.5 kg');

  // Typo guard against last session: 200 kg is over 3× last time's 50 kg.
  await form.getByLabel(/^Weight/).fill('200');
  await form.getByRole('button', { name: 'Log set' }).click();
  await expect(form.getByRole('alert')).toContainText(
    '200 kg is more than 3× the 50 kg you lifted last time — is that right?',
  );
  await form.getByRole('button', { name: 'Log anyway' }).click();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(1)).toContainText('8 reps × 200 kg');
});
