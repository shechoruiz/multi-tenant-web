import { PrismaClient } from "@shelf/db";

const prisma = new PrismaClient();

interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface StockWarning {
  productId: string;
  productName: string;
  requested: number;
  available: number;
}

/**
 * Validates cart items belong to the current tenant and have sufficient stock.
 * Returns warnings for items with stock issues.
 */
export async function validateCartItems(
  tenantId: string,
  items: CartItemInput[],
): Promise<{ valid: CartItemInput[]; warnings: StockWarning[] }> {
  const valid: CartItemInput[] = [];
  const warnings: StockWarning[] = [];

  for (const item of items) {
    const product = await prisma.product.findFirst({
      where: { id: item.productId, tenantId },
      select: { id: true, name: true, stock: true, status: true },
    });

    if (!product || product.status === "inactive") {
      warnings.push({
        productId: item.productId,
        productName: product?.name ?? "Unknown",
        requested: item.quantity,
        available: 0,
      });
      continue;
    }

    if (product.stock < item.quantity) {
      warnings.push({
        productId: item.productId,
        productName: product.name,
        requested: item.quantity,
        available: product.stock,
      });

      if (product.stock > 0) {
        valid.push({ productId: item.productId, quantity: product.stock });
      }
      continue;
    }

    valid.push(item);
  }

  return { valid, warnings };
}
