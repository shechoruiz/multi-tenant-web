// ── Enums ──────────────────────────────────────────────────────────────────────

export enum OrderStatus {
  pendiente = "pendiente",
  confirmado = "confirmado",
  en_preparacion = "en_preparacion",
  enviado = "enviado",
  entregado = "entregado",
  cancelado = "cancelado",
}

// ── State machine ──────────────────────────────────────────────────────────────

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.pendiente]: [OrderStatus.confirmado, OrderStatus.cancelado],
  [OrderStatus.confirmado]: [OrderStatus.en_preparacion, OrderStatus.cancelado],
  [OrderStatus.en_preparacion]: [OrderStatus.enviado],
  [OrderStatus.enviado]: [OrderStatus.entregado],
  [OrderStatus.entregado]: [],
  [OrderStatus.cancelado]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

// ── DTOs ───────────────────────────────────────────────────────────────────────

export interface OrderDTO {
  id: string;
  orderNumber: string;
  userId: string;
  tenantId: string;
  status: OrderStatus;
  total: number;
  items: OrderItemDTO[];
  history: OrderHistoryEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemDTO {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface OrderHistoryEntry {
  id: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedById: string | null;
  createdAt: string;
}

export interface CreateOrderDTO {
  /** Empty = checkout uses current cart; otherwise merge anonymous items first */
  items?: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface OrderFilters {
  status?: OrderStatus;
  dateFrom?: string; // ISO 8601
  dateTo?: string; // ISO 8601
  minTotal?: number;
  maxTotal?: number;
  page?: number;
  limit?: number;
}

// ── Events ─────────────────────────────────────────────────────────────────────

export interface OrderStatusChangedEvent {
  event: "order.status.changed";
  payload: {
    orderId: string;
    orderNumber: string;
    tenantId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    userId: string;
    timestamp: string; // ISO 8601
  };
}
