import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { setSession } from '@/lib/auth';
const attempts = new Map<string, { n: number; until: number }>();
export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (
      !origin ||
      new URL(origin).origin !== new URL(process.env.APP_URL ?? req.url).origin
    )
      return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    const { email, password } = await req.json();
    if (typeof email !== 'string' || typeof password !== 'string')
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    const normalized = email.toLowerCase().trim(),
      state = attempts.get(normalized);
    if (state && state.until > Date.now() && state.n >= 8)
      return NextResponse.json({ error: 'try later' }, { status: 429 });
    const user = await prisma.user.findUnique({ where: { email: normalized } });
    if (
      !user ||
      !user.active ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      const n = state && state.until > Date.now() ? state.n + 1 : 1;
      attempts.set(normalized, { n, until: Date.now() + 15 * 60_000 });
      if (attempts.size > 10000)
        for (const [key, value] of attempts)
          if (value.until <= Date.now()) attempts.delete(key);
      return NextResponse.json(
        { error: 'invalid credentials' },
        { status: 401 },
      );
    }
    attempts.delete(normalized);
    await setSession(user.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'login unavailable' }, { status: 500 });
  }
}
