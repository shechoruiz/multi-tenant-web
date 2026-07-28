import crypto from "node:crypto";

export function generateOrderNumber(): string {
  const now = new Date();
  const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const random = crypto.randomBytes(4).toString("hex").toUpperCase();
  return `ORD-${yyyymmdd}-${random}`;
}
