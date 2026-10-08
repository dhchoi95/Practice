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
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const rows = await prisma.financialTransaction.findMany({
    where: { storeId },
    orderBy: { occurredAt: 'desc' },
    take: 250,
  });
  const reversed = new Set(
    (
      await prisma.financialTransaction.findMany({
        where: { storeId, sourceType: 'REVERSAL' },
        select: { sourceId: true },
      })
    ).map((x) => x.sourceId),
  );
  return NextResponse.json(
    serialize(
      rows.map((x) => ({
        ...x,
        reversed: x.sourceType === 'REVERSAL' ? false : reversed.has(x.id),
      })),
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
    if (
      !['INCOME', 'EXPENSE'].includes(b.type) ||
      typeof b.category !== 'string' ||
      typeof b.idempotencyKey !== 'string' ||
      !b.idempotencyKey
    )
      throw Error('invalid input');
    const amount = BigInt(String(b.amountWon));
    if (amount <= 0n) throw Error('invalid amount');
    const occurredAt = b.occurredAt ? new Date(b.occurredAt) : new Date();
    if (isNaN(occurredAt.valueOf())) throw Error('invalid date');
    const row = await prisma.$transaction(async (tx) => {
      const old = await tx.financialTransaction.findUnique({
        where: {
          storeId_idempotencyKey: { storeId, idempotencyKey: b.idempotencyKey },
        },
      });
      if (old) {
        if (
          old.type !== b.type ||
          old.amountWon !== amount ||
          old.category !== b.category ||
          old.description !==
            (typeof b.description === 'string' ? b.description : null) ||
          old.occurredAt.getTime() !== occurredAt.getTime()
        )
          throw Error('conflict');
        return old;
      }
      const created = await tx.financialTransaction.create({
        data: {
          storeId,
          type: b.type,
          category: b.category,
          amountWon: amount,
          occurredAt,
          description: typeof b.description === 'string' ? b.description : null,
          idempotencyKey: b.idempotencyKey,
          actorId: a.ctx.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'CREATE',
          entityType: 'FinancialTransaction',
          entityId: created.id,
          changeSummary: {
            type: created.type,
            category: created.category,
            amountWon: created.amountWon.toString(),
          },
        },
      });
      return created;
    });
    return NextResponse.json(serialize(row), { status: 201 });
  } catch (e) {
    const m = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: m },
      { status: m === 'conflict' ? 409 : 400 },
    );
  }
}
