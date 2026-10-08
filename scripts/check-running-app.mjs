/** Verify the running development demo without changing its business records. */
import dotenv from 'dotenv';
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
dotenv.config({ quiet: true });
const origin = process.env.APP_URL;
if (!origin) throw new Error('APP_URL is required');
const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const errors = [];
try {
  await mkdir('artifacts', { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/login`);
  await page.screenshot({
    path: 'artifacts/login-desktop.png',
    fullPage: true,
  });
  await page.getByLabel('이메일').fill(process.env.DEMO_EMAIL);
  await page.getByLabel('비밀번호').fill(process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: '로그인' }).click();
  await page.waitForURL(/\/dashboard$/);
  const storeId = new URL(page.url()).pathname.split('/')[1];
  for (const section of [
    'dashboard',
    'sales',
    'inventory',
    'purchasing',
    'reservations',
    'facilities',
    'finance',
    'settings',
  ]) {
    await page.goto(`${origin}/${storeId}/${section}`);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForFunction(
      () =>
        !document.body.textContent.includes('매장 기록을 불러오고 있습니다'),
    );
    if (await page.locator('.notice.error[role="alert"]').count())
      throw new Error(
        `Owner screen failed: ${section}: ${await page.locator('.notice.error[role="alert"]').innerText()}`,
      );
    if (section === 'dashboard')
      await page.screenshot({
        path: 'artifacts/dashboard-desktop.png',
        fullPage: true,
      });
  }
  await page.setViewportSize({ width: 360, height: 800 });
  for (const section of ['dashboard', 'inventory']) {
    await page.goto(`${origin}/${storeId}/${section}`);
    await page.waitForFunction(
      () =>
        !document.body.textContent.includes('매장 기록을 불러오고 있습니다'),
    );
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.screenshot({
      path: `artifacts/${section}-mobile.png`,
      fullPage: true,
    });
    const fits = await page.evaluate(
      () =>
        document.documentElement.scrollWidth <=
        document.documentElement.clientWidth,
    );
    if (!fits) throw new Error(`Mobile overflow: ${section}`);
  }
  const staffContext = await browser.newContext({
    viewport: { width: 360, height: 800 },
  });
  const staff = await staffContext.newPage();
  await staff.goto(`${origin}/login`);
  await staff.getByLabel('이메일').fill(process.env.DEMO_STAFF_EMAIL);
  await staff.getByLabel('비밀번호').fill(process.env.DEMO_STAFF_PASSWORD);
  await staff.getByRole('button', { name: '로그인' }).click();
  await staff.waitForURL(/\/dashboard$/);
  await staff.waitForFunction(
    () => !document.body.textContent.includes('매장 기록을 불러오고 있습니다'),
  );
  for (const label of ['매출', '비용', '설정', '발주']) {
    if (await staff.getByRole('link', { name: label, exact: true }).count())
      throw new Error(`Staff navigation leak: ${label}`);
  }
  for (const route of ['menus', 'finance/summary', 'sales/daily']) {
    const status = await staff.evaluate(
      async (path) => (await fetch(path)).status,
      `/api/stores/${storeId}/${route}`,
    );
    if (status !== 403)
      throw new Error(`Staff API role boundary failed: ${route}`);
  }
  if (errors.length) throw new Error('Browser page errors occurred');
  console.log(
    'Production UI verified: 8 owner screens, mobile layout, owner/staff login and Staff role boundaries. Screenshots saved.',
  );
} finally {
  await browser.close();
}
