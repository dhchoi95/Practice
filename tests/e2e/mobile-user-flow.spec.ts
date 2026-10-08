import { expect, test } from '@playwright/test';
import {
  createApiFixture,
  db,
  removeApiFixture,
  type ApiFixture,
} from '../helpers/api-fixture';

let fixture: ApiFixture;
const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

test.describe('owner workflow on a 360px phone viewport', () => {
  test.beforeEach(async () => {
    fixture = await createApiFixture();
  });
  test.afterEach(async () => {
    if (fixture) await removeApiFixture(fixture);
  });
  test.afterAll(async () => {
    await db.end();
  });

  test('logs in, records a sale and stock receipt, books a table, reports a repair, and returns to the dashboard', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/login');
    await page.getByLabel('이메일').fill(fixture.owner.email);
    await page.getByLabel('비밀번호').fill(fixture.password);
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL(new RegExp(`/${fixture.storeId}/dashboard$`));
    await expect(
      page.getByRole('heading', { name: '매장의 하루, 한눈에' }),
    ).toBeVisible();

    await page.getByRole('link', { name: '매출' }).click();
    await page.getByLabel('영업일').fill(seoulToday());
    await page.getByLabel('판매수량 (개)').fill('20');
    await page.getByLabel('판매단가 (원)').fill('10000');
    await page.getByLabel('하루 할인 합계 (원)').fill('0');
    await page.getByRole('button', { name: '판매 확정하기' }).click();
    await expect(page.getByRole('status')).toContainText(
      '판매와 재고를 반영했습니다.',
    );

    await page.getByRole('link', { name: '재고' }).click();
    const inventory = page.getByRole('table').first();
    await expect(inventory).toContainText(/80(?:\.0+)? 개/);

    await page.getByRole('link', { name: '발주' }).click();
    await expect(
      page.getByText('60 개', { exact: false }).first(),
    ).toBeVisible();
    const purchaseForm = page.getByTestId('purchase-form');
    await purchaseForm.getByLabel('공급업체').selectOption(fixture.supplierId);
    await purchaseForm
      .locator('select[name="ingredientId"]')
      .selectOption(fixture.ingredientIds.poStock);
    await purchaseForm.getByLabel('발주 수량').fill('60');
    await purchaseForm.getByLabel('기본 단위당 발주단가 (원)').fill('100');
    await purchaseForm.getByRole('button', { name: '초안 저장' }).click();
    await expect(page.getByRole('status')).toContainText(
      '발주 초안을 만들었습니다.',
    );
    await page.getByRole('button', { name: '발주 확정' }).click();
    await expect(page.getByText('발주 완료')).toBeVisible();
    await page.getByRole('button', { name: '입고 기록' }).click();
    await page.getByLabel('이번 입고 수량').fill('60');
    await page.getByRole('button', { name: '입고 반영' }).click();
    await expect(page.getByRole('status')).toContainText(
      '입고와 재고를 반영했습니다.',
    );

    await page.getByRole('link', { name: '예약' }).click();
    await page.getByLabel('고객명').fill(`E2E ${fixture.suffix.slice(0, 8)}`);
    await page.getByLabel('예약 날짜').fill(seoulToday());
    await page.getByLabel('시작 시간').fill('18:00');
    await page.getByLabel('종료 시간 (미입력 시 90분)').fill('19:00');
    await page.getByLabel('인원수').fill('2');
    await page.locator('select[name="tableId"]').selectOption(fixture.tableId);
    await page.getByRole('button', { name: '저장' }).first().click();
    await expect(page.getByRole('status')).toContainText(
      '예약을 등록했습니다.',
    );

    await page.getByRole('link', { name: '시설' }).click();
    await page
      .getByLabel('문제 요약')
      .fill(`E2E repair ${fixture.suffix.slice(0, 8)}`);
    await page.getByLabel('상세 내용').fill('모바일 흐름 점검');
    await page
      .getByTestId('maintenance-form')
      .getByRole('button', { name: '저장' })
      .click();
    await expect(page.getByRole('status')).toContainText(
      '시설 이상을 접수했습니다.',
    );
    await page.getByLabel('상태').selectOption('COMPLETED');
    await page.getByLabel('완료 수리비 (원)').fill('50000');
    await page
      .getByTestId('repair-completion-form')
      .getByRole('button', { name: '저장' })
      .click();
    await expect(page.getByRole('status')).toContainText(
      '시설 작업을 반영했습니다.',
    );
    await expect(page.getByText('수리비 50,000원')).toBeVisible();

    await page.getByRole('link', { name: '대시보드' }).click();
    await expect(
      page.getByRole('heading', { name: '매장의 하루, 한눈에' }),
    ).toBeVisible();
    await expect(page.getByText('200,000원').first()).toBeVisible();
    const viewport = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(viewport.width).toBe(360);
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width);
    await page.setViewportSize({ width: 1440, height: 900 });
    const desktop = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(desktop.width).toBe(1440);
    expect(desktop.scrollWidth).toBeLessThanOrEqual(desktop.width);
  });
});
