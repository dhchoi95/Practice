import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ storeId: string; menuId: string }> },
) {
  const { storeId, menuId: id } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    const menu = await prisma.menu.findFirst({ where: { id, storeId } });
    if (!menu)
      return NextResponse.json({ error: 'not found' }, { status: 404 });
    const priceWon = BigInt(String(b.priceWon));
    if (priceWon < 0n || typeof b.name !== 'string' || !b.name.trim())
      throw Error('invalid menu');
    return NextResponse.json(
      serialize(
        await prisma.menu.update({
          where: { id },
          data: { name: b.name.trim(), priceWon },
        }),
      ),
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'invalid' },
      { status: 400 },
    );
  }
}
