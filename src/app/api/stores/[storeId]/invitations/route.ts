import { randomBytes, createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { authorize, owner } from '@/lib/auth';
import { prisma } from '@/lib/db';
export async function POST(
  req: Request,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const a = await authorize(storeId, true, req);
  if ('response' in a) return a.response;
  if (!owner(a.ctx))
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const b = await req.json();
  if (
    typeof b.email !== 'string' ||
    !b.email.includes('@') ||
    !['STAFF', 'MANAGER'].includes(b.role)
  )
    return NextResponse.json({ error: 'invalid input' }, { status: 400 });
  const token = randomBytes(32).toString('base64url'),
    tokenHash = createHash('sha256').update(token).digest('hex');
  const invitation = await prisma.storeInvitation.create({
    data: {
      storeId,
      email: b.email.trim().toLowerCase(),
      role: b.role,
      tokenHash,
      expiresAt: new Date(Date.now() + 48 * 3600000),
      invitedBy: a.ctx.userId,
    },
  });
  return NextResponse.json(
    {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt,
      token,
    },
    { status: 201 },
  );
}
