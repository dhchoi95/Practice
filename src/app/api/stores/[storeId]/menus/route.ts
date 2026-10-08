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
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json(
    serialize(
      await prisma.menu.findMany({
        where: { storeId, active: true },
        include: {
          recipes: {
            where: { active: true },
            orderBy: { version: 'desc' },
            take: 1,
            include: { items: { include: { ingredient: true } } },
          },
        },
      }),
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
    if (typeof b.name !== 'string' || !b.name.trim())
      throw Error('name required');
    const price = BigInt(String(b.priceWon));
    if (price < 0n) throw Error('invalid price');
    return NextResponse.json(
      serialize(
        await prisma.menu.create({
          data: { storeId, name: b.name.trim(), priceWon: price },
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
