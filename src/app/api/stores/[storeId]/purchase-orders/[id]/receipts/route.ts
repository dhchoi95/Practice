import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { Prisma } from '@/generated/prisma/client';
import { serialize } from '@/lib/serialize';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; id: string }> },
) {
  const { storeId, id } = await params;
  const auth = await authorize(storeId, true, req);
  if ('response' in auth) return auth.response;
  if (!owner(auth.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    if (
      typeof body.idempotencyKey !== 'string' ||
      !body.idempotencyKey ||
      !Array.isArray(body.items) ||
      !body.items.length
    )
      throw Error('invalid input');
    const payloadHash = createHash('sha256')
      .update(JSON.stringify(body.items))
      .digest('hex');
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PurchaseOrder" WHERE "id"=${id} AND "storeId"=${storeId} FOR UPDATE`;
      const order = await tx.purchaseOrder.findFirst({
        where: { id, storeId },
        include: { items: true },
      });
      if (!order) throw Error('not found');
      const previous = await tx.purchaseReceipt.findUnique({
        where: {
          orderId_idempotencyKey: {
            orderId: id,
            idempotencyKey: body.idempotencyKey,
          },
        },
      });
      if (previous) {
        if (previous.payloadHash !== payloadHash) throw Error('conflict');
        return order;
      }
      if (!['ORDERED', 'PARTIALLY_RECEIVED'].includes(order.status))
        throw Error('conflict');
      const seen = new Set<string>();
      const receipts = body.items.map(
        (item: { ingredientId?: unknown; quantity?: unknown }) => {
          const ingredientId = String(item.ingredientId ?? '');
          if (seen.has(ingredientId)) throw Error('duplicate ingredient');
          seen.add(ingredientId);
          const purchaseItem = order.items.find(
            (x) => x.ingredientId === ingredientId,
          );
          const quantityText = String(item.quantity ?? '');
          if (!purchaseItem || !/^\d+(\.\d{1,3})?$/.test(quantityText))
            throw Error('invalid item');
          const quantity = new Prisma.Decimal(quantityText);
          if (
            quantity.lte(0) ||
            purchaseItem.receivedQty.plus(quantity).gt(purchaseItem.orderedQty)
          )
            throw Error('conflict');
          return { purchaseItem, quantity };
        },
      );
      for (const ingredientId of [...seen].sort()) {
        await tx.$queryRaw`SELECT "id" FROM "Inventory" WHERE "ingredientId"=${ingredientId} FOR UPDATE`;
      }
      for (const { purchaseItem, quantity } of receipts) {
        await tx.purchaseOrderItem.update({
          where: { id: purchaseItem.id },
          data: { receivedQty: { increment: quantity } },
        });
        await tx.inventory.upsert({
          where: { ingredientId: purchaseItem.ingredientId },
          create: {
            storeId,
            ingredientId: purchaseItem.ingredientId,
            quantity,
          },
          update: {
            quantity: { increment: quantity },
            version: { increment: 1 },
          },
        });
        await tx.inventoryTransaction.create({
          data: {
            storeId,
            ingredientId: purchaseItem.ingredientId,
            quantityDelta: quantity,
            type: 'RECEIPT',
            idempotencyKey: `po:${id}:${body.idempotencyKey}:${purchaseItem.ingredientId}`,
            actorId: auth.ctx.userId,
            sourceId: id,
            reason: '발주 입고',
          },
        });
      }
      await tx.purchaseReceipt.create({
        data: {
          orderId: id,
          idempotencyKey: body.idempotencyKey,
          payloadHash,
          actorId: auth.ctx.userId,
        },
      });
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: { orderId: id },
      });
      const complete = updatedItems.every((item) =>
        item.receivedQty.gte(item.orderedQty),
      );
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED' },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: auth.ctx.userId,
          action: 'RECEIVE',
          entityType: 'PurchaseOrder',
          entityId: id,
          changeSummary: {
            idempotencyKey: body.idempotencyKey,
            itemCount: receipts.length,
            status: updated.status,
          },
        },
      });
      return updated;
    });
    return NextResponse.json(serialize(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'invalid';
    return NextResponse.json(
      { error: message },
      {
        status:
          message === 'not found' ? 404 : message === 'conflict' ? 409 : 400,
      },
    );
  }
}
