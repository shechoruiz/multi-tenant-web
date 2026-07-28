import crypto from "node:crypto";
import { type Role } from "@shelf/shared";

export interface JwtPayload {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  role: Role;
}

interface JwtBody extends JwtPayload {
  iat: number;
  exp: number;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "shelf-dev-secret-do-not-use-in-prod";

function base64UrlEncode(data: string): string {
  return Buffer.from(data)
    .toString("base64url")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, "base64url").toString("utf-8");
}

function hmacSha256(data: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(data).digest("base64url").replace(/=+$/, "");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function sign(payload: JwtPayload): string {
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);

  const body: JwtBody = {
    ...payload,
    iat: now,
    exp: now + 15 * 60,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const bodyB64 = base64UrlEncode(JSON.stringify(body));
  const signature = hmacSha256(`${headerB64}.${bodyB64}`, JWT_SECRET);

  return `${headerB64}.${bodyB64}.${signature}`;
}

export function verify(token: string): JwtPayload {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");

  const [headerB64, bodyB64, signature] = parts;
  const expectedSig = hmacSha256(`${headerB64}.${bodyB64}`, JWT_SECRET);

  if (!constantTimeEqual(signature, expectedSig)) {
    throw new Error("Invalid token signature");
  }

  const body: JwtBody = JSON.parse(base64UrlDecode(bodyB64));

  if (body.exp && body.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  return {
    userId: body.userId,
    tenantId: body.tenantId,
    tenantSlug: body.tenantSlug,
    role: body.role as Role,
  };
}
