import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json(
    await prisma.storeMember.findMany({
      where: { storeId },
      select: {
        id: true,
        role: true,
        active: true,
        user: { select: { email: true, name: true, active: true } },
      },
    }),
  );
}
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const b = await req.json();
  if (
    typeof b.id !== 'string' ||
    (b.role !== undefined && !['OWNER', 'MANAGER', 'STAFF'].includes(b.role)) ||
    (b.active !== undefined && typeof b.active !== 'boolean') ||
    (b.role === undefined && b.active === undefined)
  )
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Store" WHERE "id"=${storeId} FOR UPDATE`;
      const member = await tx.storeMember.findFirst({
        where: { id: b.id, storeId },
      });
      if (!member) throw Error('not found');
      const removingOwner =
        member.role === 'OWNER' &&
        (b.active === false || (b.role !== undefined && b.role !== 'OWNER'));
      if (
        removingOwner &&
        (await tx.storeMember.count({
          where: { storeId, role: 'OWNER', active: true },
        })) <= 1
      )
        throw Error('cannot remove last owner');
      return tx.storeMember.update({
        where: { id: member.id },
        data: {
          ...(typeof b.role === 'string' ? { role: b.role } : {}),
          ...(typeof b.active === 'boolean' ? { active: b.active } : {}),
        },
      });
    });
    return NextResponse.json(row);
  } catch (e) {
    const m = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: m },
      {
        status:
          m === 'cannot remove last owner'
            ? 409
            : m === 'not found'
              ? 404
              : 400,
      },
    );
  }
}
