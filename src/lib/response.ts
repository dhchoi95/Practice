import { NextResponse } from 'next/server';
export function jsonError(error: unknown) {
  const message = error instanceof Error ? error.message : 'request failed';
  const status =
    message === 'forbidden'
      ? 403
      : message === 'not found'
        ? 404
        : message === 'conflict'
          ? 409
          : 400;
  return NextResponse.json({ error: message }, { status });
}
export async function body(req: Request) {
  return (await req.json()) as Record<string, unknown>;
}
