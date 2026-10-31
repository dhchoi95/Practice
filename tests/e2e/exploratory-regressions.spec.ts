import { test, expect, type Page } from '@playwright/test';
import { switchReading } from './helpers/reading';

async function enter(page: Page, route: string, year = '1974', month = '3', day = '19') {
  await page.goto(`/fortune/${route}/`);
  await page.locator('#year').fill(year);
  await page.locator('#month').selectOption(month);
  await page.locator('#day').fill(day);
  await page.locator('main button[type=submit]').click();
  await expect(page.locator('.natal-table')).toBeVisible();
}

test('future selected date and year use the selected period in all six bodies', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-30T03:00:00Z'));
  await enter(page, 'date');
  await page.getByLabel('운세를 볼 날짜', { exact: true }).fill('2027-02-14');
  await expect(page.locator('.sector-body')).toHaveCount(6);
  await expect(page.locator('.sector-bodies')).not.toContainText(/오늘|내일|올해/);
  await switchReading(page, '신년운세');
  await page.getByLabel('운세를 볼 연도', { exact: true }).selectOption('2028');
  await expect(page.locator('.sector-body')).toHaveCount(6);
  await expect(page.locator('.sector-bodies')).not.toContainText(/오늘|내일|올해/);
});

test('unknown time on a DST transition leaves the day and scores unresolved', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-30T03:00:00Z'));
  await enter(page, 'day', '1987', '6', '1');
  await expect(page.locator('.natal-table [data-pillar="day"][data-row="stem"]')).toContainText('미확정');
  await expect(page.locator('[data-testid="radar-shape"]')).toHaveCount(0);
  await expect(page.locator('.sector-body')).toHaveCount(6);
  expect(await page.locator('.sector-body').evaluateAll(els => els.map(el => el.getAttribute('data-score')))).toEqual(Array(6).fill('null'));
});

test('new-year result explains the 2051 support limit', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2050-12-31T03:00:00Z'));
  await enter(page, 'saju');
  await expect(page.locator('main')).toContainText('2050');
  await expect(page.locator('main')).toContainText('2051');
  await expect(page.getByLabel('운세를 볼 연도', { exact: true })).toHaveValue('2050');
  await page.getByLabel('운세를 볼 연도', { exact: true }).selectOption('2049');
  await expect(page.locator('main')).not.toContainText('2051년은 지원하지 않아');
  await expect(page.locator('main')).toContainText('2049년 신년운세');
});
