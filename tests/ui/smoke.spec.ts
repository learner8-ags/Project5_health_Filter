import { test, expect } from '@playwright/test';

test('fleet console renders all servers with controls', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Fleet Health Console' })).toBeVisible();
  await expect(page.getByLabel('Health')).toBeVisible();
  await expect(page.getByLabel('Search name or model')).toBeVisible();
  await expect(page.getByTestId('server-row')).toHaveCount(4);
  await expect(page.locator('#summary')).toHaveText('4 of 4 servers');
});

test('health filter options narrow the visible rows', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Health').selectOption('Warning');
  await expect(page.getByTestId('server-row')).toHaveCount(1);
  await expect(page.getByText('edge-02')).toBeVisible();
  await expect(page.locator('#summary')).toHaveText('1 of 4 servers');

  await page.getByLabel('Health').selectOption('Critical');
  await expect(page.getByTestId('server-row')).toHaveCount(1);
  await expect(page.getByText('db-01')).toBeVisible();
  await expect(page.locator('#summary')).toHaveText('1 of 4 servers');
});

test('search and health filter combine, with accessible no-results state', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Search name or model').fill('dl380');
  await expect(page.getByTestId('server-row')).toHaveCount(2);
  await expect(page.locator('#summary')).toHaveText('2 of 4 servers');

  await page.getByLabel('Health').selectOption('OK');
  await expect(page.getByTestId('server-row')).toHaveCount(1);
  await expect(page.getByText('api-01')).toBeVisible();
  await expect(page.locator('#summary')).toHaveText('1 of 4 servers');

  await page.getByLabel('Search name or model').fill('no-such-server');
  await expect(page.getByTestId('server-row')).toHaveCount(0);
  await expect(page.locator('#summary')).toHaveText('0 of 4 servers');
  await expect(page.getByRole('status')).toHaveText('No matching servers found.');
});

test('controls are keyboard reachable and operable', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Health')).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByLabel('Health')).toHaveValue('OK');

  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Search name or model')).toBeFocused();
  await page.keyboard.type('db');
  await expect(page.getByTestId('server-row')).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('No matching servers found.');
});
