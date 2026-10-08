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
    await prisma.diningTable.findMany({
      where: { storeId, active: true },
      orderBy: { label: 'asc' },
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
  if (
    typeof b.label !== 'string' ||
    !Number.isInteger(b.capacity) ||
    b.capacity < 1
  )
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  return NextResponse.json(
    await prisma.diningTable.create({
      data: { storeId, label: b.label, capacity: b.capacity },
    }),
    { status: 201 },
  );
}
