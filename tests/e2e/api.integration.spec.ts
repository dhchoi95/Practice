import {
  expect,
  request,
  test,
  type APIRequestContext,
} from '@playwright/test';
import { createHash, randomUUID } from 'node:crypto';
import {
  createApiFixture,
  db,
  inventoryLedger,
  inventoryQuantity,
  inventoryVersion,
  removeApiFixture,
  type ApiFixture,
} from '../helpers/api-fixture';

const baseURL = process.env.TEST_BASE_URL ?? 'http://127.0.0.1:3100';
let fixture: ApiFixture;
let ownerApi: APIRequestContext;
let staffApi: APIRequestContext;
let otherApi: APIRequestContext;
let invitedEmail: string | undefined;
const seoulToday = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
const seoulTomorrow = () => {
  const [year, month, day] = seoulToday().split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
};

async function authenticatedContext(email: string, password: string) {
  const api = await request.newContext({
    baseURL,
    extraHTTPHeaders: { Origin: baseURL },
  });
  const response = await api.post('/api/auth/login', {
    data: { email, password },
  });
  expect(response.status(), `login ${email}`).toBe(200);
  const cookie = response.headers()['set-cookie'];
  expect(cookie).toContain('restaurant_session=');
  expect(cookie?.toLowerCase()).toContain('httponly');
  expect(cookie?.toLowerCase()).toContain('samesite=lax');
  return api;
}

test.describe('PostgreSQL-backed API invariants', () => {
  test.beforeEach(async () => {
    fixture = await createApiFixture();
    ownerApi = await authenticatedContext(
      fixture.owner.email,
      fixture.password,
    );
    staffApi = await authenticatedContext(
      fixture.staff.email,
      fixture.password,
    );
    otherApi = await authenticatedContext(
      fixture.otherOwner.email,
      fixture.password,
    );
  });

  test.afterEach(async () => {
    await ownerApi?.dispose();
    await staffApi?.dispose();
    await otherApi?.dispose();
    if (fixture) await removeApiFixture(fixture);
    if (invitedEmail)
      await db.query(`DELETE FROM "User" WHERE email=$1`, [invitedEmail]);
    invitedEmail = undefined;
  });

  test('enforces active membership, role boundaries, and cross-store isolation', async () => {
    const inventoryPath = `/api/stores/${fixture.storeId}/inventory`;
    expect((await ownerApi.get(inventoryPath)).status()).toBe(200);
    const staffInventory = (await (
      await staffApi.get(inventoryPath)
    ).json()) as Array<Record<string, unknown>>;
    expect(staffInventory.every((row) => !('unitCost' in row))).toBe(true);
    expect(
      (
        await staffApi.get(`/api/stores/${fixture.storeId}/sales/daily`)
      ).status(),
    ).toBe(403);
    expect((await otherApi.get(inventoryPath)).status()).toBe(401);
    expect(
      (
        await ownerApi.get(`/api/stores/${fixture.otherStoreId}/inventory`)
      ).status(),
    ).toBe(401);

    const cookieValue = (await ownerApi.storageState()).cookies.find(
      (cookie) => cookie.name === 'restaurant_session',
    )?.value;
    expect(cookieValue).toBeTruthy();
    const noOrigin = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Cookie: `restaurant_session=${cookieValue}` },
    });
    const missingOrigin = await noOrigin.post(inventoryPath, {
      data: {
        ingredientId: fixture.ingredientIds.countStock,
        quantityDelta: '1',
        type: 'RECEIPT',
        reason: 'csrf check',
        idempotencyKey: `csrf-${fixture.suffix}`,
      },
    });
    expect(missingOrigin.status()).toBe(403);
    await noOrigin.dispose();
    const wrongOrigin = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Cookie: `restaurant_session=${cookieValue}`,
        Origin: 'https://untrusted.example',
      },
    });
    expect(
      (
        await wrongOrigin.post(inventoryPath, {
          data: {
            ingredientId: fixture.ingredientIds.countStock,
            quantityDelta: '1',
            type: 'RECEIPT',
            reason: 'csrf check',
            idempotencyKey: `bad-origin-${fixture.suffix}`,
          },
        })
      ).status(),
    ).toBe(403);
    await wrongOrigin.dispose();

    const crossStoreMutation = await ownerApi.post(inventoryPath, {
      data: {
        ingredientId: fixture.ingredientIds.other,
        quantityDelta: '10',
        type: 'RECEIPT',
        reason: 'tenant boundary',
        idempotencyKey: `cross-${fixture.suffix}`,
      },
    });
    expect([400, 403, 404]).toContain(crossStoreMutation.status());

    expect(
      (
        await ownerApi.patch(`/api/stores/${fixture.storeId}/members`, {
          data: { id: fixture.ownerMemberId, role: 'STAFF' },
        })
      ).status(),
    ).toBe(409);

    await db.query(`UPDATE "StoreMember" SET active=false WHERE id=$1`, [
      fixture.ownerMemberId,
    ]);
    expect((await ownerApi.get(inventoryPath)).status()).toBe(401);
    expect(await (await ownerApi.get('/api/me/stores')).json()).toEqual([]);
    await db.query(`UPDATE "StoreMember" SET active=true WHERE id=$1`, [
      fixture.ownerMemberId,
    ]);
    await db.query(`UPDATE "User" SET active=false WHERE id=$1`, [
      fixture.owner.id,
    ]);
    expect((await ownerApi.get(inventoryPath)).status()).toBe(401);
    await db.query(`UPDATE "User" SET active=true WHERE id=$1`, [
      fixture.owner.id,
    ]);

    const staffCount = await staffApi.post(inventoryPath, {
      data: {
        ingredientId: fixture.ingredientIds.countStock,
        quantityDelta: '1500',
        type: 'COUNT',
        reason: 'not allowed for staff',
        idempotencyKey: `staff-count-${fixture.suffix}`,
      },
    });
    expect(staffCount.status()).toBe(403);
  });

  test('stores invitation token hashes, accepts once before expiry, and applies its current role', async () => {
    invitedEmail = `invited-${fixture.suffix}@test.invalid`;
    const inviteResponse = await ownerApi.post(
      `/api/stores/${fixture.storeId}/invitations`,
      { data: { email: invitedEmail, role: 'STAFF' } },
    );
    expect(inviteResponse.status()).toBe(201);
    const invite = await inviteResponse.json();
    const stored = await db.query<{
      tokenHash: string;
      acceptedAt: Date | null;
    }>(`SELECT "tokenHash","acceptedAt" FROM "StoreInvitation" WHERE id=$1`, [
      invite.id,
    ]);
    const expectedHash = createHash('sha256')
      .update(invite.token)
      .digest('hex');
    expect(stored.rows[0].tokenHash).toBe(expectedHash);
    expect(stored.rows[0].tokenHash).not.toBe(invite.token);

    const password = `invite-password-${fixture.suffix}`;
    const acceptApi = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Origin: baseURL },
    });
    const accepted = await acceptApi.post('/api/auth/invitations/accept', {
      data: { token: invite.token, password, name: 'Invited Staff' },
    });
    expect(accepted.status()).toBe(200);
    expect(
      (
        await acceptApi.post('/api/auth/invitations/accept', {
          data: { token: invite.token, password, name: 'Invited Staff' },
        })
      ).status(),
    ).toBe(400);

    const invitedApi = await authenticatedContext(invitedEmail, password);
    const stores = (await (
      await invitedApi.get('/api/me/stores')
    ).json()) as Array<{ role: string; store: { id: string } }>;
    expect(stores).toContainEqual(
      expect.objectContaining({
        role: 'STAFF',
        store: expect.objectContaining({ id: fixture.storeId }),
      }),
    );
    await invitedApi.dispose();

    const expiredEmail = `expired-${fixture.suffix}@test.invalid`;
    const expiredInviteResponse = await ownerApi.post(
      `/api/stores/${fixture.storeId}/invitations`,
      { data: { email: expiredEmail, role: 'STAFF' } },
    );
    const expiredInvite = await expiredInviteResponse.json();
    await db.query(
      `UPDATE "StoreInvitation" SET "expiresAt"=NOW()-INTERVAL '1 minute' WHERE id=$1`,
      [expiredInvite.id],
    );
    expect(
      (
        await acceptApi.post('/api/auth/invitations/accept', {
          data: { token: expiredInvite.token, password, name: 'Expired Staff' },
        })
      ).status(),
    ).toBe(400);
    await acceptApi.dispose();
  });

  test('rate limits repeated failed login attempts without locking other test credentials', async () => {
    const loginApi = await request.newContext({
      baseURL,
      extraHTTPHeaders: {
        Origin: baseURL,
        'X-Forwarded-For': `test-${fixture.suffix}`,
      },
    });
    for (let i = 0; i < 8; i += 1) {
      expect(
        (
          await loginApi.post('/api/auth/login', {
            data: {
              email: `missing-${fixture.suffix}@test.invalid`,
              password: 'wrong',
            },
          })
        ).status(),
      ).toBe(401);
    }
    expect(
      (
        await loginApi.post('/api/auth/login', {
          data: {
            email: `missing-${fixture.suffix}@test.invalid`,
            password: 'wrong',
          },
        })
      ).status(),
    ).toBe(429);
    await loginApi.dispose();
  });

  test('keeps the inventory ledger aligned through receipt, use, waste, and physical count', async () => {
    const path = `/api/stores/${fixture.storeId}/inventory`;
    const mutate = (
      type: string,
      quantityDelta: string,
      idempotencyKey: string,
      expectedVersion?: number,
    ) =>
      ownerApi.post(path, {
        data: {
          ingredientId: fixture.ingredientIds.countStock,
          quantityDelta,
          type,
          reason: `test ${type.toLowerCase()}`,
          idempotencyKey,
          ...(expectedVersion === undefined ? {} : { expectedVersion }),
        },
      });

    expect(
      (
        await ownerApi.post(path, {
          data: {
            ingredientId: fixture.ingredientIds.countStock,
            quantityDelta: '-1',
            type: 'RECEIPT',
            reason: 'negative',
            idempotencyKey: `negative-${fixture.suffix}`,
          },
        })
      ).status(),
    ).toBe(400);
    expect(
      (
        await ownerApi.post(path, {
          data: {
            ingredientId: fixture.ingredientIds.countStock,
            quantityDelta: '1',
            type: 'RECEIPT',
            idempotencyKey: `no-reason-${fixture.suffix}`,
          },
        })
      ).status(),
    ).toBe(400);
    expect([400, 409]).toContain(
      (
        await ownerApi.post(path, {
          data: {
            ingredientId: fixture.ingredientIds.countStock,
            unit: 'kg',
            quantityDelta: '1',
            type: 'RECEIPT',
            reason: 'mismatched unit',
            idempotencyKey: `wrong-unit-${fixture.suffix}`,
          },
        })
      ).status(),
    );

    expect(
      (await mutate('RECEIPT', '2000', `receipt-${fixture.suffix}`)).status(),
    ).toBe(201);
    expect(
      (await mutate('USAGE', '300', `usage-${fixture.suffix}`)).status(),
    ).toBe(201);
    expect(
      (await mutate('WASTE', '100', `waste-${fixture.suffix}`)).status(),
    ).toBe(201);
    expect(
      Number(await inventoryQuantity(fixture.ingredientIds.countStock)),
    ).toBe(1600);

    const countKey = `count-${fixture.suffix}`;
    const countVersion = await inventoryVersion(
      fixture.ingredientIds.countStock,
    );
    expect(
      (await mutate('COUNT', '1500', countKey, countVersion)).status(),
    ).toBe(201);
    expect(
      Number(await inventoryQuantity(fixture.ingredientIds.countStock)),
    ).toBe(1500);
    const ledger = await inventoryLedger(
      fixture.storeId,
      fixture.ingredientIds.countStock,
    );
    expect(ledger.map((row) => Number(row.quantityDelta))).toEqual([
      2000, -300, -100, -100,
    ]);
    expect(
      ledger.reduce((sum, row) => sum + Number(row.quantityDelta), 0),
    ).toBe(1500);

    expect([200, 201]).toContain(
      (await mutate('COUNT', '1500', countKey, countVersion)).status(),
    );
    expect(
      Number(await inventoryQuantity(fixture.ingredientIds.countStock)),
    ).toBe(1500);
    const parallelKey = `parallel-count-${fixture.suffix}`;
    const parallelVersion = await inventoryVersion(
      fixture.ingredientIds.countStock,
    );
    const concurrentCount = await Promise.all([
      mutate('COUNT', '1500', parallelKey, parallelVersion),
      mutate('COUNT', '1500', parallelKey, parallelVersion),
    ]);
    expect(
      concurrentCount
        .map((response) => response.status())
        .every((status) => [200, 201].includes(status)),
    ).toBe(true);
    expect(
      Number(await inventoryQuantity(fixture.ingredientIds.countStock)),
    ).toBe(1500);
    expect(
      (await inventoryLedger(fixture.storeId, fixture.ingredientIds.countStock))
        .length,
    ).toBe(5);
    expect(
      (
        await mutate(
          'COUNT',
          '1400',
          `stale-count-${fixture.suffix}`,
          parallelVersion,
        )
      ).status(),
    ).toBe(409);
    const changedPayload = await mutate(
      'COUNT',
      '1400',
      countKey,
      countVersion,
    );
    expect(changedPayload.status()).toBe(409);

    expect(
      (
        await mutate(
          'COUNT',
          '0',
          `empty-count-${fixture.suffix}`,
          await inventoryVersion(fixture.ingredientIds.countStock),
        )
      ).status(),
    ).toBe(201);
    expect(
      (
        await mutate('USAGE', '0.5', `fractional-usage-${fixture.suffix}`)
      ).status(),
    ).toBe(201);
    expect(
      Number(await inventoryQuantity(fixture.ingredientIds.countStock)),
    ).toBe(-0.5);
    const zeroVersion = await inventoryVersion(
      fixture.ingredientIds.countStock,
    );
    expect(
      (
        await mutate('COUNT', '0', `zero-count-${fixture.suffix}`, zeroVersion)
      ).status(),
    ).toBe(201);
    expect(
      Number(await inventoryQuantity(fixture.ingredientIds.countStock)),
    ).toBe(0);
  });

  test('applies concurrent duplicate daily-sale requests only once', async () => {
    const body = {
      businessDate: seoulToday(),
      menuId: fixture.menuId,
      quantity: 20,
      unitPriceWon: '10000',
      discountWon: '0',
      idempotencyKey: `parallel-sale-${fixture.suffix}`,
    };
    const path = `/api/stores/${fixture.storeId}/sales/daily`;
    const outcomes = await Promise.all([
      ownerApi.post(path, { data: body }),
      ownerApi.post(path, { data: body }),
    ]);
    expect(
      outcomes
        .map((response) => response.status())
        .every((status) => [200, 201].includes(status)),
    ).toBe(true);
    const rows = await db.query(
      `SELECT count(*)::int AS n FROM "DailySale" WHERE "storeId"=$1 AND "businessDate"=$2::date`,
      [fixture.storeId, body.businessDate],
    );
    expect(rows.rows[0].n).toBe(1);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.bun))).toBe(80);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.patty))).toBe(
      80,
    );
  });

  test('allows only one concurrent correction using the same starting revision', async () => {
    const create = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily`,
      {
        data: {
          businessDate: seoulToday(),
          menuId: fixture.menuId,
          quantity: 20,
          unitPriceWon: '10000',
          discountWon: '0',
          idempotencyKey: `revision-sale-${fixture.suffix}`,
        },
      },
    );
    expect(create.status()).toBe(201);
    const sale = await create.json();
    const path = `/api/stores/${fixture.storeId}/sales/daily/${sale.id}/corrections`;
    const [first, second] = await Promise.all([
      ownerApi.post(path, {
        data: {
          quantity: 25,
          unitPriceWon: '10000',
          discountWon: '0',
          revision: sale.revision,
          idempotencyKey: `revision-a-${fixture.suffix}`,
        },
      }),
      ownerApi.post(path, {
        data: {
          quantity: 30,
          unitPriceWon: '10000',
          discountWon: '0',
          revision: sale.revision,
          idempotencyKey: `revision-b-${fixture.suffix}`,
        },
      }),
    ]);
    const statuses = [first.status(), second.status()].sort((a, b) => a - b);
    expect(statuses).toEqual([200, 409]);
    const current = await db.query<{ quantity: number; revision: number }>(
      `SELECT quantity,revision FROM "DailySale" WHERE id=$1`,
      [sale.id],
    );
    const expectedQty = current.rows[0].quantity;
    expect([25, 30]).toContain(expectedQty);
    expect(current.rows[0].revision).toBe(2);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.bun))).toBe(
      100 - expectedQty,
    );
    expect(Number(await inventoryQuantity(fixture.ingredientIds.patty))).toBe(
      100 - expectedQty,
    );
  });

  test('distinguishes no sale entry from an explicitly entered zero sale', async () => {
    const today = seoulToday();
    const dashboardPath = `/api/stores/${fixture.storeId}/dashboard`;
    const before = await (await ownerApi.get(dashboardPath)).json();
    expect(before.todaySaleEntered).toBe(false);
    expect(before.todaySalesWon).toBe('0');
    const sale = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily`,
      {
        data: {
          businessDate: today,
          menuId: fixture.menuId,
          quantity: 0,
          unitPriceWon: '10000',
          discountWon: '0',
          idempotencyKey: `zero-sale-${fixture.suffix}`,
        },
      },
    );
    expect(sale.status()).toBe(201);
    const after = await (await ownerApi.get(dashboardPath)).json();
    expect(after.todaySaleEntered).toBe(true);
    expect(after.todaySalesWon).toBe('0');
  });

  test('applies daily sales and corrections exactly once, preserves recipe snapshots, and does not restock cooked refunds', async () => {
    const dailyPath = `/api/stores/${fixture.storeId}/sales/daily`;
    const businessDate = seoulToday();
    const saleBody = {
      businessDate,
      menuId: fixture.menuId,
      quantity: 20,
      unitPriceWon: '10000',
      discountWon: '0',
      idempotencyKey: `daily-${fixture.suffix}`,
    };
    const first = await ownerApi.post(dailyPath, { data: saleBody });
    expect(first.status()).toBe(201);
    const sale = await first.json();
    const retry = await ownerApi.post(dailyPath, { data: saleBody });
    expect([200, 201]).toContain(retry.status());
    expect(Number(await inventoryQuantity(fixture.ingredientIds.bun))).toBe(80);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.patty))).toBe(
      80,
    );

    const changedFirstPayload = await ownerApi.post(dailyPath, {
      data: { ...saleBody, quantity: 21 },
    });
    expect(changedFirstPayload.status()).toBe(409);

    const newRecipe = await ownerApi.post(
      `/api/stores/${fixture.storeId}/menus/${fixture.menuId}/recipes`,
      {
        data: {
          items: [
            { ingredientId: fixture.ingredientIds.bun, quantity: '2' },
            { ingredientId: fixture.ingredientIds.patty, quantity: '2' },
          ],
        },
      },
    );
    expect(newRecipe.status()).toBe(201);

    const correctionPath = `${dailyPath}/${sale.id}/corrections`;
    const correctionBody = {
      quantity: 25,
      unitPriceWon: '10000',
      discountWon: '0',
      revision: sale.revision,
      idempotencyKey: `correction-${fixture.suffix}`,
    };
    expect(
      (await ownerApi.post(correctionPath, { data: correctionBody })).status(),
    ).toBe(200);
    expect(
      (await ownerApi.post(correctionPath, { data: correctionBody })).status(),
    ).toBe(200);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.bun))).toBe(75);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.patty))).toBe(
      75,
    );
    const correctionCount = await db.query(
      `SELECT count(*)::int AS n FROM "SaleEvent" WHERE "saleId"=$1 AND "idempotencyKey"=$2`,
      [sale.id, correctionBody.idempotencyKey],
    );
    expect(correctionCount.rows[0].n).toBe(1);
    const changedCorrection = await ownerApi.post(correctionPath, {
      data: { ...correctionBody, quantity: 26 },
    });
    expect(changedCorrection.status()).toBe(409);
    const persistedSale = await db.query<{
      quantity: number;
      recipeSnapshot: unknown;
    }>(`SELECT quantity,"recipeSnapshot" FROM "DailySale" WHERE id=$1`, [
      sale.id,
    ]);
    expect(persistedSale.rows[0].quantity).toBe(25);
    expect(persistedSale.rows[0].recipeSnapshot).toEqual([
      expect.objectContaining({
        ingredientId: fixture.ingredientIds.bun,
        quantity: '1',
      }),
      expect.objectContaining({
        ingredientId: fixture.ingredientIds.patty,
        quantity: '1',
      }),
    ]);
    expect(
      (
        await ownerApi.post(correctionPath, {
          data: {
            ...correctionBody,
            quantity: 24,
            revision: sale.revision,
            idempotencyKey: `stale-revision-${fixture.suffix}`,
          },
        })
      ).status(),
    ).toBe(409);

    const refundBody = {
      amountWon: '10000',
      idempotencyKey: `refund-${fixture.suffix}`,
    };
    const refundPath = `/api/stores/${fixture.storeId}/sales/${sale.id}/refunds`;
    expect(
      (await ownerApi.post(refundPath, { data: refundBody })).status(),
    ).toBe(200);
    expect(
      (await ownerApi.post(refundPath, { data: refundBody })).status(),
    ).toBe(200);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.bun))).toBe(75);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.patty))).toBe(
      75,
    );
    const changedRefund = await ownerApi.post(refundPath, {
      data: { ...refundBody, amountWon: '9000' },
    });
    expect(changedRefund.status()).toBe(409);
    expect(
      (
        await ownerApi.post(refundPath, {
          data: {
            amountWon: '250000',
            idempotencyKey: `over-refund-${fixture.suffix}`,
          },
        })
      ).status(),
    ).toBe(409);
  });

  test('keeps a prior-month sale in its month and books a later refund in the current month', async () => {
    const [year, month] = seoulToday().split('-').map(Number);
    const previousMonth = new Date(Date.UTC(year, month - 2, 10));
    const previousDate = previousMonth.toISOString().slice(0, 10);
    const currentMonth = seoulToday().slice(0, 7);
    const priorMonth = previousDate.slice(0, 7);
    await db.query(
      `UPDATE "Recipe" SET "effectiveFrom"=$2::date-INTERVAL '1 day' WHERE id=$1`,
      [fixture.recipeId, previousDate],
    );
    const saleResponse = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily`,
      {
        data: {
          businessDate: previousDate,
          menuId: fixture.menuId,
          quantity: 1,
          unitPriceWon: '10000',
          discountWon: '0',
          idempotencyKey: `prior-month-${fixture.suffix}`,
        },
      },
    );
    expect(saleResponse.status(), await saleResponse.text()).toBe(201);
    const sale = await saleResponse.json();
    expect(
      (
        await ownerApi.post(
          `/api/stores/${fixture.storeId}/sales/${sale.id}/refunds`,
          {
            data: {
              amountWon: '1000',
              idempotencyKey: `current-month-refund-${fixture.suffix}`,
            },
          },
        )
      ).status(),
    ).toBe(200);

    const oldSummary = await (
      await ownerApi.get(
        `/api/stores/${fixture.storeId}/finance/summary?month=${priorMonth}`,
      )
    ).json();
    const currentSummary = await (
      await ownerApi.get(
        `/api/stores/${fixture.storeId}/finance/summary?month=${currentMonth}`,
      )
    ).json();
    expect(oldSummary.revenueWon).toBe('10000');
    expect(currentSummary.revenueWon).toBe('-1000');
  });

  test('requires reconciliation before changing sales closed by a later stock count', async () => {
    const saleResponse = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily`,
      {
        data: {
          businessDate: seoulToday(),
          menuId: fixture.menuId,
          quantity: 20,
          unitPriceWon: '10000',
          discountWon: '0',
          idempotencyKey: `before-count-${fixture.suffix}`,
        },
      },
    );
    expect(saleResponse.status(), await saleResponse.text()).toBe(201);
    const sale = await saleResponse.json();
    const countResponse = await ownerApi.post(
      `/api/stores/${fixture.storeId}/inventory`,
      {
        data: {
          ingredientId: fixture.ingredientIds.bun,
          quantityDelta: '80',
          type: 'COUNT',
          reason: 'closing count',
          expectedVersion: await inventoryVersion(fixture.ingredientIds.bun),
          idempotencyKey: `close-count-${fixture.suffix}`,
        },
      },
    );
    expect(countResponse.status()).toBe(201);
    const correction = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily/${sale.id}/corrections`,
      {
        data: {
          quantity: 25,
          unitPriceWon: '10000',
          discountWon: '0',
          revision: sale.revision,
          idempotencyKey: `after-count-${fixture.suffix}`,
        },
      },
    );
    expect(correction.status(), await correction.text()).toBe(409);
  });

  test('does not let an unrelated ingredient count close a sale correction', async () => {
    const today = seoulToday();
    const saleResponse = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily`,
      {
        data: {
          businessDate: today,
          menuId: fixture.menuId,
          quantity: 20,
          unitPriceWon: '10000',
          discountWon: '0',
          idempotencyKey: `unrelated-count-sale-${fixture.suffix}`,
        },
      },
    );
    expect(saleResponse.status()).toBe(201);
    const sale = await saleResponse.json();
    expect(
      (
        await ownerApi.post(`/api/stores/${fixture.storeId}/inventory`, {
          data: {
            ingredientId: fixture.ingredientIds.countStock,
            quantityDelta: '1',
            type: 'COUNT',
            reason: 'unrelated count',
            expectedVersion: await inventoryVersion(
              fixture.ingredientIds.countStock,
            ),
            idempotencyKey: `unrelated-count-${fixture.suffix}`,
          },
        })
      ).status(),
    ).toBe(201);
    const corrected = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily/${sale.id}/corrections`,
      {
        data: {
          quantity: 21,
          unitPriceWon: '10000',
          discountWon: '0',
          revision: sale.revision,
          idempotencyKey: `unrelated-count-correction-${fixture.suffix}`,
        },
      },
    );
    expect(corrected.status()).toBe(200);
  });

  test('blocks a new same-day sale after its ingredient has been counted', async () => {
    expect(
      (
        await ownerApi.post(`/api/stores/${fixture.storeId}/inventory`, {
          data: {
            ingredientId: fixture.ingredientIds.bun,
            quantityDelta: '100',
            type: 'COUNT',
            reason: 'opening count',
            expectedVersion: await inventoryVersion(fixture.ingredientIds.bun),
            idempotencyKey: `pre-sale-count-${fixture.suffix}`,
          },
        })
      ).status(),
    ).toBe(201);
    const response = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily`,
      {
        data: {
          businessDate: seoulToday(),
          menuId: fixture.menuId,
          quantity: 1,
          unitPriceWon: '10000',
          discountWon: '0',
          idempotencyKey: `post-count-sale-${fixture.suffix}`,
        },
      },
    );
    expect(response.status()).toBe(409);
  });

  test('activates recipe versions at the next Seoul midnight and keeps earlier sales on the old snapshot', async () => {
    const recipesPath = `/api/stores/${fixture.storeId}/menus/${fixture.menuId}/recipes`;
    const nextDay = seoulTomorrow();
    const scheduled = await ownerApi.post(recipesPath, {
      data: {
        items: [
          { ingredientId: fixture.ingredientIds.bun, quantity: '2' },
          { ingredientId: fixture.ingredientIds.patty, quantity: '2' },
        ],
      },
    });
    expect(scheduled.status()).toBe(201);
    const scheduledRecipe = await scheduled.json();
    const expectedStart = new Date(`${nextDay}T00:00:00+09:00`);
    const effective = await db.query<{ effectiveFrom: Date }>(
      `SELECT "effectiveFrom" FROM "Recipe" WHERE id=$1`,
      [scheduledRecipe.id],
    );
    // Recipe scheduling is at exactly the next KST business day boundary.
    expect(effective.rows[0].effectiveFrom.toISOString()).toBe(
      expectedStart.toISOString(),
    );

    const salesPath = `/api/stores/${fixture.storeId}/sales/daily`;
    const oldDay = await ownerApi.post(salesPath, {
      data: {
        businessDate: seoulToday(),
        menuId: fixture.menuId,
        quantity: 1,
        unitPriceWon: '10000',
        discountWon: '0',
        idempotencyKey: `old-version-sale-${fixture.suffix}`,
      },
    });
    expect(oldDay.status()).toBe(201);
    const oldSale = await oldDay.json();
    expect(oldSale.recipeId).toBe(fixture.recipeId);
    expect(oldSale.recipeSnapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: fixture.ingredientIds.bun,
          quantity: '1',
        }),
        expect.objectContaining({
          ingredientId: fixture.ingredientIds.patty,
          quantity: '1',
        }),
      ]),
    );

    const nextSaleResponse = await ownerApi.post(salesPath, {
      data: {
        businessDate: nextDay,
        menuId: fixture.menuId,
        quantity: 1,
        unitPriceWon: '10000',
        discountWon: '0',
        idempotencyKey: `new-version-sale-${fixture.suffix}`,
      },
    });
    expect(nextSaleResponse.status()).toBe(201);
    const nextSale = await nextSaleResponse.json();
    expect(nextSale.recipeId).toBe(scheduledRecipe.id);
    expect(nextSale.recipeSnapshot).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ingredientId: fixture.ingredientIds.bun,
          quantity: '2',
        }),
        expect.objectContaining({
          ingredientId: fixture.ingredientIds.patty,
          quantity: '2',
        }),
      ]),
    );
  });

  test('allows mock POS only for a marked demo store, imports once, and rejects manual same-day collisions', async () => {
    const path = `/api/stores/${fixture.storeId}/pos/mock/import`;
    const importDate = seoulTomorrow();
    expect(
      (
        await ownerApi.post(path, { data: { businessDate: importDate } })
      ).status(),
    ).toBe(403);
    expect(
      (
        await staffApi.post(path, { data: { businessDate: importDate } })
      ).status(),
    ).toBe(403);
    await db.query(
      `INSERT INTO "AuditLog" (id,"storeId","actorId",action,"entityType","entityId","changeSummary") VALUES ($1,$2,$3,'SEED_INITIALIZED','Store',$4,'{}')`,
      [randomUUID(), fixture.storeId, fixture.owner.id, fixture.storeId],
    );
    const importFirst = await ownerApi.post(path, {
      data: { businessDate: importDate },
    });
    expect(importFirst.status()).toBe(201);
    expect(
      (
        await ownerApi.post(path, { data: { businessDate: importDate } })
      ).status(),
    ).toBe(200);
    const imported = await importFirst.json();
    expect(imported.source).toBe('MOCK_POS');
    expect(imported.sale.quantity).toBe(5);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.bun))).toBe(95);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.patty))).toBe(
      95,
    );

    const manual = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily`,
      {
        data: {
          businessDate: seoulToday(),
          menuId: fixture.menuId,
          quantity: 1,
          unitPriceWon: '10000',
          discountWon: '0',
          idempotencyKey: `manual-overlap-${fixture.suffix}`,
        },
      },
    );
    expect(manual.status()).toBe(201);
    expect(
      (
        await ownerApi.post(path, { data: { businessDate: seoulToday() } })
      ).status(),
    ).toBe(409);
  });

  test('recommends rounded purchasing amounts and applies partial receipts idempotently', async () => {
    const suggestionPath = `/api/stores/${fixture.storeId}/purchase-suggestions`;
    const suggestions = (await (
      await ownerApi.get(suggestionPath)
    ).json()) as Array<{ ingredientId: string; recommendedQty: string }>;
    expect(
      suggestions.find(
        (row) => row.ingredientId === fixture.ingredientIds.poStock,
      )?.recommendedQty,
    ).toBe('60');

    const ordersPath = `/api/stores/${fixture.storeId}/purchase-orders`;
    const crossStoreSupplier = await ownerApi.post(ordersPath, {
      data: {
        supplierId: fixture.otherSupplierId,
        items: [
          {
            ingredientId: fixture.ingredientIds.poStock,
            orderedQty: '1',
            unitPriceWon: '100',
          },
        ],
      },
    });
    expect([400, 404]).toContain(crossStoreSupplier.status());
    const crossStoreIngredient = await ownerApi.post(ordersPath, {
      data: {
        supplierId: fixture.supplierId,
        items: [
          {
            ingredientId: fixture.ingredientIds.other,
            orderedQty: '1',
            unitPriceWon: '100',
          },
        ],
      },
    });
    expect([400, 404]).toContain(crossStoreIngredient.status());
    const partialOrder = await ownerApi.post(ordersPath, {
      data: {
        supplierId: fixture.supplierId,
        items: [
          {
            ingredientId: fixture.ingredientIds.poStock,
            orderedQty: '40',
            unitPriceWon: '100',
          },
        ],
      },
    });
    expect(partialOrder.status()).toBe(201);
    const partial = await partialOrder.json();
    expect(
      (await ownerApi.post(`${ordersPath}/${partial.id}/submit`)).status(),
    ).toBe(200);
    const afterOutstanding = (await (
      await ownerApi.get(suggestionPath)
    ).json()) as Array<{ ingredientId: string; recommendedQty: string }>;
    expect(
      afterOutstanding.find(
        (row) => row.ingredientId === fixture.ingredientIds.poStock,
      )?.recommendedQty,
    ).toBe('20');

    const fullOrder = await ownerApi.post(ordersPath, {
      data: {
        supplierId: fixture.supplierId,
        items: [
          {
            ingredientId: fixture.ingredientIds.patty,
            orderedQty: '100',
            unitPriceWon: '100',
          },
        ],
      },
    });
    expect(fullOrder.status()).toBe(201);
    const order = await fullOrder.json();
    const staffOrders = (await (
      await staffApi.get(ordersPath)
    ).json()) as Array<{ items: Array<Record<string, unknown>> }>;
    const staffOrder = staffOrders.find((row) =>
      row.items.some(
        (item) => item.ingredientId === fixture.ingredientIds.patty,
      ),
    );
    expect(staffOrder).toBeDefined();
    expect(staffOrder!.items[0]).not.toHaveProperty('unitPriceWon');
    expect(staffOrder!.items[0].ingredient).not.toHaveProperty('unitCost');
    expect(
      (await ownerApi.post(`${ordersPath}/${order.id}/submit`)).status(),
    ).toBe(200);
    const receiptPath = `${ordersPath}/${order.id}/receipts`;
    const firstReceipt = {
      idempotencyKey: `receipt-a-${fixture.suffix}`,
      items: [{ ingredientId: fixture.ingredientIds.patty, quantity: '40' }],
    };
    expect(
      (await ownerApi.post(receiptPath, { data: firstReceipt })).status(),
    ).toBe(200);
    expect(
      (
        await db.query(`SELECT status FROM "PurchaseOrder" WHERE id=$1`, [
          order.id,
        ])
      ).rows[0].status,
    ).toBe('PARTIALLY_RECEIVED');
    expect(
      (await ownerApi.post(`${ordersPath}/${order.id}/cancel`)).status(),
    ).toBe(409);
    const receiptRetries = await Promise.all([
      ownerApi.post(receiptPath, { data: firstReceipt }),
      ownerApi.post(receiptPath, { data: firstReceipt }),
    ]);
    expect(
      receiptRetries
        .map((response) => response.status())
        .every((status) => [200, 201].includes(status)),
    ).toBe(true);
    expect(Number(await inventoryQuantity(fixture.ingredientIds.patty))).toBe(
      140,
    );
    expect(
      (
        await ownerApi.post(receiptPath, {
          data: {
            ...firstReceipt,
            items: [
              { ingredientId: fixture.ingredientIds.patty, quantity: '41' },
            ],
          },
        })
      ).status(),
    ).toBe(409);
    expect(
      (
        await ownerApi.post(receiptPath, {
          data: {
            idempotencyKey: `receipt-b-${fixture.suffix}`,
            items: [
              { ingredientId: fixture.ingredientIds.patty, quantity: '60' },
            ],
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await db.query(`SELECT status FROM "PurchaseOrder" WHERE id=$1`, [
          order.id,
        ])
      ).rows[0].status,
    ).toBe('RECEIVED');
    expect(Number(await inventoryQuantity(fixture.ingredientIds.patty))).toBe(
      200,
    );
    expect(
      (
        await ownerApi.post(receiptPath, {
          data: {
            idempotencyKey: `receipt-c-${fixture.suffix}`,
            items: [
              { ingredientId: fixture.ingredientIds.patty, quantity: '1' },
            ],
          },
        })
      ).status(),
    ).toBe(409);
  });

  test('serializes overlapping table bookings under concurrency and honors half-open boundaries', async () => {
    const path = `/api/stores/${fixture.storeId}/reservations`;
    const startAt = '2028-06-10T10:00:00.000Z';
    const endAt = '2028-06-10T11:00:00.000Z';
    const booking = {
      customerName: 'Concurrent Test',
      startAt,
      endAt,
      partySize: 3,
      tableId: fixture.tableId,
      source: 'PHONE',
    };
    const results = await Promise.all([
      ownerApi.post(path, { data: booking }),
      ownerApi.post(path, { data: booking }),
    ]);
    expect(results.map((response) => response.status()).sort()).toEqual([
      201, 409,
    ]);
    const first = await results
      .find((response) => response.status() === 201)!
      .json();

    const adjacent = await ownerApi.post(path, {
      data: { ...booking, startAt: endAt, endAt: '2028-06-10T12:00:00.000Z' },
    });
    expect(adjacent.status()).toBe(201);
    expect([400, 409]).toContain(
      (
        await ownerApi.post(path, {
          data: {
            ...booking,
            partySize: 5,
            startAt: '2028-06-10T13:00:00.000Z',
            endAt: '2028-06-10T14:00:00.000Z',
          },
        })
      ).status(),
    );
    expect([400, 404]).toContain(
      (
        await ownerApi.post(path, {
          data: {
            ...booking,
            tableId: fixture.otherTableId,
            startAt: '2028-06-10T13:00:00.000Z',
            endAt: '2028-06-10T14:00:00.000Z',
          },
        })
      ).status(),
    );

    expect(
      (
        await ownerApi.post(
          `/api/stores/${fixture.storeId}/reservations/${first.id}/transitions`,
          { data: { status: 'CANCELLED' } },
        )
      ).status(),
    ).toBe(200);
    expect((await ownerApi.post(path, { data: booking })).status()).toBe(201);
  });

  test('records a repair cost once, redacts it from Staff, and reports the accepted monthly operating result', async () => {
    const facilitiesPath = `/api/stores/${fixture.storeId}/facilities`;
    const report = await staffApi.post(
      `/api/stores/${fixture.storeId}/maintenance-requests`,
      {
        data: {
          facilityId: fixture.facilityId,
          title: `Repair ${fixture.suffix}`,
          description: 'test repair',
        },
      },
    );
    expect(report.status()).toBe(201);
    const maintenance = await report.json();
    expect(
      (
        await staffApi.post(
          `/api/stores/${fixture.storeId}/maintenance-requests/${maintenance.id}/transitions`,
          { data: { status: 'IN_PROGRESS' } },
        )
      ).status(),
    ).toBe(403);
    expect(
      (
        await ownerApi.post(
          `/api/stores/${fixture.storeId}/maintenance-requests/${maintenance.id}/transitions`,
          { data: { status: 'IN_PROGRESS' } },
        )
      ).status(),
    ).toBe(200);

    const date = seoulToday();
    const daily = await ownerApi.post(
      `/api/stores/${fixture.storeId}/sales/daily`,
      {
        data: {
          businessDate: date,
          menuId: fixture.menuId,
          quantity: 10,
          unitPriceWon: '10000',
          discountWon: '5000',
          idempotencyKey: `finance-sale-${fixture.suffix}`,
        },
      },
    );
    expect(daily.status()).toBe(201);
    const sale = await daily.json();
    expect(
      (
        await ownerApi.post(
          `/api/stores/${fixture.storeId}/sales/${sale.id}/refunds`,
          {
            data: {
              amountWon: '10000',
              idempotencyKey: `finance-refund-${fixture.suffix}`,
            },
          },
        )
      ).status(),
    ).toBe(200);

    const completionPath = `/api/stores/${fixture.storeId}/maintenance-requests/${maintenance.id}/completion`;
    expect(
      (
        await ownerApi.post(completionPath, { data: { costWon: '50000' } })
      ).status(),
    ).toBe(200);
    expect(
      (
        await ownerApi.post(completionPath, { data: { costWon: '50000' } })
      ).status(),
    ).toBe(200);
    const costCount = await db.query(
      `SELECT count(*)::int AS n FROM "FinancialTransaction" WHERE "storeId"=$1 AND "sourceType"='MAINTENANCE' AND "sourceId"=$2`,
      [fixture.storeId, maintenance.id],
    );
    expect(costCount.rows[0].n).toBe(1);

    const staffRequests = (await (
      await staffApi.get(`/api/stores/${fixture.storeId}/maintenance-requests`)
    ).json()) as Array<Record<string, unknown>>;
    expect(
      staffRequests.find((row) => row.id === maintenance.id)?.costWon,
    ).not.toBe('50000');
    expect(
      staffRequests.find((row) => row.id === maintenance.id)?.costWon,
    ).not.toBe(50000);
    const staffFacilities = (await (
      await staffApi.get(facilitiesPath)
    ).json()) as Array<{ maintenance: Array<Record<string, unknown>> }>;
    const exposedCost = staffFacilities
      .flatMap((row) => row.maintenance)
      .find((row) => row.id === maintenance.id)?.costWon;
    expect(exposedCost).not.toBe('50000');
    expect(exposedCost).not.toBe(50000);
    expect(
      (
        await staffApi.get(`/api/stores/${fixture.storeId}/finance/summary`)
      ).status(),
    ).toBe(403);

    const month = date.slice(0, 7);
    const summary = await (
      await ownerApi.get(
        `/api/stores/${fixture.storeId}/finance/summary?month=${month}`,
      )
    ).json();
    expect(summary.revenueWon).toBe('85000');
    expect(summary.expenseWon).toBe('50000');
    expect(summary.estimatedOperatingProfitWon).toBe('35000');
  });

  test('reverses non-operating capital transactions without adding them to operating profit', async () => {
    const base = `/api/stores/${fixture.storeId}/finance/transactions`;
    const original = await ownerApi.post(base, {
      data: {
        type: 'INCOME',
        category: '자금투입',
        amountWon: '100000',
        description: 'initial capital',
        occurredAt: new Date().toISOString(),
        idempotencyKey: `capital-${fixture.suffix}`,
      },
    });
    expect(original.status()).toBe(201);
    const transaction = await original.json();
    const month = seoulToday().slice(0, 7);
    const summaryPath = `/api/stores/${fixture.storeId}/finance/summary?month=${month}`;
    expect(
      (await (await ownerApi.get(summaryPath)).json())
        .estimatedOperatingProfitWon,
    ).toBe('0');

    const reversePath = `${base}/${transaction.id}/reversals`;
    expect(
      (
        await ownerApi.post(reversePath, {
          data: {
            reason: 'entered on wrong store',
            idempotencyKey: `ignored-${fixture.suffix}`,
          },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await ownerApi.post(reversePath, {
          data: { reason: 'entered on wrong store' },
        })
      ).status(),
    ).toBe(200);
    expect(
      (
        await ownerApi.post(reversePath, {
          data: { reason: 'different reason' },
        })
      ).status(),
    ).toBe(409);
    const summary = await (await ownerApi.get(summaryPath)).json();
    expect(summary.otherIncomeWon).toBe('0');
    expect(summary.expenseWon).toBe('0');
    expect(summary.estimatedOperatingProfitWon).toBe('0');
  });
});
