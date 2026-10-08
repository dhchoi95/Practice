import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/auth';
export async function POST(req: Request) {
  const o = req.headers.get('origin');
  if (!o || new URL(o).host !== new URL(process.env.APP_URL ?? req.url).host)
    return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
  await clearSession();
  return NextResponse.redirect(new URL('/login', req.url), 303);
}
