import { EventEmitter } from "node:events";

export interface OrderStatusChangedEvent {
  orderId: string;
  fromStatus: string | null;
  toStatus: string;
  timestamp: string;
}

export interface EventContracts {
  "order.status.changed": OrderStatusChangedEvent;
}

type EventName = keyof EventContracts;
type EventPayload<N extends EventName> = EventContracts[N];

class TypedEmitter {
  private emitter = new EventEmitter();

  emit<N extends EventName>(event: N, data: EventPayload<N>): void {
    this.emitter.emit(event, data);
  }

  on<N extends EventName>(event: N, handler: (data: EventPayload<N>) => void): void {
    this.emitter.on(event, handler);
  }

  off<N extends EventName>(event: N, handler: (data: EventPayload<N>) => void): void {
    this.emitter.off(event, handler);
  }
}

export const eventBus = new TypedEmitter();
