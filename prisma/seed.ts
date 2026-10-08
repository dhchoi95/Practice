import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function account(
  email: string | undefined,
  password: string | undefined,
  name: string,
) {
  if (!email)
    throw Error(
      'Set DEMO_EMAIL and DEMO_STAFF_EMAIL in ignored local environment.',
    );
  let user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) {
    if (!password)
      throw Error(
        `Set the demo password for ${email} in ignored local environment.`,
      );
    user = await db.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        name,
      },
    });
  }
  return user;
}

async function main() {
  const owner = await account(
    process.env.DEMO_EMAIL,
    process.env.DEMO_PASSWORD,
    '데모 사장님',
  );
  const staff = await account(
    process.env.DEMO_STAFF_EMAIL,
    process.env.DEMO_STAFF_PASSWORD,
    '데모 직원',
  );
  let org = await db.organization.findFirst({
    where: { ownerUserId: owner.id },
  });
  if (!org)
    org = await db.organization.create({
      data: { name: '데모 조직', ownerUserId: owner.id },
    });
  let store = await db.store.findFirst({ where: { organizationId: org.id } });
  if (!store)
    store = await db.store.create({
      data: { organizationId: org.id, name: '데모 매장' },
    });
  for (const [user, role] of [
    [owner, 'OWNER'],
    [staff, 'STAFF'],
  ] as const) {
    await db.storeMember.upsert({
      where: { storeId_userId: { storeId: store.id, userId: user.id } },
      update: {},
      create: { storeId: store.id, userId: user.id, role },
    });
  }

  const alreadySeeded = await db.auditLog.findFirst({
    where: {
      storeId: store.id,
      action: 'SEED_INITIALIZED',
      entityType: 'Store',
      entityId: store.id,
    },
  });
  if (!alreadySeeded) {
    let menu = await db.menu.findFirst({
      where: { storeId: store.id, name: '햄버거' },
    });
    if (!menu)
      menu = await db.menu.create({
        data: { storeId: store.id, name: '햄버거', priceWon: 9000n },
      });
    const samples = [
      {
        name: '샘플 재료 · 번',
        unit: '개',
        quantity: '100',
        per: '1',
        min: '20',
        target: '60',
        pack: '20',
        cost: '450',
      },
      {
        name: '샘플 재료 · 패티',
        unit: 'g',
        quantity: '15000',
        per: '150',
        min: '3000',
        target: '9000',
        pack: '1000',
        cost: '0.008',
      },
      {
        name: '샘플 재료 · 채소',
        unit: 'g',
        quantity: '2000',
        per: '20',
        min: '500',
        target: '1500',
        pack: '500',
        cost: '0.012',
      },
      {
        name: '샘플 재료 · 소스',
        unit: 'g',
        quantity: '1500',
        per: '15',
        min: '300',
        target: '900',
        pack: '300',
        cost: '0.01',
      },
    ];
    const ingredients: { id: string; per: string }[] = [];
    for (const sample of samples) {
      let ingredient = await db.ingredient.findFirst({
        where: { storeId: store.id, name: sample.name },
      });
      if (!ingredient)
        ingredient = await db.ingredient.create({
          data: {
            storeId: store.id,
            name: sample.name,
            unit: sample.unit,
            minimumQty: sample.min,
            targetQty: sample.target,
            packQty: sample.pack,
            unitCost: sample.cost,
          },
        });
      ingredients.push({ id: ingredient.id, per: sample.per });
      const key = `demo-opening:${ingredient.id}`;
      if (
        !(await db.inventoryTransaction.findUnique({
          where: {
            storeId_idempotencyKey: { storeId: store.id, idempotencyKey: key },
          },
        }))
      ) {
        await db.$transaction(async (tx) => {
          await tx.inventory.upsert({
            where: { ingredientId: ingredient!.id },
            create: {
              storeId: store.id,
              ingredientId: ingredient!.id,
              quantity: sample.quantity,
            },
            update: {},
          });
          await tx.inventoryTransaction.create({
            data: {
              storeId: store.id,
              ingredientId: ingredient!.id,
              quantityDelta: sample.quantity,
              type: 'RECEIPT',
              idempotencyKey: key,
              reason: '샘플 초기 재고',
              actorId: owner.id,
            },
          });
        });
      }
    }
    if (!(await db.recipe.findFirst({ where: { menuId: menu.id } }))) {
      await db.recipe.create({
        data: {
          menuId: menu.id,
          version: 1,
          effectiveFrom: new Date(),
          items: {
            create: ingredients.map((x) => ({
              ingredientId: x.id,
              quantity: x.per,
            })),
          },
        },
      });
    }
    if (
      !(await db.supplier.findFirst({
        where: { storeId: store.id, name: '샘플 공급처' },
      }))
    )
      await db.supplier.create({
        data: {
          storeId: store.id,
          name: '샘플 공급처',
          contact: '샘플 데이터',
        },
      });
    if (
      !(await db.diningTable.findFirst({
        where: { storeId: store.id, label: '1번 테이블' },
      }))
    )
      await db.diningTable.create({
        data: { storeId: store.id, label: '1번 테이블', capacity: 2 },
      });
    if (
      !(await db.facility.findFirst({
        where: { storeId: store.id, name: '샘플 냉장고' },
      }))
    )
      await db.facility.create({
        data: {
          storeId: store.id,
          name: '샘플 냉장고',
          category: '냉장·냉동',
          memo: '데모 자료입니다. 실제 장비로 수정하세요.',
        },
      });
    await db.auditLog.create({
      data: {
        storeId: store.id,
        actorId: owner.id,
        action: 'SEED_INITIALIZED',
        entityType: 'Store',
        entityId: store.id,
        changeSummary: { demo: true, seedVersion: 1 },
      },
    });
  }
  console.log(
    `Demo Owner/Staff and editable sample store are ready: ${owner.email}, ${staff.email}. Prices, recipes and stock are samples, not actual operating data.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
