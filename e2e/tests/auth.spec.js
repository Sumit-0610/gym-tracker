// Authentication: the "Authentication" section of the old manual checklist.
const { test, expect } = require('@playwright/test');
const { PASSWORD, uniqueName, signUp } = require('./helpers');

test('logged-out visitors are sent to the login page', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/history');
  await expect(page).toHaveURL(/\/login$/);
});

test('sign up, stay signed in across a refresh, log out and back in', async ({
  page,
}) => {
  const username = await signUp(page);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('0 workouts')).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole('heading', { level: 1, name: username }),
  ).toBeVisible();

  await page.getByRole('button', { name: `Log out ${username}` }).click();
  await expect(page).toHaveURL(/\/login$/);
  const me = await page.request.get('/api/me');
  expect(me.status()).toBe(401);

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: username }),
  ).toBeVisible();
});

test('a wrong password is rejected', async ({ page }) => {
  const username = await signUp(page);
  await page.getByRole('button', { name: `Log out ${username}` }).click();

  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill('not-the-password');
  await page.getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Invalid username or password.',
  );
  await expect(page).toHaveURL(/\/login$/);
});

test('signup validates input and rejects a taken username', async ({
  browser,
  page,
}) => {
  await page.goto('/signup');
  await page.getByLabel('Username').fill(uniqueName());
  await page.getByLabel('Password').fill('123');
  await page.getByRole('button', { name: 'Sign up' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Password must be at least 6 characters.',
  );

  // Take a name in one browser context, then try to reuse it in another.
  const username = await signUp(page);
  const other = await browser.newPage();
  await other.goto('/signup');
  await other.getByLabel('Username').fill(username);
  await other.getByLabel('Password').fill(PASSWORD);
  await other.getByRole('button', { name: 'Sign up' }).click();
  await expect(other.getByRole('alert')).toHaveText(
    'That username is already taken.',
  );
  await other.close();
});
