import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  const rows = await prisma.maintenanceRequest.findMany({
    where: { storeId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: { facility: { select: { name: true } } },
  });
  return NextResponse.json(
    serialize(
      rows.map((r) => (a.ctx.role === 'OWNER' ? r : { ...r, costWon: null })),
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
  const b = await req.json();
  if (
    typeof b.facilityId !== 'string' ||
    typeof b.title !== 'string' ||
    !b.title.trim()
  )
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  const facility = await prisma.facility.findFirst({
    where: { id: b.facilityId, storeId },
  });
  if (!facility)
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  const row = await prisma.$transaction(async (tx) => {
    const request = await tx.maintenanceRequest.create({
      data: {
        storeId,
        facilityId: facility.id,
        title: b.title.trim(),
        description: typeof b.description === 'string' ? b.description : null,
        reportedBy: a.ctx.userId,
      },
    });
    await tx.facility.update({
      where: { id: facility.id },
      data: { status: 'REPAIR_NEEDED' },
    });
    await tx.maintenanceHistory.create({
      data: {
        storeId,
        facilityId: facility.id,
        requestId: request.id,
        eventType: 'ISSUE_REPORTED',
        memo: request.title,
        actorId: a.ctx.userId,
      },
    });
    await tx.auditLog.create({
      data: {
        storeId,
        actorId: a.ctx.userId,
        action: 'CREATE',
        entityType: 'MaintenanceRequest',
        entityId: request.id,
        changeSummary: { status: 'OPEN' },
      },
    });
    return request;
  });
  return NextResponse.json(serialize(row), { status: 201 });
}
