import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { MockPOSAdapter } from '@/integrations/pos/mock-adapter';
import { serialize } from '@/lib/serialize';
import { saleNet } from '@/modules/rules';
const dayKey = (v: string) => new Date(`${v}T00:00:00.000Z`);
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json(),
      seeded = await prisma.auditLog.findFirst({
        where: {
          storeId,
          action: 'SEED_INITIALIZED',
          entityType: 'Store',
          entityId: storeId,
        },
      }),
      store = seeded
        ? await prisma.store.findFirst({
            where: { id: storeId, active: true },
            include: {
              menus: {
                where: { active: true },
                orderBy: { name: 'asc' },
                take: 1,
              },
            },
          })
        : null;
    if (!store)
      return NextResponse.json(
        { error: 'mock import is only enabled on the demo store' },
        { status: 403 },
      );
    const businessDate =
      typeof b.businessDate === 'string'
        ? b.businessDate
        : new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Seoul',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(businessDate))
      throw Error('invalid business date');
    const menu = store.menus[0];
    if (!menu) throw Error('menu required');
    const adapter = new MockPOSAdapter(),
      orders = await adapter.fetchSales(businessDate, menu.id, menu.priceWon),
      quantity = orders.reduce((n, x) => n + x.quantity, 0),
      discount = orders.reduce((n, x) => n + x.discountWon, 0n),
      idempotencyKey = `mock-pos:${businessDate}:${menu.id}`,
      payloadHash = JSON.stringify({
        menuId: menu.id,
        quantity,
        price: menu.priceWon.toString(),
        discount: discount.toString(),
      });
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id"=${storeId} FOR UPDATE`;
      const previous = await tx.dailySale.findUnique({
        where: {
          storeId_menuId_businessDate: {
            storeId,
            menuId: menu.id,
            businessDate: dayKey(businessDate),
          },
        },
        include: { events: true },
      });
      if (previous) {
        const original = previous.events.find(
          (e) => e.kind === 'CONFIRMED' && e.idempotencyKey === idempotencyKey,
        );
        if (
          previous.idempotencyKey === idempotencyKey &&
          original?.payloadHash === payloadHash
        )
          return { sale: previous, duplicate: true };
        throw Error('conflict');
      }
      const day = dayKey(businessDate),
        businessEnd = new Date(day.getTime() + 15 * 3600000);
      const recipe = await tx.recipe.findFirst({
        where: { menuId: menu.id, effectiveFrom: { lt: businessEnd } },
        orderBy: { version: 'desc' },
        include: { items: { include: { ingredient: true } } },
      });
      if (!recipe?.items.length)
        throw Error('recipe required before importing POS sales');
      const ingredientIds = recipe.items.map((i) => i.ingredientId).sort();
      for (const ingredientId of ingredientIds)
        await tx.$queryRaw`SELECT "id" FROM "Inventory" WHERE "ingredientId"=${ingredientId} FOR UPDATE`;
      const countStart = new Date(day.getTime() - 9 * 3600000);
      if (
        await tx.inventoryTransaction.findFirst({
          where: {
            storeId,
            ingredientId: { in: ingredientIds },
            type: 'COUNT',
            createdAt: { gte: countStart },
          },
        })
      )
        throw Error('count cutoff requires manual reconciliation');
      const snapshot = recipe.items.map((i) => ({
        ingredientId: i.ingredientId,
        name: i.ingredient.name,
        unit: i.ingredient.unit,
        quantity: i.quantity.toString(),
      }));
      const sale = await tx.dailySale.create({
        data: {
          storeId,
          menuId: menu.id,
          businessDate: day,
          quantity,
          unitPriceWon: menu.priceWon,
          discountWon: discount,
          recipeId: recipe.id,
          recipeSnapshot: snapshot,
          idempotencyKey,
          createdBy: a.ctx.userId,
        },
      });
      await tx.saleEvent.create({
        data: {
          saleId: sale.id,
          kind: 'CONFIRMED',
          revision: 1,
          quantityDelta: quantity,
          amountDelta: saleNet(quantity, menu.priceWon, discount),
          idempotencyKey,
          businessDate: day,
          payloadHash,
        },
      });
      for (const item of recipe.items) {
        const consumed = item.quantity.mul(quantity);
        await tx.inventory.upsert({
          where: { ingredientId: item.ingredientId },
          create: {
            storeId,
            ingredientId: item.ingredientId,
            quantity: consumed.neg(),
          },
          update: {
            quantity: { decrement: consumed },
            version: { increment: 1 },
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            storeId,
            ingredientId: item.ingredientId,
            quantityDelta: consumed.neg(),
            type: 'USAGE',
            idempotencyKey: `${idempotencyKey}:${item.ingredientId}`,
            sourceId: sale.id,
            actorId: a.ctx.userId,
            reason: 'Mock POS import',
          },
        });
      }
      return { sale, duplicate: false };
    });
    return NextResponse.json(
      serialize({
        ...result,
        source: 'MOCK_POS',
        orders: orders.map((o) => ({
          ...o,
          unitPriceWon: o.unitPriceWon.toString(),
          discountWon: o.discountWon.toString(),
        })),
      }),
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (e) {
    const m = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: m },
      {
        status:
          m === 'conflict' || m.includes('cutoff')
            ? 409
            : m === 'menu required'
              ? 409
              : 400,
      },
    );
  }
}
