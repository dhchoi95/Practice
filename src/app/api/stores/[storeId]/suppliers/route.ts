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
  return NextResponse.json(
    await prisma.supplier.findMany({
      where: { storeId, active: true },
      orderBy: { name: 'asc' },
    }),
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
  const b = await req.json();
  if (typeof b.name !== 'string' || !b.name.trim())
    return NextResponse.json({ error: 'name required' }, { status: 400 });
  return NextResponse.json(
    await prisma.supplier.create({
      data: {
        storeId,
        name: b.name.trim(),
        contact: typeof b.contact === 'string' ? b.contact : null,
      },
    }),
    { status: 201 },
  );
}
