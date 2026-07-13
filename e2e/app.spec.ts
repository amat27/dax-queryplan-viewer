import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const fixture = path.join(root, 'fixtures', 'group-semijoin-queryplan.json');
const daxStudioFixture = path.join(root, 'fixtures', 'dax-studio-export.json');

test('renders the built-in logical and physical GroupSemiJoin plans', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('plan-panel-vp-logical')).toBeVisible();
  await expect(page.getByTestId('plan-panel-vp-physical')).toBeVisible();
  await expect(page.getByTestId('plan-panel-vp-logical').locator('.react-flow__node')).toHaveCount(7);
  await expect(page.getByTestId('plan-panel-vp-physical').locator('.react-flow__node')).toHaveCount(11);
  await expect(page.getByTestId('event-sidebar')).toContainText('Parsed without diagnostics');
});

test('brand mark is a custom plan-tree glyph, not a text wordmark', async ({ page }) => {
  await page.goto('/');
  const mark = page.locator('.brand-mark');
  await expect(mark.locator('svg')).toBeVisible();
  await expect(mark).not.toContainText('QP');
});

test('shows every non-empty column role on an operator card', async ({ page }) => {
  await page.goto('/');
  const logicalScan = page.getByTestId('plan-node-6-Scan_Vertipaq');
  await expect(logicalScan.locator('[title="DependOnCols"]')).toHaveText('DEPENDS');
  await expect(logicalScan.locator('[title="RequiredCols"]')).toHaveText('REQUIRED');
  await expect(logicalScan.getByRole('button', { name: 'Sales.ProductId' })).toHaveCount(2);

  const physicalLookup = page.getByTestId('plan-node-5-Spool_MultiValuedHashLookup');
  await expect(physicalLookup.locator('[title="IterCols"]')).toHaveText('ITER');
  await expect(physicalLookup.locator('[title="LookupCols"]')).toHaveText('LOOKUP');
});

test('refits cards when view mode and inspector resize the canvas', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('view-logical').click();
  await page.getByTestId('operator-title-6-Scan_Vertipaq').click();
  await expect(page.getByTestId('inspector')).toBeVisible();
  await expect.poll(async () => page.getByTestId('plan-node-6-Scan_Vertipaq').evaluate(
    (element) => element.getBoundingClientRect().width,
  )).toBeGreaterThan(200);
});

test('opens a DQPN JSON file and preserves the filename', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-file').click();
  await page.locator('input[type="file"]').setInputFiles(fixture);
  await expect(page.getByTestId('top-bar')).toContainText('group-semijoin-queryplan.json');
  await expect(page.getByTestId('plan-panel-vp-physical').locator('.react-flow__node')).toHaveCount(11);
});

test('opens a DAX Studio export object and renders both plans', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-file').click();
  await page.locator('input[type="file"]').setInputFiles(daxStudioFixture);
  await expect(page.getByTestId('top-bar')).toContainText('dax-studio-export.json');
  await expect(page.getByTestId('plan-panel-vp-logical').locator('.react-flow__node')).toHaveCount(4);
  await expect(page.getByTestId('plan-panel-vp-physical').locator('.react-flow__node')).toHaveCount(6);
  await expect(page.getByTestId('event-sidebar')).toContainText('DAX Studio');
});

test('shows the source DAX query from a DAX Studio export', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('open-query')).toHaveCount(0); // demo has no query
  await page.getByTestId('open-file').click();
  await page.locator('input[type="file"]').setInputFiles(daxStudioFixture);
  await page.getByTestId('open-query').click();
  await expect(page.getByTestId('query-dialog')).toBeVisible();
  await expect(page.getByTestId('query-text')).toContainText('SUMMARIZECOLUMNS');
});

test('the left sidebar can collapse and expand', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.event-sidebar')).not.toHaveClass(/collapsed/);
  await page.getByTestId('sidebar-collapse').click();
  await expect(page.locator('.event-sidebar')).toHaveClass(/collapsed/);
  await page.getByTestId('sidebar-expand').click();
  await expect(page.locator('.event-sidebar')).not.toHaveClass(/collapsed/);
  await expect(page.getByTestId('event-sidebar')).toContainText('Events');
});

test('shows a physical Constant value on the node', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-paste').click();
  await page.getByTestId('paste-input').fill('Constant: LookupPhyOp LogOp=Constant Integer 1\n');
  await page.getByTestId('parse-paste').click();
  await expect(page.getByTestId('plan-node-1-Constant')).toContainText('= 1');
});

test('searches both plans by column and centres the chosen operator', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('/');
  await expect(page.getByTestId('search-dialog')).toBeVisible();
  await page.getByTestId('search-input').fill('CityAndState');
  await expect(page.locator('[data-testid^="search-result-"]')).toHaveCount(3);
  await page.locator('[data-testid^="search-result-"]').filter({ hasText: 'Spool_MultiValuedHashLookup' }).click();
  await expect(page.getByTestId('inspector')).toContainText('Spool_MultiValuedHashLookup');
  await expect(page.getByTestId('inspector')).toContainText('LookupCols');
});

test('explains cache key-layout separately from lookup columns', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('operator-title-5-Spool_MultiValuedHashLookup').click();
  const inspector = page.getByTestId('inspector');
  await expect(inspector).toContainText('Customer');
  await expect(inspector).toContainText('#KeyCols');
  await expect(inspector).toContainText('Width of the cache key layout');
  await expect(inspector).toContainText('not the number of lookup');
  await expect(inspector).toContainText('Heuristic only');
});

test('column chips cross-highlight matching logical and physical nodes', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('plan-node-5-Spool_MultiValuedHashLookup').getByRole('button', { name: 'Customer.CityAndState' }).click();
  await expect(page.getByTestId('filter-bar')).toContainText('customer.cityandstate');
  const highlighted = page.locator('.react-flow__node').filter({ has: page.locator('.ring-cyan-400') });
  await expect(highlighted).toHaveCount(3);
});

test('supports raw-plan paste and reports that there is no physical event', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-paste').click();
  await page.getByTestId('paste-input').fill("OnlyRoot: RelLogOp DependOnCols()() 0-0 RequiredCols()()\n");
  await page.getByTestId('parse-paste').click();
  await expect(page.getByTestId('plan-panel-vp-logical').locator('.react-flow__node')).toHaveCount(1);
  await expect(page.getByText('No physical plan event')).toBeVisible();
  await expect(page.getByTestId('event-sidebar')).toContainText('Parsed as raw plan text');
});

test('shows a Constant DominantValue on the node but hides BLANK', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('open-paste').click();
  await page.getByTestId('paste-input').fill(
    "Order: RelLogOp DependOnCols()() 0-0 RequiredCols(0)('Sales'[ProductId])\n" +
    "\tConstant: ScaLogOp DependOnCols()() Integer DominantValue=501\n" +
    "\tCalculate: ScaLogOp DependOnCols(0)('Sales'[ProductId]) Integer DominantValue=BLANK\n",
  );
  await page.getByTestId('parse-paste').click();
  await expect(page.getByTestId('plan-node-2-Constant')).toContainText('= 501');
  await expect(page.getByTestId('plan-node-3-Calculate')).not.toContainText('BLANK');
});

test('serves an installable web app manifest with png icons', async ({ page, request }) => {
  await page.goto('/');

  const href = await page.locator('link[rel="manifest"]').first().getAttribute('href');
  expect(href).toBeTruthy();
  const theme = await page.locator('meta[name="theme-color"]').first().getAttribute('content');
  expect(theme).toBe('#0b1220');

  const response = await request.get(href!);
  expect(response.status()).toBe(200);
  const manifest = await response.json();
  expect(manifest.name).toBe('DAX Query Plan Viewer');
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/');
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
  const purposes = manifest.icons.map((icon: { purpose?: string }) => icon.purpose);
  expect(purposes).toContain('maskable');

  for (const icon of manifest.icons) {
    if (icon.type !== 'image/png') continue;
    const iconResponse = await request.get(icon.src);
    expect(iconResponse.status(), icon.src).toBe(200);
    expect((await iconResponse.body()).length).toBeGreaterThan(500);
  }

  const ico = await request.get('/favicon.ico');
  expect(ico.status()).toBe(200);
  expect((await ico.body()).length).toBeGreaterThan(500);
});

test('version badge opens the changelog with build info', async ({ page }) => {
  await page.goto('/');
  const badge = page.getByTestId('version-badge');
  await expect(badge).toHaveText(/^v\d+\.\d+\.\d+$/);
  await badge.click();
  const dialog = page.getByTestId('changelog-dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByTestId('changelog-version')).toHaveText(/^v\d+\.\d+\.\d+$/);
  await expect(dialog).toContainText("What's new");
  await expect(page.getByTestId('build-commit')).toContainText('commit');
});

test('does not create page-level overflow on a narrow viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const dimensions = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    height: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
  }));
  expect(dimensions.width).toBeLessThanOrEqual(dimensions.clientWidth);
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.clientHeight);
  await expect(page.getByTestId('plan-panel-vp-logical')).toBeVisible();
  await expect(page.getByTestId('plan-panel-vp-physical')).toBeVisible();
  await expect(page.locator('.event-card')).toHaveCount(2);
  await expect(page.locator('.event-card').first()).toBeVisible();
  await expect(page.locator('.event-card').last()).toBeVisible();
  await expect(page.locator('.react-flow__minimap').first()).toBeHidden();
});
