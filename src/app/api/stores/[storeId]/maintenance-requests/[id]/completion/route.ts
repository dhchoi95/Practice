import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; id: string }> },
) {
  const { storeId, id } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (a.ctx.role === 'STAFF')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    if (b.costWon !== undefined && !owner(a.ctx)) throw Error('forbidden');
    const amount = b.costWon === undefined ? null : BigInt(String(b.costWon));
    if (amount !== null && amount < 0n) throw Error('invalid amount');
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "MaintenanceRequest" WHERE "id"=${id} AND "storeId"=${storeId} FOR UPDATE`;
      const row = await tx.maintenanceRequest.findFirst({
        where: { id, storeId },
      });
      if (!row) throw Error('not found');
      if (row.status === 'CANCELLED') throw Error('conflict');
      const existing = await tx.financialTransaction.findFirst({
        where: { storeId, sourceType: 'MAINTENANCE', sourceId: id },
      });
      if (existing && amount !== null && existing.amountWon !== amount)
        throw Error('conflict');
      let transactionId = existing?.id;
      if (amount && amount > 0n && !existing) {
        const fin = await tx.financialTransaction.create({
          data: {
            storeId,
            type: 'EXPENSE',
            category: '수리비',
            amountWon: amount,
            occurredAt: new Date(),
            sourceType: 'MAINTENANCE',
            sourceId: id,
            idempotencyKey: `maintenance:${id}`,
            actorId: a.ctx.userId,
            description: row.title,
          },
        });
        transactionId = fin.id;
      }
      const completed = await tx.maintenanceRequest.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: row.completedAt ?? new Date(),
          ...(amount !== null ? { costWon: amount } : {}),
        },
      });
      const lastHistory = await tx.maintenanceHistory.findFirst({
        where: { requestId: id, eventType: 'COMPLETED' },
      });
      if (!lastHistory)
        await tx.maintenanceHistory.create({
          data: {
            storeId,
            facilityId: row.facilityId,
            requestId: id,
            eventType: 'COMPLETED',
            memo: row.title,
            actorId: a.ctx.userId,
            financialTransactionId: transactionId,
          },
        });
      else if (transactionId && !lastHistory.financialTransactionId)
        await tx.maintenanceHistory.update({
          where: { id: lastHistory.id },
          data: {
            financialTransactionId: transactionId,
            actorId: a.ctx.userId,
          },
        });
      const other = await tx.maintenanceRequest.count({
        where: {
          storeId,
          facilityId: row.facilityId,
          id: { not: id },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });
      await tx.facility.update({
        where: { id: row.facilityId },
        data: { status: other ? 'REPAIR_NEEDED' : 'NORMAL' },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'COMPLETE',
          entityType: 'MaintenanceRequest',
          entityId: id,
          changeSummary: { costRecorded: !!transactionId },
        },
      });
      return completed;
    });
    return NextResponse.json(serialize(result));
  } catch (e) {
    const m = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: m },
      {
        status:
          m === 'forbidden'
            ? 403
            : m === 'not found'
              ? 404
              : m === 'conflict'
                ? 409
                : 400,
      },
    );
  }
}
