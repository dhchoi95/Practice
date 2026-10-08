import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  const rows = await prisma.reservation.findMany({
    where: { storeId },
    orderBy: { startAt: 'asc' },
    take: 250,
    include: { table: true },
  });
  return NextResponse.json(serialize(rows));
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (a.ctx.role === 'STAFF')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    if (
      typeof b.customerName !== 'string' ||
      !Number.isInteger(b.partySize) ||
      Number(b.partySize) < 1 ||
      typeof b.startAt !== 'string'
    )
      throw Error('invalid input');
    const start = new Date(b.startAt),
      end = b.endAt
        ? new Date(String(b.endAt))
        : new Date(start.getTime() + 90 * 60_000);
    if (
      isNaN(start.valueOf()) ||
      isNaN(end.valueOf()) ||
      start >= end ||
      end.getTime() - start.getTime() > 8 * 3600_000
    )
      throw Error('invalid time');
    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id"=${storeId} FOR UPDATE`;
      if (b.tableId) {
        const table = await tx.diningTable.findFirst({
          where: { id: String(b.tableId), storeId, active: true },
        });
        if (!table) throw Error('not found');
        if (table.capacity < Number(b.partySize)) throw Error('conflict');
        const conflict = await tx.reservation.findFirst({
          where: {
            storeId,
            tableId: String(b.tableId),
            status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
            startAt: { lt: end },
            endAt: { gt: start },
          },
        });
        if (conflict) throw Error('conflict');
      }
      const created = await tx.reservation.create({
        data: {
          storeId,
          customerName: b.customerName,
          phone: typeof b.phone === 'string' ? b.phone : null,
          startAt: start,
          endAt: end,
          partySize: Number(b.partySize),
          tableId: typeof b.tableId === 'string' ? b.tableId : null,
          source: typeof b.source === 'string' ? b.source : 'PHONE',
          note: typeof b.note === 'string' ? b.note : null,
          createdBy: a.ctx.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'CREATE',
          entityType: 'Reservation',
          entityId: created.id,
          changeSummary: {
            startAt: start.toISOString(),
            endAt: end.toISOString(),
            partySize: Number(b.partySize),
            tableId: created.tableId,
          },
        },
      });
      return created;
    });
    return NextResponse.json(serialize(row), { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: msg },
      { status: msg === 'conflict' ? 409 : 400 },
    );
  }
}
