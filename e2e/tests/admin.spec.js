// Admin page. The test server has no email provider, so nobody can verify an
// email here and nobody is an admin: these tests check that the page stays
// shut, including for someone who just types the admin address into Settings.
const { test, expect } = require('@playwright/test');
const { signUp } = require('./helpers');

test('a regular user cannot open the admin page', async ({ page }) => {
  await signUp(page);
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0);
  await page.goto('/admin');
  await expect(page.getByText('This page is only for admins.')).toBeVisible();
});

test('saving the admin email without verifying it does not grant admin', async ({
  page,
}) => {
  await signUp(page);
  await page.goto('/settings');
  await page.getByLabel('Email address').fill('sumitjad36@gmail.com');
  await page.getByRole('button', { name: 'Save email' }).click();
  // Another run may already have saved it (one account per email).
  await expect(
    page.getByText(/Saved\.|already used by another account/),
  ).toBeVisible();
  await expect(page.getByText('Open the admin page')).toHaveCount(0);
  const res = await page.request.get('/api/admin/users');
  expect(res.status()).toBe(403);
});
