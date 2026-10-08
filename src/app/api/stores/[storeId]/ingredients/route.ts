import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
function valid(s: unknown) {
  return typeof s === 'string' && /^\d+(\.\d{1,3})?$/.test(s);
}
export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  const rows = await prisma.ingredient.findMany({
    where: { storeId, active: true },
    include: { inventory: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(
    serialize(
      rows.map((i) =>
        a.ctx.role === 'OWNER' ? i : { ...i, unitCost: undefined },
      ),
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
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    const minimumQty = String(b.minimumQty ?? '0'),
      targetQty = String(b.targetQty ?? '1'),
      packQty = String(b.packQty ?? '1');
    if (
      typeof b.name !== 'string' ||
      !b.name.trim() ||
      typeof b.unit !== 'string' ||
      !valid(minimumQty) ||
      !valid(targetQty) ||
      !valid(packQty) ||
      Number(targetQty) < Number(minimumQty) ||
      Number(packQty) <= 0
    )
      throw Error('invalid ingredient or stock policy');
    const ingredient = await prisma.ingredient.create({
      data: {
        storeId,
        name: b.name.trim(),
        unit: b.unit,
        minimumQty,
        targetQty,
        packQty,
        unitCost: valid(b.unitCost) ? String(b.unitCost) : '0',
        inventory: { create: { storeId, quantity: 0 } },
      },
    });
    return NextResponse.json(serialize(ingredient), { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'invalid' },
      { status: 400 },
    );
  }
}
