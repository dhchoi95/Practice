import { redirect } from 'next/navigation';
import { context } from '@/lib/auth';
import StoreShell from '@/components/store-shell';
export default async function StoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  const c = await context(storeId);
  if (!c) redirect('/login');
  return (
    <StoreShell storeId={storeId} role={c.role} name={c.name}>
      {children}
    </StoreShell>
  );
}
