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
  if (a.ctx.role === 'STAFF')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const { status } = await req.json();
  if (!['OPEN', 'IN_PROGRESS', 'CANCELLED'].includes(status))
    return NextResponse.json({ error: 'invalid status' }, { status: 400 });
  try {
    const row = await prisma.$transaction(async (tx) => {
      const old = await tx.maintenanceRequest.findFirst({
        where: { id, storeId },
      });
      if (!old) throw Error('not found');
      if (old.status === 'COMPLETED' || old.status === 'CANCELLED')
        throw Error('conflict');
      const updated = await tx.maintenanceRequest.update({
        where: { id },
        data: { status },
      });
      await tx.maintenanceHistory.create({
        data: {
          storeId,
          facilityId: old.facilityId,
          requestId: id,
          eventType: status,
          memo: null,
          actorId: a.ctx.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'TRANSITION',
          entityType: 'MaintenanceRequest',
          entityId: id,
          changeSummary: { from: old.status, to: status },
        },
      });
      return updated;
    });
    return NextResponse.json(row);
  } catch (e) {
    const m = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: m },
      { status: m === 'not found' ? 404 : m === 'conflict' ? 409 : 400 },
    );
  }
}
