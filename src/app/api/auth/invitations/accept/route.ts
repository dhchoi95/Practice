import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
export async function POST(req: Request) {
  try {
    const origin = req.headers.get('origin');
    if (
      !origin ||
      new URL(origin).origin !== new URL(process.env.APP_URL ?? req.url).origin
    )
      return NextResponse.json({ error: 'invalid origin' }, { status: 403 });
    const b = await req.json();
    if (
      typeof b.token !== 'string' ||
      typeof b.password !== 'string' ||
      b.password.length < 12 ||
      typeof b.name !== 'string' ||
      !b.name.trim()
    )
      return NextResponse.json({ error: 'invalid input' }, { status: 400 });
    const tokenHash = createHash('sha256').update(b.token).digest('hex');
    const user = await prisma.$transaction(async (tx) => {
      const initial = await tx.storeInvitation.findUnique({
        where: { tokenHash },
      });
      if (!initial) return null;
      await tx.$queryRaw`SELECT "id" FROM "StoreInvitation" WHERE "id"=${initial.id} FOR UPDATE`;
      const invite = await tx.storeInvitation.findUnique({
        where: { id: initial.id },
      });
      if (!invite || invite.acceptedAt || invite.expiresAt <= new Date())
        return null;
      let found = await tx.user.findUnique({ where: { email: invite.email } });
      if (found && !found.active) throw Error('account disabled');
      if (!found)
        found = await tx.user.create({
          data: {
            email: invite.email,
            passwordHash: await bcrypt.hash(b.password, 12),
            name: b.name.trim(),
          },
        });
      await tx.storeMember.upsert({
        where: {
          storeId_userId: { storeId: invite.storeId, userId: found.id },
        },
        update: { active: true, role: invite.role },
        create: {
          storeId: invite.storeId,
          userId: found.id,
          role: invite.role,
        },
      });
      await tx.storeInvitation.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date() },
      });
      return found;
    });
    if (!user)
      return NextResponse.json(
        { error: 'invalid invitation' },
        { status: 400 },
      );
    return NextResponse.json({ ok: true, email: user.email });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'invalid invitation' },
      { status: 400 },
    );
  }
}
