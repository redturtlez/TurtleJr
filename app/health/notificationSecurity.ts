import { timingSafeEqual } from "node:crypto";

export function cronRequestIsAuthorized(request: Request, secret: string | undefined): boolean {
  if (!secret) return false;
  const supplied = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return suppliedBuffer.length === expectedBuffer.length && timingSafeEqual(suppliedBuffer, expectedBuffer);
}
