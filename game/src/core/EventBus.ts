type Handler<T> = (payload: T) => void;

/** Minimal typed pub/sub. Keeps cross-system communication (input -> UI -> battle, etc.) decoupled. */
export class EventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<Handler<unknown>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<unknown>);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    // Snapshot before iterating: a handler that reacts to this event by
    // subscribing a new listener (e.g. pushing a scene that registers its
    // own bus.on inside the same handler call) would otherwise have that
    // new listener visited by this same Set.forEach - Set iteration is live,
    // so newly-added entries ARE seen mid-iteration - and fire immediately
    // for the very event that just created it.
    for (const handler of [...handlers]) handler(payload);
  }
}
