import { type FastifyInstance, type FastifyRequest, type FastifyReply } from "fastify";
import { PrismaClient } from "@shelf/db";
import { Role, canTransition, OrderStatus } from "@shelf/shared";
import { requireRole } from "../middleware/require-role.js";
import { generateOrderNumber } from "../lib/order-number.js";
import { eventBus } from "../lib/events.js";

const prisma = new PrismaClient();

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // All order routes require authentication
  app.addHook("onRequest", requireRole(Role.customer));

  // POST /:tenantSlug/orders/checkout — create order from cart (transactional)
  app.post("/:tenantSlug/orders/checkout", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return reply.status(400).send({ error: "Cart is empty" });
    }

    // Validate stock for all items
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return reply.status(409).send({
          error: `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}, requested: ${item.quantity}`,
        });
      }
    }

    // Execute checkout as a transaction
    const order = await prisma.$transaction(async (tx) => {
      // Decrement stock for each item
      for (const item of cart.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Calculate total
      const total = cart.items.reduce(
        (sum, item) => sum + Number(item.product.price) * item.quantity,
        0,
      );

      const orderNumber = generateOrderNumber();

      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          tenantId,
          total,
          status: OrderStatus.pendiente,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantity,
              unitPrice: item.product.price,
            })),
          },
          history: {
            create: {
              toStatus: OrderStatus.pendiente,
              changedById: userId,
            },
          },
        },
        include: {
          items: true,
          history: { orderBy: { createdAt: "asc" } },
        },
      });

      // Clear the cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return newOrder;
    });

    // Emit event
    eventBus.emit("order.status.changed", {
      orderId: order.id,
      fromStatus: null,
      toStatus: order.status,
      timestamp: order.createdAt.toISOString(),
    });

    return reply.status(201).send(order);
  });

  // GET /:tenantSlug/orders — list orders with filters
  app.get("/:tenantSlug/orders", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    const userRole = request.user?.role;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const { status, dateFrom, dateTo, minTotal, maxTotal, page, limit } = request.query as {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      minTotal?: string;
      maxTotal?: string;
      page?: string;
      limit?: string;
    };

    const where: Record<string, unknown> = { tenantId };

    // Role-based filtering: customers see only their orders
    if (userRole === Role.customer) {
      where.userId = userId;
    }

    if (status) where.status = status;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
      if (dateTo) (where.createdAt as Record<string, unknown>).lte = new Date(dateTo);
    }
    if (minTotal || maxTotal) {
      where.total = {};
      if (minTotal) (where.total as Record<string, unknown>).gte = parseFloat(minTotal);
      if (maxTotal) (where.total as Record<string, unknown>).lte = parseFloat(maxTotal);
    }

    const skip = page ? (parseInt(page) - 1) * (limit ? parseInt(limit) : 20) : 0;
    const take = limit ? parseInt(limit) : 20;

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: where as any,
        include: {
          items: true,
          history: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.order.count({ where: where as any }),
    ]);

    return reply.send({
      data: orders,
      pagination: {
        page: page ? parseInt(page) : 1,
        limit: take,
        total: totalCount,
        pages: Math.ceil(totalCount / take),
      },
    });
  });

  // GET /:tenantSlug/orders/:id — get order detail
  app.get("/:tenantSlug/orders/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    const userRole = request.user?.role;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };

    const where: Record<string, unknown> = { id, tenantId };
    if (userRole === Role.customer) {
      where.userId = userId;
    }

    const order = await prisma.order.findFirst({
      where: where as any,
      include: {
        items: true,
        history: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!order) {
      return reply.status(404).send({ error: "Order not found" });
    }

    return order;
  });

  // PATCH /:tenantSlug/orders/:id/status — transition order status
  app.patch("/:tenantSlug/orders/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };
    const { status } = request.body as { status: OrderStatus };

    if (!status) {
      return reply.status(400).send({ error: "status is required" });
    }

    const order = await prisma.order.findFirst({
      where: { id, tenantId },
    });

    if (!order) {
      return reply.status(404).send({ error: "Order not found" });
    }

    const currentStatus = order.status as OrderStatus;

    if (!canTransition(currentStatus, status)) {
      return reply.status(409).send({
        error: `Cannot transition from ${currentStatus} to ${status}`,
        validTransitions: getTransitions(currentStatus),
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status },
    });

    // Record history
    await prisma.orderHistory.create({
      data: {
        orderId: id,
        fromStatus: currentStatus,
        toStatus: status,
        changedById: userId,
      },
    });

    // Restore stock on cancellation
    if (status === OrderStatus.cancelado) {
      const items = await prisma.orderItem.findMany({ where: { orderId: id } });
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }

    // Emit event
    eventBus.emit("order.status.changed", {
      orderId: id,
      fromStatus: currentStatus,
      toStatus: status,
      timestamp: new Date().toISOString(),
    });

    return reply.send(updated);
  });

  // POST /:tenantSlug/orders/:id/cancel — shortcut to cancel
  app.post("/:tenantSlug/orders/:id/cancel", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId;
    const userId = request.user?.userId;
    if (!tenantId || !userId) return reply.status(401).send({ error: "Unauthorized" });

    const { id } = request.params as { id: string };

    const order = await prisma.order.findFirst({
      where: { id, tenantId },
    });

    if (!order) {
      return reply.status(404).send({ error: "Order not found" });
    }

    const currentStatus = order.status as OrderStatus;

    // Customers can only cancel their own orders
    if (request.user?.role === Role.customer && order.userId !== userId) {
      return reply.status(403).send({ error: "Cannot cancel another user's order" });
    }

    if (!canTransition(currentStatus, OrderStatus.cancelado)) {
      return reply.status(409).send({
        error: `Cannot cancel order in status ${currentStatus}`,
      });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: OrderStatus.cancelado },
    });

    await prisma.orderHistory.create({
      data: {
        orderId: id,
        fromStatus: currentStatus,
        toStatus: OrderStatus.cancelado,
        changedById: userId,
      },
    });

    // Restore stock
    const items = await prisma.orderItem.findMany({ where: { orderId: id } });
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    eventBus.emit("order.status.changed", {
      orderId: id,
      fromStatus: currentStatus,
      toStatus: OrderStatus.cancelado,
      timestamp: new Date().toISOString(),
    });

    return reply.send(updated);
  });
}

function getTransitions(status: OrderStatus): string[] {
  const transitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.pendiente]: [OrderStatus.confirmado, OrderStatus.cancelado],
    [OrderStatus.confirmado]: [OrderStatus.en_preparacion, OrderStatus.cancelado],
    [OrderStatus.en_preparacion]: [OrderStatus.enviado],
    [OrderStatus.enviado]: [OrderStatus.entregado],
    [OrderStatus.entregado]: [],
    [OrderStatus.cancelado]: [],
  };
  return (transitions[status] ?? []).map((s) => s.toString());
}
