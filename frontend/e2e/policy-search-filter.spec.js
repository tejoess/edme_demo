const { test, expect } = require('@playwright/test');

// The backend is mocked, so this runs without Postgres or FastAPI, same
// convention as e2e/login.spec.js.

const CATALOG_FIXTURE = [
  { id: 1, provider_id: 1, policy_type: 'health', title: 'Health Shield Plan', coverage: 'Hospitalisation', premium: 500, term_months: 12, deductible: 1000, tnc_url: '' },
  { id: 2, provider_id: 1, policy_type: 'auto', title: 'Auto Secure Plan', coverage: 'Collision', premium: 300, term_months: 12, deductible: 500, tnc_url: '' },
];

const USERPOLICIES_FIXTURE = [
  { id: 1, policy_id: 1, policy_number: 'POL-12345', title: 'Health Shield Plan', policy_type: 'health', status: 'active', premium: 500, start_date: '2024-01-01', end_date: '2025-01-01', auto_renew: true },
  { id: 2, policy_id: 2, policy_number: 'POL-67890', title: 'Auto Secure Plan', policy_type: 'auto', status: 'expired', premium: 300, start_date: '2023-01-01', end_date: '2024-01-01', auto_renew: false },
];

async function login(page) {
  await page.route('**/login', (route) =>
    route.request().postDataJSON().password === 'Correct123'
      ? route.fulfill({ json: { access_token: 't', token_type: 'bearer', user_id: 1, email: 'u@example.com', is_admin: false } })
      : route.fulfill({ status: 401, json: { detail: 'Invalid email or password' } }));
  await page.route('**/policies', (route) => route.fulfill({ json: CATALOG_FIXTURE }));
  await page.route('**/userpolicies/', (route) => route.fulfill({ json: USERPOLICIES_FIXTURE }));

  await page.goto('/');
  await page.getByPlaceholder('you@example.com').fill('u@example.com');
  await page.getByPlaceholder('Your password').fill('Correct123');
  await page.getByRole('button', { name: /log in/i }).first().click();
}

test.describe('Policy search and filter -- TC-016 / TC-017 (AC-007)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('TC-016 (Policies catalog): search/filter bar renders without horizontal overflow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Insurance Policies' })).toBeVisible();

    const searchBar = page.getByRole('textbox', { name: /search/i });
    await expect(searchBar).toBeVisible();

    const shellBox = await page.locator('.page-content').boundingBox();
    const barBox = await searchBar.boundingBox();
    expect(barBox.x + barBox.width).toBeLessThanOrEqual(shellBox.x + shellBox.width + 1);

    await page.screenshot({ path: 'test-results/policy-search-filter-catalog.png' });
  });

  test('TC-016 (My Policies): search/filter bar renders without horizontal overflow', async ({ page }) => {
    await page.getByRole('button', { name: 'My Policies' }).click();
    await expect(page.getByRole('heading', { name: 'My Policies' })).toBeVisible();

    const searchBar = page.getByRole('textbox', { name: /search/i });
    await expect(searchBar).toBeVisible();

    const shellBox = await page.locator('.page-content').boundingBox();
    const barBox = await searchBar.boundingBox();
    expect(barBox.x + barBox.width).toBeLessThanOrEqual(shellBox.x + shellBox.width + 1);

    await page.screenshot({ path: 'test-results/policy-search-filter-mypolicies.png' });
  });

  test('TC-017 (Policies catalog): search, filter, clear end-to-end flow', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Insurance Policies' })).toBeVisible();

    await page.getByRole('textbox', { name: /search/i }).fill('shield');
    await expect(page.getByText('Health Shield Plan')).toBeVisible();
    await expect(page.getByText('Auto Secure Plan')).not.toBeVisible();

    await page.getByRole('button', { name: /clear/i }).click();
    await expect(page.getByText('Health Shield Plan')).toBeVisible();
    await expect(page.getByText('Auto Secure Plan')).toBeVisible();
  });

  test('TC-017 (My Policies): search, filter, clear end-to-end flow', async ({ page }) => {
    await page.getByRole('button', { name: 'My Policies' }).click();
    await expect(page.getByRole('heading', { name: 'My Policies' })).toBeVisible();

    await page.getByRole('textbox', { name: /search/i }).fill('12345');
    await expect(page.getByText(/POL-12345/)).toBeVisible();
    await expect(page.getByText(/POL-67890/)).not.toBeVisible();

    await page.getByRole('button', { name: /clear/i }).click();
    await expect(page.getByText(/POL-12345/)).toBeVisible();
    await expect(page.getByText(/POL-67890/)).toBeVisible();
  });
});
