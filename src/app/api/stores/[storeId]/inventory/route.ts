import { createHash, randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorize } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { serialize } from '@/lib/serialize';
import { Prisma } from '@/generated/prisma/client';

const inputSchema = z
  .object({
    ingredientId: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(100).optional(),
    unit: z.string().trim().min(1).max(20).optional(),
    quantityDelta: z.string().regex(/^(?:0|[1-9]\d{0,14})(?:\.\d{1,3})?$/),
    type: z.enum(['RECEIPT', 'USAGE', 'WASTE', 'COUNT']).default('RECEIPT'),
    reason: z.string().trim().min(1).max(500),
    idempotencyKey: z.string().min(1).max(200),
    expectedVersion: z.number().int().nonnegative().optional(),
  })
  .refine(
    (value) => Boolean(value.ingredientId || value.name),
    'ingredientId or name is required',
  )
  .refine(
    (value) => value.type !== 'COUNT' || value.expectedVersion !== undefined,
    'COUNT requires expectedVersion',
  );

type Params = { params: Promise<{ storeId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { storeId } = await params;
  const auth = await authorize(storeId);
  if ('response' in auth) return auth.response;
  const rows = await prisma.ingredient.findMany({
    where: { storeId, active: true },
    include: {
      inventory: true,
      transactions: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });
  return NextResponse.json(
    serialize(
      rows.map((row) => {
        const { unitCost, ...operational } = row;
        return auth.ctx.role === 'OWNER'
          ? { ...operational, unitCost }
          : operational;
      }),
    ),
  );
}

export async function POST(request: Request, { params }: Params) {
  const { storeId } = await params;
  const auth = await authorize(storeId, true, request);
  if ('response' in auth) return auth.response;
  let payloadHash: string | undefined;
  let idempotencyKey: string | undefined;
  try {
    const rawInput = await request.json();
    if (
      auth.ctx.role === 'STAFF' &&
      rawInput &&
      typeof rawInput === 'object' &&
      ['RECEIPT', 'COUNT'].includes(rawInput.type)
    )
      throw Error('forbidden');
    const input = inputSchema.parse(rawInput);
    idempotencyKey = input.idempotencyKey;
    if (
      auth.ctx.role === 'STAFF' &&
      (!input.ingredientId || !['USAGE', 'WASTE'].includes(input.type))
    )
      throw Error('forbidden');
    const requested = new Prisma.Decimal(input.quantityDelta);
    if (input.type !== 'COUNT' && requested.lte(0))
      throw Error('positive quantity is required');
    const result = await prisma.$transaction(async (transaction) => {
      let ingredient = await transaction.ingredient.findFirst({
        where: {
          storeId,
          active: true,
          ...(input.ingredientId
            ? { id: input.ingredientId }
            : { name: input.name }),
        },
      });
      const unit = input.unit ?? ingredient?.unit ?? '개';
      payloadHash = createHash('sha256')
        .update(
          JSON.stringify({
            ingredientId: input.ingredientId ?? null,
            name: input.ingredientId ? null : input.name,
            unit,
            quantity: requested.toString(),
            type: input.type,
            reason: input.reason,
            expectedVersion: input.expectedVersion ?? null,
          }),
        )
        .digest('hex');
      const prior = await transaction.inventoryTransaction.findUnique({
        where: {
          storeId_idempotencyKey: {
            storeId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (prior) {
        if (prior.payloadHash !== payloadHash) throw Error('conflict');
        return { duplicate: true };
      }
      if (!ingredient && input.ingredientId) throw Error('not found');
      if (!ingredient) {
        if (auth.ctx.role === 'STAFF') throw Error('forbidden');
        ingredient = await transaction.ingredient.create({
          data: {
            storeId,
            name: input.name!,
            unit,
            minimumQty: '0',
            targetQty: '0',
            packQty: '1',
          },
        });
      }
      if (unit !== ingredient.unit) throw Error('unit conflict');
      await transaction.$executeRaw`
        INSERT INTO "Inventory" ("id", "storeId", "ingredientId", "quantity", "version")
        VALUES (${randomUUID()}::uuid, ${storeId}::uuid, ${ingredient.id}::uuid, 0, 0)
        ON CONFLICT ("ingredientId") DO NOTHING
      `;
      await transaction.$queryRaw`SELECT "id" FROM "Inventory" WHERE "ingredientId"=${ingredient.id}::uuid FOR UPDATE`;
      const waitedPrior = await transaction.inventoryTransaction.findUnique({
        where: {
          storeId_idempotencyKey: {
            storeId,
            idempotencyKey: input.idempotencyKey,
          },
        },
      });
      if (waitedPrior) {
        if (waitedPrior.payloadHash !== payloadHash) throw Error('conflict');
        return { duplicate: true };
      }
      const current = await transaction.inventory.findUniqueOrThrow({
        where: { ingredientId: ingredient.id },
      });
      if (input.type === 'COUNT' && input.expectedVersion !== current.version)
        throw Error('stale count version');
      const delta =
        input.type === 'COUNT'
          ? requested.minus(current.quantity)
          : input.type === 'RECEIPT'
            ? requested
            : requested.negated();
      const inventory = await transaction.inventory.update({
        where: { ingredientId: ingredient.id },
        data: { quantity: { increment: delta }, version: { increment: 1 } },
      });
      const ledger = await transaction.inventoryTransaction.create({
        data: {
          storeId,
          ingredientId: ingredient.id,
          quantityDelta: delta,
          type: input.type,
          idempotencyKey: input.idempotencyKey,
          payloadHash,
          reason: input.reason,
          actorId: auth.ctx.userId,
        },
      });
      const { unitCost, ...operational } = ingredient;
      return {
        ingredient:
          auth.ctx.role === 'OWNER'
            ? { ...operational, unitCost }
            : operational,
        inventory,
        transaction: ledger,
      };
    });
    return NextResponse.json(serialize(result), { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      idempotencyKey &&
      payloadHash
    ) {
      const prior = await prisma.inventoryTransaction.findUnique({
        where: { storeId_idempotencyKey: { storeId, idempotencyKey } },
      });
      if (prior?.payloadHash === payloadHash)
        return NextResponse.json({ duplicate: true }, { status: 201 });
      return NextResponse.json({ error: 'conflict' }, { status: 409 });
    }
    const message =
      error instanceof z.ZodError
        ? 'invalid inventory input'
        : error instanceof Error
          ? error.message
          : 'invalid request';
    const status =
      message === 'forbidden'
        ? 403
        : message === 'not found'
          ? 404
          : ['conflict', 'unit conflict', 'stale count version'].includes(
                message,
              )
            ? 409
            : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
