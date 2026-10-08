import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { prisma } from '@/lib/db';
export default async function Home() {
  const u = await currentUser();
  if (!u) redirect('/login');
  const m = await prisma.storeMember.findFirst({
    where: { userId: u.id, active: true, store: { active: true } },
    orderBy: { store: { createdAt: 'asc' } },
  });
  if (!m) redirect('/login');
  redirect(`/${m.storeId}/dashboard`);
}
