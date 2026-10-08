import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const stores = await prisma.storeMember.findMany({
    where: { userId: u.id, active: true, store: { active: true } },
    select: {
      role: true,
      store: { select: { id: true, name: true, timezone: true } },
    },
  });
  return NextResponse.json(stores);
}
