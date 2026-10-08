import { cookies, headers } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './db';
import { NextResponse } from 'next/server';
export type Context = {
  userId: string;
  storeId: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF';
  name: string;
};
function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error('AUTH_SECRET must contain at least 32 characters');
  return new TextEncoder().encode(secret);
}
export async function setSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(key());
  (await cookies()).set('restaurant_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 28800,
  });
}
export async function clearSession() {
  (await cookies()).delete('restaurant_session');
}
export async function currentUser() {
  const token = (await cookies()).get('restaurant_session')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), {
      algorithms: ['HS256'],
    });
    if (!payload.sub) return null;
    return await prisma.user.findFirst({
      where: { id: payload.sub, active: true },
      select: { id: true, name: true, email: true },
    });
  } catch {
    return null;
  }
}
export async function context(storeId?: string): Promise<Context | null> {
  const user = await currentUser();
  if (!user) return null;
  const chosen = storeId ?? (await headers()).get('x-store-id') ?? undefined;
  const member = await prisma.storeMember.findFirst({
    where: {
      userId: user.id,
      active: true,
      store: { active: true, ...(chosen ? { id: chosen } : {}) },
    },
    orderBy: { store: { createdAt: 'asc' } },
    select: { storeId: true, role: true },
  });
  return member
    ? {
        userId: user.id,
        storeId: member.storeId,
        role: member.role,
        name: user.name,
      }
    : null;
}
export async function authorize(
  storeId: string,
  write = false,
  request?: Request,
): Promise<{ ctx: Context } | { response: NextResponse }> {
  const ctx = await context(storeId);
  if (!ctx)
    return {
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };
  if (write) {
    if (!request)
      return {
        response: NextResponse.json(
          { error: 'invalid origin' },
          { status: 403 },
        ),
      };
    const origin = request.headers.get('origin');
    if (
      !origin ||
      (() => {
        try {
          return (
            new URL(origin).origin !==
            new URL(process.env.APP_URL ?? request.url).origin
          );
        } catch {
          return true;
        }
      })()
    )
      return {
        response: NextResponse.json(
          { error: 'invalid origin' },
          { status: 403 },
        ),
      };
  }
  return { ctx };
}
export const owner = (ctx: Context) => ctx.role === 'OWNER';
