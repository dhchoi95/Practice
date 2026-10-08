import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
export async function GET(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  const url = new URL(req.url),
    ingredientId = url.searchParams.get('ingredientId'),
    limit = Math.min(
      Math.max(Number(url.searchParams.get('limit') ?? 100), 1),
      250,
    );
  if (
    ingredientId &&
    !(await prisma.ingredient.findFirst({
      where: { id: ingredientId, storeId },
    }))
  )
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  const rows = await prisma.inventoryTransaction.findMany({
    where: { storeId, ...(ingredientId ? { ingredientId } : {}) },
    include: { ingredient: { select: { name: true, unit: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return NextResponse.json(serialize(rows));
}
