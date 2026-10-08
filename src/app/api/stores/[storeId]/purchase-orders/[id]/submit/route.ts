import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
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
    const order = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "PurchaseOrder" WHERE "id"=${id} AND "storeId"=${storeId} FOR UPDATE`;
      const current = await tx.purchaseOrder.findFirst({
        where: { id, storeId },
        include: { items: true },
      });
      if (!current) throw Error('not found');
      if (current.status !== 'DRAFT' || !current.items.length)
        throw Error('conflict');
      const updated = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'ORDERED' },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: auth.ctx.userId,
          action: 'SUBMIT',
          entityType: 'PurchaseOrder',
          entityId: id,
          changeSummary: { status: updated.status },
        },
      });
      return updated;
    });
    return NextResponse.json(serialize(order));
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
