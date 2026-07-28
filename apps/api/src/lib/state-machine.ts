export enum OrderStatus {
  Pendiente = "pendiente",
  Confirmado = "confirmado",
  EnPreparacion = "en_preparacion",
  Enviado = "enviado",
  Entregado = "entregado",
  Cancelado = "cancelado",
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pendiente]: [OrderStatus.Confirmado, OrderStatus.Cancelado],
  [OrderStatus.Confirmado]: [OrderStatus.EnPreparacion, OrderStatus.Cancelado],
  [OrderStatus.EnPreparacion]: [OrderStatus.Enviado],
  [OrderStatus.Enviado]: [OrderStatus.Entregado],
  [OrderStatus.Entregado]: [],
  [OrderStatus.Cancelado]: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return transitions[from]?.includes(to) ?? false;
}

export function getValidTransitions(status: OrderStatus): OrderStatus[] {
  return [...(transitions[status] ?? [])];
}
