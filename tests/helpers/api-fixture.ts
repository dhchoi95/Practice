import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

dotenv.config({ path: '/workspace/.local/practice/test.env' });
export const db = new Pool({ connectionString: process.env.DATABASE_URL });

export type ApiFixture = {
  suffix: string;
  password: string;
  owner: { id: string; email: string };
  staff: { id: string; email: string };
  otherOwner: { id: string; email: string };
  ownerMemberId: string;
  organizationId: string;
  otherOrganizationId: string;
  storeId: string;
  otherStoreId: string;
  ingredientIds: {
    bun: string;
    patty: string;
    countStock: string;
    poStock: string;
    other: string;
  };
  menuId: string;
  otherMenuId: string;
  recipeId: string;
  tableId: string;
  otherTableId: string;
  supplierId: string;
  otherSupplierId: string;
  facilityId: string;
};

const one = async <T extends Record<string, unknown>>(
  sql: string,
  values: unknown[],
) => (await db.query<T>(sql, values)).rows[0];

export async function createApiFixture(): Promise<ApiFixture> {
  const suffix = randomUUID();
  const password = `test-${randomUUID()}-Only!`;
  const passwordHash = await bcrypt.hash(password, 12);
  const ownerEmail = `owner-${suffix}@test.invalid`;
  const staffEmail = `staff-${suffix}@test.invalid`;
  const otherEmail = `other-${suffix}@test.invalid`;
  const owner = { id: randomUUID() };
  const staff = { id: randomUUID() };
  const otherOwner = { id: randomUUID() };
  await db.query(
    `INSERT INTO "User" (id,email,name,"passwordHash") VALUES ($1,$2,$3,$4),($5,$6,$7,$4),($8,$9,$10,$4)`,
    [
      owner.id,
      ownerEmail,
      'Test Owner',
      passwordHash,
      staff.id,
      staffEmail,
      'Test Staff',
      otherOwner.id,
      otherEmail,
      'Other Owner',
    ],
  );
  const organization = { id: randomUUID() };
  const otherOrganization = { id: randomUUID() };
  await db.query(
    `INSERT INTO "Organization" (id,name,"ownerUserId") VALUES ($1,$2,$3),($4,$5,$6)`,
    [
      organization.id,
      `Test Org ${suffix}`,
      owner.id,
      otherOrganization.id,
      `Other Org ${suffix}`,
      otherOwner.id,
    ],
  );
  const store = { id: randomUUID() };
  const otherStore = { id: randomUUID() };
  await db.query(
    `INSERT INTO "Store" (id,"organizationId",name) VALUES ($1,$2,$3),($4,$5,$6)`,
    [
      store.id,
      organization.id,
      `Test Store ${suffix}`,
      otherStore.id,
      otherOrganization.id,
      `Other Store ${suffix}`,
    ],
  );
  const ownerMember = { id: randomUUID() };
  await db.query(
    `INSERT INTO "StoreMember" (id,"storeId","userId",role) VALUES ($1,$2,$3,'OWNER'),($4,$2,$5,'STAFF'),($6,$7,$8,'OWNER')`,
    [
      ownerMember.id,
      store.id,
      owner.id,
      randomUUID(),
      staff.id,
      randomUUID(),
      otherStore.id,
      otherOwner.id,
    ],
  );

  const makeIngredient = async (
    storeId: string,
    name: string,
    unit: string,
    qty: string,
  ) => {
    const ingredientId = randomUUID();
    await db.query(
      `INSERT INTO "Ingredient" (id,"storeId",name,unit,"minimumQty","targetQty","packQty") VALUES ($1,$2,$3,$4,20,60,20)`,
      [ingredientId, storeId, name, unit],
    );
    await db.query(
      `INSERT INTO "Inventory" (id,"storeId","ingredientId",quantity) VALUES ($1,$2,$3,$4)`,
      [randomUUID(), storeId, ingredientId, qty],
    );
    return ingredientId;
  };
  const bun = await makeIngredient(store.id, `Bun ${suffix}`, '개', '100');
  const patty = await makeIngredient(store.id, `Patty ${suffix}`, '개', '100');
  const countStock = await makeIngredient(
    store.id,
    `Count stock ${suffix}`,
    'g',
    '0',
  );
  const poStock = await makeIngredient(
    store.id,
    `PO stock ${suffix}`,
    '개',
    '18',
  );
  const otherIngredient = await makeIngredient(
    otherStore.id,
    `Other stock ${suffix}`,
    '개',
    '10',
  );
  const menu = { id: randomUUID() };
  await db.query(
    `INSERT INTO "Menu" (id,"storeId",name,"priceWon") VALUES ($1,$2,$3,10000)`,
    [menu.id, store.id, `Hamburger ${suffix}`],
  );
  const otherMenu = { id: randomUUID() };
  await db.query(
    `INSERT INTO "Menu" (id,"storeId",name,"priceWon") VALUES ($1,$2,$3,8000)`,
    [otherMenu.id, store.id, `Other menu ${suffix}`],
  );
  const recipe = { id: randomUUID() };
  await db.query(
    `INSERT INTO "Recipe" (id,"menuId",version,"effectiveFrom") VALUES ($1,$2,1,NOW()-INTERVAL '2 days')`,
    [recipe.id, menu.id],
  );
  await db.query(
    `INSERT INTO "RecipeItem" (id,"recipeId","ingredientId",quantity) VALUES ($1,$2,$3,1),($4,$2,$5,1)`,
    [randomUUID(), recipe.id, bun, randomUUID(), patty],
  );
  const table = { id: randomUUID() };
  await db.query(
    `INSERT INTO "DiningTable" (id,"storeId",label,capacity) VALUES ($1,$2,$3,4)`,
    [table.id, store.id, `T-${suffix.slice(0, 8)}`],
  );
  const otherTable = { id: randomUUID() };
  await db.query(
    `INSERT INTO "DiningTable" (id,"storeId",label,capacity) VALUES ($1,$2,$3,4)`,
    [otherTable.id, otherStore.id, `T-${suffix.slice(0, 8)}`],
  );
  const supplier = { id: randomUUID() };
  await db.query(
    `INSERT INTO "Supplier" (id,"storeId",name) VALUES ($1,$2,$3)`,
    [supplier.id, store.id, `Supplier ${suffix}`],
  );
  const otherSupplier = { id: randomUUID() };
  await db.query(
    `INSERT INTO "Supplier" (id,"storeId",name) VALUES ($1,$2,$3)`,
    [otherSupplier.id, otherStore.id, `Other supplier ${suffix}`],
  );
  const facility = { id: randomUUID() };
  await db.query(
    `INSERT INTO "Facility" (id,"storeId",name,category) VALUES ($1,$2,$3,'COOKING')`,
    [facility.id, store.id, `Grill ${suffix}`],
  );

  return {
    suffix,
    password,
    owner: { id: owner.id, email: ownerEmail },
    staff: { id: staff.id, email: staffEmail },
    otherOwner: { id: otherOwner.id, email: otherEmail },
    ownerMemberId: ownerMember.id,
    organizationId: organization.id,
    otherOrganizationId: otherOrganization.id,
    storeId: store.id,
    otherStoreId: otherStore.id,
    ingredientIds: { bun, patty, countStock, poStock, other: otherIngredient },
    menuId: menu.id,
    otherMenuId: otherMenu.id,
    recipeId: recipe.id,
    tableId: table.id,
    otherTableId: otherTable.id,
    supplierId: supplier.id,
    otherSupplierId: otherSupplier.id,
    facilityId: facility.id,
  };
}

export async function removeApiFixture(f: ApiFixture) {
  const c = await db.connect();
  try {
    await c.query('BEGIN');
    const stores = [f.storeId, f.otherStoreId];
    await c.query(
      `DELETE FROM "SaleEvent" WHERE "saleId" IN (SELECT id FROM "DailySale" WHERE "storeId"=ANY($1::uuid[]))`,
      [stores],
    );
    await c.query(`DELETE FROM "DailySale" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(
      `DELETE FROM "MaintenanceHistory" WHERE "storeId"=ANY($1::uuid[])`,
      [stores],
    );
    await c.query(
      `DELETE FROM "MaintenanceRequest" WHERE "storeId"=ANY($1::uuid[])`,
      [stores],
    );
    await c.query(
      `DELETE FROM "FinancialTransaction" WHERE "storeId"=ANY($1::uuid[])`,
      [stores],
    );
    await c.query(`DELETE FROM "AuditLog" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(`DELETE FROM "Facility" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(
      `DELETE FROM "InventoryTransaction" WHERE "storeId"=ANY($1::uuid[])`,
      [stores],
    );
    await c.query(
      `DELETE FROM "PurchaseReceipt" WHERE "orderId" IN (SELECT id FROM "PurchaseOrder" WHERE "storeId"=ANY($1::uuid[]))`,
      [stores],
    );
    await c.query(
      `DELETE FROM "PurchaseOrderItem" WHERE "orderId" IN (SELECT id FROM "PurchaseOrder" WHERE "storeId"=ANY($1::uuid[]))`,
      [stores],
    );
    await c.query(
      `DELETE FROM "PurchaseOrder" WHERE "storeId"=ANY($1::uuid[])`,
      [stores],
    );
    await c.query(`DELETE FROM "Reservation" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(`DELETE FROM "DiningTable" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(`DELETE FROM "Supplier" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(
      `DELETE FROM "RecipeItem" WHERE "recipeId" IN (SELECT r.id FROM "Recipe" r JOIN "Menu" m ON m.id=r."menuId" WHERE m."storeId"=ANY($1::uuid[]))`,
      [stores],
    );
    await c.query(
      `DELETE FROM "Recipe" WHERE "menuId" IN (SELECT id FROM "Menu" WHERE "storeId"=ANY($1::uuid[]))`,
      [stores],
    );
    await c.query(`DELETE FROM "Inventory" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(`DELETE FROM "Ingredient" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(`DELETE FROM "Menu" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(
      `DELETE FROM "StoreInvitation" WHERE "storeId"=ANY($1::uuid[])`,
      [stores],
    );
    await c.query(`DELETE FROM "StoreMember" WHERE "storeId"=ANY($1::uuid[])`, [
      stores,
    ]);
    await c.query(`DELETE FROM "Store" WHERE id=ANY($1::uuid[])`, [stores]);
    await c.query(`DELETE FROM "Organization" WHERE id=ANY($1::uuid[])`, [
      [f.organizationId, f.otherOrganizationId],
    ]);
    await c.query(`DELETE FROM "User" WHERE id=ANY($1::uuid[])`, [
      [f.owner.id, f.staff.id, f.otherOwner.id],
    ]);
    await c.query('COMMIT');
  } catch (error) {
    await c.query('ROLLBACK');
    throw error;
  } finally {
    c.release();
  }
}

export async function inventoryQuantity(ingredientId: string) {
  const row = await one<{ quantity: string }>(
    `SELECT quantity::text FROM "Inventory" WHERE "ingredientId"=$1`,
    [ingredientId],
  );
  return row?.quantity;
}

export async function inventoryVersion(ingredientId: string) {
  const row = await one<{ version: number }>(
    `SELECT version FROM "Inventory" WHERE "ingredientId"=$1`,
    [ingredientId],
  );
  return row?.version;
}

export async function inventoryLedger(storeId: string, ingredientId: string) {
  return (
    await db.query<{ quantityDelta: string }>(
      `SELECT "quantityDelta"::text FROM "InventoryTransaction" WHERE "storeId"=$1 AND "ingredientId"=$2 ORDER BY "createdAt"`,
      [storeId, ingredientId],
    )
  ).rows;
}
