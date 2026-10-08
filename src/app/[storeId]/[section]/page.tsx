import { notFound, redirect } from 'next/navigation';
import { context } from '@/lib/auth';
import Workspace from '@/components/workspace';
import { prisma } from '@/lib/db';
const sections = [
  'dashboard',
  'sales',
  'inventory',
  'purchasing',
  'reservations',
  'facilities',
  'finance',
  'settings',
];
export default async function Page({
  params,
}: {
  params: Promise<{ storeId: string; section: string }>;
}) {
  const { storeId, section } = await params;
  if (!sections.includes(section)) notFound();
  const c = await context(storeId);
  if (!c) redirect('/login');
  if (
    c.role !== 'OWNER' &&
    ['sales', 'finance', 'settings', 'purchasing'].includes(section)
  )
    return (
      <div className="notice error">이 화면은 사장님만 이용할 수 있습니다.</div>
    );
  const demo = await prisma.auditLog.findFirst({
    where: {
      storeId,
      action: 'SEED_INITIALIZED',
      entityType: 'Store',
      entityId: storeId,
    },
    select: { id: true },
  });
  return (
    <Workspace
      storeId={storeId}
      section={section}
      role={c.role}
      isDemo={Boolean(demo)}
    />
  );
}
