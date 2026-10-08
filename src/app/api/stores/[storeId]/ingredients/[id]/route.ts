import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
const valid = (x: unknown) =>
  typeof x === 'string' && /^\d+(\.\d{1,3})?$/.test(x);
export async function PATCH(
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
      old = await prisma.ingredient.findFirst({ where: { id, storeId } });
    if (!old) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (
      b.unit &&
      b.unit !== old.unit &&
      (await prisma.inventoryTransaction.count({
        where: { storeId, ingredientId: id },
      }))
    )
      throw Error('unit cannot change after inventory activity');
    const minimumQty = String(b.minimumQty ?? old.minimumQty),
      targetQty = String(b.targetQty ?? old.targetQty),
      packQty = String(b.packQty ?? old.packQty);
    if (
      !valid(minimumQty) ||
      !valid(targetQty) ||
      !valid(packQty) ||
      Number(targetQty) < Number(minimumQty) ||
      Number(packQty) <= 0
    )
      throw Error('invalid stock policy');
    const row = await prisma.ingredient.update({
      where: { id },
      data: {
        minimumQty,
        targetQty,
        packQty,
        ...(typeof b.name === 'string' ? { name: b.name } : {}),
        ...(typeof b.unit === 'string' ? { unit: b.unit } : {}),
        ...(valid(b.unitCost) ? { unitCost: String(b.unitCost) } : {}),
      },
    });
    return NextResponse.json(serialize(row));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'invalid' },
      { status: 400 },
    );
  }
}
