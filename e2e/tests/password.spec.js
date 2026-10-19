// Forgot password and the account email. The test server has no email
// provider, so the full emailed-link flow is covered by the server's smoke
// test instead; here we check the screens and what they say.
const { test, expect } = require('@playwright/test');
const { signUp } = require('./helpers');

test('add, change and remove the account email in Settings', async ({
  page,
}) => {
  const username = await signUp(page);
  await page.goto('/settings');
  const field = page.getByLabel('Email address');
  await expect(field).toHaveValue('');

  await field.fill(`${username}@Example.com`);
  await page.getByRole('button', { name: 'Save email' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  // Stored lowercased, and still there after a refresh.
  await page.reload();
  await expect(page.getByLabel('Email address')).toHaveValue(
    `${username}@example.com`,
  );

  await page.getByLabel('Email address').fill('not-an-email');
  await page.getByRole('button', { name: 'Save email' }).click();
  await expect(page.getByText('Enter a valid email address.')).toBeVisible();

  await page.getByLabel('Email address').fill('');
  await page.getByRole('button', { name: 'Remove email' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved.');
});

test('login links to forgot password, which explains when email is off', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);

  await page.getByLabel('Email').fill('someone@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Password reset by email is not set up on this server.',
  );
});

test('a bad or missing reset link is refused', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(
    page.getByText('This page needs the link from your reset email.'),
  ).toBeVisible();

  await page.goto(`/reset-password?token=${'a'.repeat(64)}`);
  await page.getByLabel('New password', { exact: true }).fill('newpass1');
  await page.getByLabel('Confirm new password').fill('newpass2');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'The two passwords do not match.',
  );

  await page.getByLabel('Confirm new password').fill('newpass1');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'This reset link is invalid or has expired.',
  );
});
