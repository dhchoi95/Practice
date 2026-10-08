import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
const seoulDate = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
const seoulStart = (day: string) => new Date(`${day}T00:00:00+09:00`);
const dateKey = (day: string) => new Date(`${day}T00:00:00Z`);
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  const now = new Date(),
    day = seoulDate(now),
    month = day.slice(0, 7),
    todayFrom = seoulStart(day),
    todayTo = new Date(todayFrom.getTime() + 86400000),
    monthFrom = seoulStart(`${month}-01`),
    [year, monthNumber] = month.split('-').map(Number),
    nextMonth = seoulStart(
      `${monthNumber === 12 ? year + 1 : year}-${String(monthNumber === 12 ? 1 : monthNumber + 1).padStart(2, '0')}-01`,
    ),
    monthDayTo = dateKey(seoulDate(nextMonth));
  const [
    dailySales,
    allIngredients,
    reservations,
    orders,
    overdue,
    lastSale,
    todayEvents,
  ] = await Promise.all([
    prisma.dailySale.findMany({
      where: { storeId, businessDate: dateKey(day) },
    }),
    prisma.ingredient.findMany({
      where: { storeId, active: true },
      include: { inventory: true },
    }),
    prisma.reservation.findMany({
      where: {
        storeId,
        startAt: { lt: todayTo },
        endAt: { gt: todayFrom },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    }),
    prisma.purchaseOrder.count({
      where: {
        storeId,
        status: { in: ['DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED'] },
      },
    }),
    prisma.facility.count({
      where: { storeId, nextInspectionAt: { lt: now } },
    }),
    prisma.dailySale.findFirst({
      where: { storeId },
      orderBy: { businessDate: 'desc' },
    }),
    prisma.saleEvent.findMany({
      where: {
        sale: { storeId },
        OR: [
          {
            kind: { in: ['CONFIRMED', 'CORRECTION'] },
            businessDate: dateKey(day),
          },
          { kind: 'REFUND', occurredAt: { gte: todayFrom, lt: todayTo } },
        ],
      },
    }),
  ]);
  const lowStock = allIngredients.filter((i) =>
    i.inventory?.quantity.lte(i.minimumQty),
  );
  const result: Record<string, unknown> = {
    businessDate: day,
    lastSaleDate: lastSale?.businessDate.toISOString(),
    lastBusinessDate: lastSale?.businessDate.toISOString(),
    todaySaleEntered: dailySales.length > 0,
    reservationCount: reservations.length,
    reservationGuests: reservations.reduce((n, r) => n + r.partySize, 0),
    lowStockCount: lowStock.length,
    lowStock: lowStock.map((i) => ({
      id: i.id,
      ingredientId: i.id,
      name: i.name,
      unit: i.unit,
      currentQty: i.inventory?.quantity.toString() ?? '0',
      minimumQty: i.minimumQty.toString(),
      targetQty: i.targetQty.toString(),
    })),
    openPurchaseOrders: orders,
    overdueInspections: overdue,
  };
  if (owner(a.ctx)) {
    const [monthEvents, finances, todayExpenses] = await Promise.all([
      prisma.saleEvent.findMany({
        where: {
          sale: { storeId },
          OR: [
            {
              kind: { in: ['CONFIRMED', 'CORRECTION'] },
              businessDate: { gte: dateKey(`${month}-01`), lt: monthDayTo },
            },
            { kind: 'REFUND', occurredAt: { gte: monthFrom, lt: nextMonth } },
          ],
        },
      }),
      prisma.financialTransaction.findMany({
        where: { storeId, occurredAt: { gte: monthFrom, lt: nextMonth } },
      }),
      prisma.financialTransaction.findMany({
        where: {
          storeId,
          type: 'EXPENSE',
          occurredAt: { gte: todayFrom, lt: todayTo },
        },
      }),
    ]);
    const excluded = new Set(['자금투입', '대출', '이체']);
    const todayRevenue = todayEvents.reduce((n, e) => n + e.amountDelta, 0n),
      monthRevenue = monthEvents.reduce((n, e) => n + e.amountDelta, 0n),
      todayCost = todayExpenses
        .filter((f) => !excluded.has(f.category))
        .reduce((n, f) => n + f.amountWon, 0n),
      expense = finances
        .filter((f) => f.type === 'EXPENSE' && !excluded.has(f.category))
        .reduce((n, f) => n + f.amountWon, 0n),
      income = finances
        .filter((f) => f.type === 'INCOME' && !excluded.has(f.category))
        .reduce((n, f) => n + f.amountWon, 0n),
      profit = monthRevenue + income - expense;
    result.todaySalesWon = todayRevenue.toString();
    result.todaySaleEntered = dailySales.length > 0;
    result.monthSalesWon = monthRevenue.toString();
    result.todayExpenseWon = todayCost.toString();
    result.estimatedProfitWon = profit.toString();
    result.saleQuantity = dailySales.reduce((n, s) => n + s.quantity, 0);
  }
  return NextResponse.json(serialize(result));
}
