import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
export async function PATCH(
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
    const updated = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id"=${storeId} FOR UPDATE`;
      const old = await tx.reservation.findFirst({ where: { id, storeId } });
      if (!old) throw Error('not found');
      const startAt = b.startAt ? new Date(String(b.startAt)) : old.startAt,
        endAt = b.endAt
          ? new Date(String(b.endAt))
          : b.startAt
            ? new Date(
                startAt.getTime() + old.endAt.getTime() - old.startAt.getTime(),
              )
            : old.endAt,
        partySize =
          b.partySize === undefined ? old.partySize : Number(b.partySize),
        tableId =
          b.tableId === null
            ? null
            : typeof b.tableId === 'string'
              ? b.tableId
              : old.tableId;
      if (
        isNaN(startAt.valueOf()) ||
        isNaN(endAt.valueOf()) ||
        startAt >= endAt ||
        endAt.getTime() - startAt.getTime() > 8 * 3600000 ||
        !Number.isInteger(partySize) ||
        partySize < 1
      )
        throw Error('invalid input');
      if (tableId) {
        const table = await tx.diningTable.findFirst({
          where: { id: tableId, storeId, active: true },
        });
        if (!table) throw Error('not found');
        if (partySize > table.capacity) throw Error('conflict');
        if (['PENDING', 'CONFIRMED', 'SEATED'].includes(old.status)) {
          const overlap = await tx.reservation.findFirst({
            where: {
              id: { not: id },
              storeId,
              tableId,
              status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
              startAt: { lt: endAt },
              endAt: { gt: startAt },
            },
          });
          if (overlap) throw Error('conflict');
        }
      }
      const row = await tx.reservation.update({
        where: { id },
        data: {
          startAt,
          endAt,
          partySize,
          tableId,
          ...(typeof b.customerName === 'string'
            ? { customerName: b.customerName.trim() }
            : {}),
          ...(typeof b.phone === 'string' || b.phone === null
            ? { phone: b.phone }
            : {}),
          ...(typeof b.source === 'string' ? { source: b.source } : {}),
          ...(typeof b.note === 'string' || b.note === null
            ? { note: b.note }
            : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'UPDATE',
          entityType: 'Reservation',
          entityId: id,
          changeSummary: {
            startAt: startAt.toISOString(),
            endAt: endAt.toISOString(),
            partySize,
            tableId,
          },
        },
      });
      return row;
    });
    return NextResponse.json(serialize(updated));
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
