import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string; id: string }> },
) {
  const { storeId, id } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  try {
    const b = await req.json();
    if (typeof b.reason !== 'string' || !b.reason.trim())
      throw Error('reason required');
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "FinancialTransaction" WHERE "id"=${id} AND "storeId"=${storeId} FOR UPDATE`;
      const original = await tx.financialTransaction.findFirst({
        where: { id, storeId },
      });
      if (!original) throw Error('not found');
      if (original.sourceType === 'REVERSAL') throw Error('conflict');
      const existing = await tx.financialTransaction.findFirst({
        where: { storeId, sourceType: 'REVERSAL', sourceId: id },
      });
      if (existing) {
        if (existing.description !== b.reason.trim()) throw Error('conflict');
        return existing;
      }
      const reversed = await tx.financialTransaction.create({
        data: {
          storeId,
          occurredAt: new Date(),
          type: original.type === 'INCOME' ? 'EXPENSE' : 'INCOME',
          category: original.category,
          amountWon: original.amountWon,
          description: b.reason.trim(),
          sourceType: 'REVERSAL',
          sourceId: id,
          idempotencyKey: `reversal:${id}`,
          actorId: a.ctx.userId,
        },
      });
      await tx.auditLog.create({
        data: {
          storeId,
          actorId: a.ctx.userId,
          action: 'REVERSE',
          entityType: 'FinancialTransaction',
          entityId: original.id,
          changeSummary: { reversalId: reversed.id, reason: b.reason.trim() },
        },
      });
      return reversed;
    });
    return NextResponse.json(serialize(result));
  } catch (e) {
    const m = e instanceof Error ? e.message : 'invalid';
    return NextResponse.json(
      { error: m },
      { status: m === 'not found' ? 404 : m === 'conflict' ? 409 : 400 },
    );
  }
}
