import { test, expect } from '@playwright/test';
test('fleet console renders all servers', async ({ page }) => { await page.goto('/'); await expect(page.getByRole('heading',{name:'Fleet Health Console'})).toBeVisible(); await expect(page.locator('.server')).toHaveCount(4); });
