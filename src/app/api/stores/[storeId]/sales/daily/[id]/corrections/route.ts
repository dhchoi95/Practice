import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseWon, saleNet } from '@/modules/rules';
import { serialize } from '@/lib/serialize';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; id: string }> },
) {
  const { storeId, id } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    if (
      !Number.isInteger(b.quantity) ||
      Number(b.quantity) < 0 ||
      typeof b.idempotencyKey !== 'string' ||
      !Number.isInteger(b.revision) ||
      (b.reason !== undefined &&
        (typeof b.reason !== 'string' || b.reason.length > 500))
    )
      throw Error('invalid input');
    const quantity = Number(b.quantity),
      price = parseWon(b.unitPriceWon),
      discount = parseWon(b.discountWon ?? '0'),
      reason =
        typeof b.reason === 'string' && b.reason.trim()
          ? b.reason.trim()
          : '판매 기록 정정',
      payloadHash = JSON.stringify({
        quantity,
        price: price.toString(),
        discount: discount.toString(),
        reason,
      });
    saleNet(quantity, price, discount);
    const sale = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "DailySale" WHERE "id"=${id} AND "storeId"=${storeId} FOR UPDATE`;
      const old = await tx.dailySale.findFirst({
        where: { id, storeId },
        include: { events: true },
      });
      if (!old) throw Error('not found');
      const duplicate = old.events.find(
        (e) => e.idempotencyKey === b.idempotencyKey,
      );
      if (duplicate) {
        if (duplicate.payloadHash !== payloadHash) throw Error('conflict');
        return old;
      }
      if (b.revision !== old.revision) throw Error('conflict');
      const diff = quantity - old.quantity;
      const recipe = Array.isArray(old.recipeSnapshot)
        ? (old.recipeSnapshot as Array<{
            ingredientId: string;
            quantity: string;
          }>)
        : [];
      const cutoff = new Date(old.businessDate.getTime() - 9 * 3600000);
      const ingredientIds = recipe.map((x) => x.ingredientId).sort();
      if (diff !== 0)
        for (const ingredientId of ingredientIds)
          await tx.$queryRaw`SELECT "id" FROM "Inventory" WHERE "ingredientId"=${ingredientId} FOR UPDATE`;
      const count =
        diff !== 0 && recipe.length
          ? await tx.inventoryTransaction.findFirst({
              where: {
                storeId,
                ingredientId: { in: ingredientIds },
                type: 'COUNT',
                createdAt: { gte: cutoff },
              },
            })
          : null;
      if (count) throw Error('count cutoff requires manual reconciliation');
      if (diff !== 0)
        for (const item of recipe) {
          const delta = new (
            await import('@/generated/prisma/client')
          ).Prisma.Decimal(item.quantity).mul(diff);
          await tx.inventory.update({
            where: { ingredientId: item.ingredientId },
            data: { quantity: { decrement: delta }, version: { increment: 1 } },
          });
          await tx.inventoryTransaction.create({
            data: {
              storeId,
              ingredientId: item.ingredientId,
              quantityDelta: delta.neg(),
              type: 'SALE_CORRECTION',
              idempotencyKey: `correction:${id}:${b.idempotencyKey}:${item.ingredientId}`,
              sourceId: id,
              actorId: a.ctx.userId,
              reason: '판매 수량 정정',
            },
          });
        }
      const amount = saleNet(quantity, price, discount),
        prev = saleNet(old.quantity, old.unitPriceWon, old.discountWon);
      if (old.refundWon > amount) throw Error('conflict');
      const updated = await tx.dailySale.update({
        where: { id },
        data: {
          quantity,
          unitPriceWon: price,
          discountWon: discount,
          revision: { increment: 1 },
        },
      });
      await tx.saleEvent.create({
        data: {
          saleId: id,
          kind: 'CORRECTION',
          revision: updated.revision,
          quantityDelta: diff,
          amountDelta: amount - prev,
          idempotencyKey: b.idempotencyKey,
          payloadHash,
          businessDate: old.businessDate,
        },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'CORRECT',
          entityType: 'DailySale',
          entityId: id,
          changeSummary: {
            quantity,
            revision: updated.revision,
            amountDelta: (amount - prev).toString(),
            reason,
          },
        },
      });
      return updated;
    });
    return NextResponse.json(serialize(sale));
  } catch (e) {
    const m = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: m },
      {
        status:
          m === 'not found'
            ? 404
            : m.includes('cutoff') || m === 'conflict'
              ? 409
              : 400,
      },
    );
  }
}
