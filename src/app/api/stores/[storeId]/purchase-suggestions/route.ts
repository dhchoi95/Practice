import { NextResponse } from 'next/server';
import { authorize } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { recommendOrderDecimal } from '@/modules/rules';
import { serialize } from '@/lib/serialize';
function milli(s: string) {
  const [whole, frac = ''] = s.split('.');
  return BigInt(whole) * 1000n + BigInt(frac.padEnd(3, '0'));
}
function quantity(n: bigint) {
  const w = n / 1000n,
    f = String(n % 1000n)
      .padStart(3, '0')
      .replace(/0+$/, '');
  return f ? `${w}.${f}` : String(w);
}
export async function GET(
  _r: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId);
  if ('response' in a) return a.response;
  const items = await prisma.ingredient.findMany({
    where: { storeId, active: true },
    include: {
      inventory: true,
      orderItems: {
        where: { order: { status: { in: ['ORDERED', 'PARTIALLY_RECEIVED'] } } },
        include: { order: true },
      },
    },
  });
  const result = items
    .map((i) => {
      const incoming = quantity(
        i.orderItems.reduce(
          (sum, x) =>
            sum +
            milli(x.orderedQty.toString()) -
            milli(x.receivedQty.toString()),
          0n,
        ),
      );
      const recommendedQty = recommendOrderDecimal(
        i.inventory?.quantity.toString() ?? '0',
        i.minimumQty.toString(),
        i.targetQty.toString(),
        i.packQty.toString(),
        incoming,
      );
      return {
        ingredientId: i.id,
        name: i.name,
        unit: i.unit,
        currentQty: i.inventory?.quantity.toString() ?? '0',
        minimumQty: i.minimumQty.toString(),
        targetQty: i.targetQty.toString(),
        packQty: i.packQty.toString(),
        incomingQty: incoming,
        recommendedQty,
      };
    })
    .filter((x) => x.recommendedQty !== '0');
  return NextResponse.json(serialize(result));
}
