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
  const month =
    new URL(req.url).searchParams.get('month') ??
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
    }).format(new Date());
  if (!/^\d{4}-\d{2}$/.test(month))
    return NextResponse.json({ error: 'invalid month' }, { status: 400 });
  const [year, monthNumber] = month.split('-').map(Number),
    nextYear = monthNumber === 12 ? year + 1 : year,
    nextMonthNumber = monthNumber === 12 ? 1 : monthNumber + 1;
  const from = new Date(`${month}-01T00:00:00+09:00`),
    to = new Date(
      `${nextYear}-${String(nextMonthNumber).padStart(2, '0')}-01T00:00:00+09:00`,
    );
  const dayFrom = new Date(`${month}-01T00:00:00Z`),
    dayTo = new Date(
      `${nextYear}-${String(nextMonthNumber).padStart(2, '0')}-01T00:00:00Z`,
    );
  const [events, finances] = await Promise.all([
    prisma.saleEvent.findMany({
      where: {
        sale: { storeId },
        OR: [
          {
            kind: { in: ['CONFIRMED', 'CORRECTION'] },
            businessDate: { gte: dayFrom, lt: dayTo },
          },
          { kind: 'REFUND', occurredAt: { gte: from, lt: to } },
        ],
      },
    }),
    prisma.financialTransaction.findMany({
      where: { storeId, occurredAt: { gte: from, lt: to } },
    }),
  ]);
  const revenue = events.reduce((n, x) => n + x.amountDelta, 0n);
  const excluded = new Set(['자금투입', '대출', '이체']);
  const income = finances
      .filter((x) => x.type === 'INCOME' && !excluded.has(x.category))
      .reduce((n, x) => n + x.amountWon, 0n),
    expense = finances
      .filter((x) => x.type === 'EXPENSE' && !excluded.has(x.category))
      .reduce((n, x) => n + x.amountWon, 0n),
    profit = revenue + income - expense;
  return NextResponse.json(
    serialize({
      month,
      revenueWon: revenue,
      salesWon: revenue,
      otherIncomeWon: income,
      expenseWon: expense,
      estimatedOperatingProfitWon: profit,
      profitWon: profit,
    }),
  );
}
