import type { Clock } from "./clock.ts";
import { newId } from "./ids.ts";
import type { Logger } from "./logger.ts";

/**
 * Cross-module state propagation. Event type names are `<module>.<past_tense_fact>`.
 * Payload types live in the publishing module's contract. Consumers must be idempotent
 * (use `event.id` or a natural key), because delivery may be retried.
 */
export interface DomainEvent<TType extends string = string, TPayload = unknown> {
  readonly id: string;
  readonly type: TType;
  readonly occurredAt: string;
  readonly payload: TPayload;
}

export type EventHandler<E extends DomainEvent> = (event: E) => Promise<void>;

export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe<E extends DomainEvent>(type: E["type"], handler: EventHandler<E>): () => void;
}

export function createEvent<TType extends string, TPayload>(
  type: TType,
  payload: TPayload,
  clock: Clock,
): DomainEvent<TType, TPayload> {
  return { id: newId(), type, occurredAt: clock.now().toISOString(), payload };
}

/**
 * In-process bus. `publish` awaits every handler sequentially; a failing handler is logged and does
 * not fail the publisher or other handlers. (Durable outbox delivery is a later step.)
 */
export class InMemoryEventBus implements EventBus {
  readonly #handlers = new Map<string, EventHandler<DomainEvent>[]>();
  readonly #logger: Logger;

  constructor(logger: Logger) {
    this.#logger = logger;
  }

  async publish(event: DomainEvent): Promise<void> {
    for (const handler of this.#handlers.get(event.type) ?? []) {
      try {
        await handler(event);
      } catch (e) {
        this.#logger.error("event handler failed", {
          eventType: event.type,
          eventId: event.id,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  subscribe<E extends DomainEvent>(type: E["type"], handler: EventHandler<E>): () => void {
    const list = this.#handlers.get(type) ?? [];
    list.push(handler as EventHandler<DomainEvent>);
    this.#handlers.set(type, list);
    return () => {
      const current = this.#handlers.get(type) ?? [];
      this.#handlers.set(
        type,
        current.filter((h) => h !== handler),
      );
    };
  }
}
