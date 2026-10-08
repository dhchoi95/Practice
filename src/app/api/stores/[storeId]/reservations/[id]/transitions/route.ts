import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth';
import { prisma } from '@/lib/db';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; id: string }> },
) {
  const { storeId, id } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  try {
    const { status } = await req.json();
    if (
      !['SEATED', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'CONFIRMED'].includes(
        status,
      )
    )
      throw Error('invalid status');
    if (a.ctx.role === 'STAFF' && status !== 'SEATED') throw Error('forbidden');
    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id"=${storeId} FOR UPDATE`;
      const r = await tx.reservation.findFirst({ where: { id, storeId } });
      if (!r) throw Error('not found');
      const allowed: Record<string, string[]> = {
        PENDING: ['CONFIRMED', 'SEATED', 'CANCELLED', 'NO_SHOW'],
        CONFIRMED: ['SEATED', 'CANCELLED', 'NO_SHOW'],
        SEATED: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
        NO_SHOW: [],
      };
      if (!allowed[r.status].includes(status)) throw Error('conflict');
      if (r.tableId && ['CONFIRMED', 'SEATED'].includes(status)) {
        const collision = await tx.reservation.findFirst({
          where: {
            id: { not: id },
            storeId,
            tableId: r.tableId,
            status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
            startAt: { lt: r.endAt },
            endAt: { gt: r.startAt },
          },
        });
        if (collision) throw Error('conflict');
      }
      const updated = await tx.reservation.update({
        where: { id },
        data: { status },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'TRANSITION',
          entityType: 'Reservation',
          entityId: id,
          changeSummary: { from: r.status, to: status },
        },
      });
      return updated;
    });
    return NextResponse.json(row);
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
