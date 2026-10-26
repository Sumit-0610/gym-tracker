// Tapping an exercise photo opens it big in a pop-up, and every way of
// closing it works: the × button, Escape, a tap outside, and phone Back.
const { test, expect } = require('@playwright/test');
const { signUp } = require('./helpers');

async function openFirstPhoto(page) {
  await page
    .getByRole('button', { name: /^Enlarge photo of / })
    .first()
    .click();
  const viewer = page.getByRole('dialog');
  await expect(viewer).toBeVisible();
  await expect(viewer.getByRole('img')).toBeVisible();
  return viewer;
}

// Closing also steps back over the history entry the viewer added. Wait for
// that before the next action, as a person naturally would.
async function expectClosed(page, viewer) {
  await expect(viewer).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.history.state?.imageViewer ?? null))
    .toBeNull();
}

test('an exercise photo opens big and closes with ×, Escape or a tap outside', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/exercises');

  let viewer = await openFirstPhoto(page);
  // Shown much bigger than the 96px thumbnail.
  const box = await viewer.getByRole('img').boundingBox();
  expect(box.width).toBeGreaterThan(300);
  await viewer.getByRole('button', { name: 'Close photo' }).click();
  await expectClosed(page, viewer);

  viewer = await openFirstPhoto(page);
  await page.keyboard.press('Escape');
  await expectClosed(page, viewer);

  viewer = await openFirstPhoto(page);
  await page.mouse.click(5, 5);
  await expectClosed(page, viewer);
  await expect(page).toHaveURL(/\/exercises$/);
});

test('Back closes the photo without leaving the page', async ({ page }) => {
  await signUp(page);
  await page.goto('/exercises');
  const viewer = await openFirstPhoto(page);
  await page.goBack();
  await expectClosed(page, viewer);
  await expect(page).toHaveURL(/\/exercises$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Exercises');
});

test('the exercise page and suggested plans open photos too', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/exercises');
  await page.locator('.exercise-name').first().click();
  let viewer = await openFirstPhoto(page);
  await viewer.getByRole('button', { name: 'Close photo' }).click();
  await expectClosed(page, viewer);

  await page.goto('/routines/plans');
  await page.locator('a[href^="/routines/plans/"]').first().click();
  viewer = await openFirstPhoto(page);
  await page.keyboard.press('Escape');
  await expectClosed(page, viewer);
});
