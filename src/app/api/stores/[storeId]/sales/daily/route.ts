import { serialize } from '@/lib/serialize';
import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { body } from '@/lib/response';
import { parseWon, saleNet } from '@/modules/rules';
const dayDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const rows = await prisma.dailySale.findMany({
    where: { storeId },
    include: { menu: true, events: { where: { kind: 'REFUND' } } },
    orderBy: { businessDate: 'desc' },
    take: 100,
  });
  return NextResponse.json(
    serialize(
      rows.map((row) => ({
        ...row,
        source: row.idempotencyKey.startsWith('mock-pos:')
          ? 'MOCK_POS'
          : 'MANUAL',
      })),
    ),
  );
}
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
    const b = await body(req);
    if (
      typeof b.businessDate !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(b.businessDate) ||
      typeof b.menuId !== 'string' ||
      !Number.isInteger(b.quantity) ||
      Number(b.quantity) < 0 ||
      typeof b.idempotencyKey !== 'string' ||
      !b.idempotencyKey
    )
      throw Error('invalid input');
    const menuId = b.menuId,
      quantity = Number(b.quantity),
      idem = b.idempotencyKey,
      price = parseWon(b.unitPriceWon),
      discount = parseWon(b.discountWon ?? '0');
    const net = saleNet(quantity, price, discount),
      date = dayDate(b.businessDate),
      payloadHash = JSON.stringify({
        menuId,
        quantity,
        price: price.toString(),
        discount: discount.toString(),
      });
    if (date.toISOString().slice(0, 10) !== b.businessDate)
      throw Error('invalid date');
    const out = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id"=${storeId} FOR UPDATE`;
      const byKey = await tx.dailySale.findFirst({
        where: { storeId, idempotencyKey: idem },
        include: { events: true },
      });
      if (byKey) {
        const original = byKey.events.find(
          (e) => e.kind === 'CONFIRMED' && e.idempotencyKey === idem,
        );
        if (
          byKey.menuId === menuId &&
          byKey.businessDate.getTime() === date.getTime() &&
          original?.payloadHash === payloadHash
        )
          return byKey;
        throw Error('conflict');
      }
      const prior = await tx.dailySale.findUnique({
        where: {
          storeId_menuId_businessDate: { storeId, menuId, businessDate: date },
        },
      });
      if (prior) {
        if (
          prior.quantity === quantity &&
          prior.unitPriceWon === price &&
          prior.discountWon === discount
        )
          return prior;
        throw Error('conflict');
      }
      const menu = await tx.menu.findFirst({
        where: { id: menuId, storeId, active: true },
      });
      if (!menu) throw Error('not found');
      const businessEnd = new Date(date.getTime() + 15 * 3600000);
      const recipe = await tx.recipe.findFirst({
        where: { menuId: menu.id, effectiveFrom: { lt: businessEnd } },
        orderBy: { version: 'desc' },
        include: { items: { include: { ingredient: true } } },
      });
      if (quantity > 0 && !recipe?.items.length)
        throw Error('recipe required before recording positive sales');
      if (quantity > 0 && recipe?.items.length) {
        const ingredientIds = recipe.items.map((i) => i.ingredientId).sort();
        for (const ingredientId of ingredientIds)
          await tx.$queryRaw`SELECT "id" FROM "Inventory" WHERE "ingredientId"=${ingredientId} FOR UPDATE`;
        const countStart = new Date(date.getTime() - 9 * 3600000);
        const count = await tx.inventoryTransaction.findFirst({
          where: {
            storeId,
            ingredientId: { in: ingredientIds },
            type: 'COUNT',
            createdAt: { gte: countStart },
          },
        });
        if (count) throw Error('count cutoff requires manual reconciliation');
      }
      const snapshot =
        recipe?.items.map((i) => ({
          ingredientId: i.ingredientId,
          name: i.ingredient.name,
          unit: i.ingredient.unit,
          quantity: i.quantity.toString(),
        })) ?? [];
      const sale = await tx.dailySale.create({
        data: {
          storeId,
          menuId: menu.id,
          businessDate: date,
          quantity,
          unitPriceWon: price,
          discountWon: discount,
          idempotencyKey: idem,
          createdBy: a.ctx.userId,
          recipeId: recipe?.id,
          recipeSnapshot: snapshot,
        },
      });
      await tx.saleEvent.create({
        data: {
          saleId: sale.id,
          kind: 'CONFIRMED',
          revision: 1,
          quantityDelta: quantity,
          amountDelta: net,
          businessDate: date,
          idempotencyKey: idem,
          payloadHash,
        },
      });
      for (const i of recipe?.items ?? []) {
        const q = i.quantity.mul(quantity);
        if (q.isZero()) continue;
        await tx.inventory.upsert({
          where: { ingredientId: i.ingredientId },
          create: { storeId, ingredientId: i.ingredientId, quantity: q.neg() },
          update: { quantity: { decrement: q }, version: { increment: 1 } },
        });
        await tx.inventoryTransaction.create({
          data: {
            storeId,
            ingredientId: i.ingredientId,
            quantityDelta: q.neg(),
            type: 'USAGE',
            idempotencyKey: `sale:${sale.id}:${i.ingredientId}`,
            actorId: a.ctx.userId,
            sourceId: sale.id,
            reason: '판매 합산',
          },
        });
      }
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'CONFIRM',
          entityType: 'DailySale',
          entityId: sale.id,
          changeSummary: {
            businessDate: b.businessDate as string,
            quantity,
            revision: 1,
          },
        },
      });
      return sale;
    });
    return NextResponse.json(serialize(out), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'invalid request';
    return NextResponse.json(
      { error: msg },
      {
        status:
          msg === 'not found'
            ? 404
            : msg === 'conflict' || msg.includes('cutoff')
              ? 409
              : 400,
      },
    );
  }
}
