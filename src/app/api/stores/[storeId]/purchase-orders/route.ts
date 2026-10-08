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
  const rows = await prisma.purchaseOrder.findMany({
    where: { storeId },
    include: { supplier: true, items: { include: { ingredient: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  const visible = owner(a.ctx)
    ? rows
    : rows.map((order) => ({
        ...order,
        items: order.items.map(({ unitPriceWon, ...item }) => ({
          ...item,
          ingredient: (() => {
            const { unitCost, ...safe } = item.ingredient;
            return safe;
          })(),
        })),
      }));
  return NextResponse.json(serialize(visible));
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
    if (!Array.isArray(b.items) || !b.items.length)
      throw Error('items required');
    const result = await prisma.$transaction(async (tx) => {
      if (
        typeof b.supplierId === 'string' &&
        !(await tx.supplier.findFirst({ where: { id: b.supplierId, storeId } }))
      )
        throw Error('supplier not found');
      const seen = new Set<string>();
      const items = [];
      for (const x of b.items) {
        const ingredientId = String(x.ingredientId);
        if (seen.has(ingredientId)) throw Error('duplicate ingredient');
        seen.add(ingredientId);
        const ingredient = await tx.ingredient.findFirst({
          where: { id: ingredientId, storeId },
        });
        if (!ingredient) throw Error('ingredient not found');
        const qty = String(x.orderedQty);
        if (!/^\d+(\.\d{1,3})?$/.test(qty) || Number(qty) <= 0)
          throw Error('invalid quantity');
        items.push({
          ingredientId: ingredient.id,
          orderedQty: qty,
          unitPriceWon: BigInt(String(x.unitPriceWon ?? '0')),
        });
      }
      return tx.purchaseOrder.create({
        data: {
          storeId,
          supplierId: typeof b.supplierId === 'string' ? b.supplierId : null,
          createdBy: a.ctx.userId,
          note: typeof b.note === 'string' ? b.note : null,
          items: { create: items },
        },
      });
    });
    return NextResponse.json(serialize(result), { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'invalid' },
      { status: 400 },
    );
  }
}
