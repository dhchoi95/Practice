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
  const facilities = await prisma.facility.findMany({
    where: { storeId },
    include: { maintenance: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
  const safe = facilities.map((f) =>
    a.ctx.role === 'OWNER'
      ? f
      : {
          ...f,
          maintenance: f.maintenance.map((m) => ({ ...m, costWon: null })),
        },
  );
  return NextResponse.json(serialize(safe));
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
    serialize(
      await prisma.facility.create({
        data: {
          storeId,
          name: b.name,
          category: String(b.category ?? 'OTHER'),
          nextInspectionAt: b.nextInspectionAt
            ? new Date(b.nextInspectionAt)
            : null,
          memo: typeof b.memo === 'string' ? b.memo : null,
        },
      }),
    ),
    { status: 201 },
  );
}
