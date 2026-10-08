import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { parseWon } from '@/modules/rules';
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
    const b = await req.json(),
      amount = parseWon(b.amountWon),
      payloadHash = amount.toString();
    if (
      typeof b.idempotencyKey !== 'string' ||
      !b.idempotencyKey ||
      amount <= 0n
    )
      throw Error('invalid input');
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "DailySale" WHERE "id"=${id} AND "storeId"=${storeId} FOR UPDATE`;
      const sale = await tx.dailySale.findFirst({
        where: { id, storeId },
        include: { events: true },
      });
      if (!sale) throw Error('not found');
      const duplicate = sale.events.find(
        (e) => e.idempotencyKey === b.idempotencyKey,
      );
      if (duplicate) {
        if (duplicate.payloadHash !== payloadHash) throw Error('conflict');
        return sale;
      }
      const refunded = sale.events
        .filter((e) => e.kind === 'REFUND')
        .reduce((n, e) => n - e.amountDelta, 0n);
      const net = sale.unitPriceWon * BigInt(sale.quantity) - sale.discountWon;
      if (refunded + amount > net) throw Error('refund exceeds sale');
      await tx.dailySale.update({
        where: { id },
        data: { refundWon: { increment: amount } },
      });
      await tx.saleEvent.create({
        data: {
          saleId: id,
          kind: 'REFUND',
          revision: sale.revision,
          quantityDelta: 0,
          amountDelta: -amount,
          idempotencyKey: b.idempotencyKey,
          payloadHash,
          businessDate: sale.businessDate,
        },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'REFUND',
          entityType: 'DailySale',
          entityId: id,
          changeSummary: { amountWon: amount.toString() },
        },
      });
      return await tx.dailySale.findUniqueOrThrow({ where: { id } });
    });
    return NextResponse.json(serialize(result));
  } catch (e) {
    const m = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: m },
      {
        status:
          m === 'not found'
            ? 404
            : m.includes('exceeds') || m === 'conflict'
              ? 409
              : 400,
      },
    );
  }
}
