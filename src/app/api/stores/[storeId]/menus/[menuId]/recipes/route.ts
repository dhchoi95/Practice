import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ storeId: string; menuId: string }> },
) {
  const { storeId, menuId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const menu = await prisma.menu.findFirst({ where: { id: menuId, storeId } });
  if (!menu) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(
    serialize(
      await prisma.recipe.findMany({
        where: { menuId },
        orderBy: { version: 'desc' },
        include: { items: { include: { ingredient: true } } },
      }),
    ),
  );
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; menuId: string }> },
) {
  const { storeId, menuId } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    if (!Array.isArray(b.items) || !b.items.length)
      throw Error('recipe items required');
    const items = b.items.map(
      (x: { ingredientId: string; quantity: string }) => ({
        ingredientId: String(x.ingredientId),
        quantity: String(x.quantity),
      }),
    );
    return NextResponse.json(
      serialize(
        await prisma.$transaction(async (tx) => {
          const menu = await tx.menu.findFirst({
            where: { id: menuId, storeId },
          });
          if (!menu) throw Error('not found');
          for (const x of items) {
            if (
              !/^\d+(\.\d{1,3})?$/.test(x.quantity) ||
              Number(x.quantity) <= 0
            )
              throw Error('invalid quantity');
            if (
              !(await tx.ingredient.findFirst({
                where: { id: x.ingredientId, storeId },
              }))
            )
              throw Error('ingredient not found');
          }
          const prev = await tx.recipe.findFirst({
            where: { menuId },
            orderBy: { version: 'desc' },
          });
          await tx.recipe.updateMany({
            where: { menuId, active: true },
            data: { active: false },
          });
          const now = new Date();
          const effectiveFrom = prev
            ? new Date(
                Date.UTC(
                  now.getUTCFullYear(),
                  now.getUTCMonth(),
                  now.getUTCDate() + 1,
                  15,
                ),
              )
            : now;
          return tx.recipe.create({
            data: {
              menuId,
              version: (prev?.version ?? 0) + 1,
              effectiveFrom,
              items: { create: items },
            },
          });
        }),
      ),
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'invalid' },
      { status: 400 },
    );
  }
}
