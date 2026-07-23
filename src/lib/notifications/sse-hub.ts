type Controller = ReadableStreamDefaultController<Uint8Array>;

const subscribers = new Map<string, Set<Controller>>();
const encoder = new TextEncoder();

export function subscribe(username: string, controller: Controller) {
  if (!subscribers.has(username)) subscribers.set(username, new Set());
  subscribers.get(username)!.add(controller);
}

export function unsubscribe(username: string, controller: Controller) {
  const set = subscribers.get(username);
  if (!set) return;
  set.delete(controller);
  if (set.size === 0) subscribers.delete(username);
}

// ponytail: in-memory, single-Node-process only. Fine for this app's current
// deployment (one server process); if it's ever run as multiple instances,
// this needs a shared pub/sub (Redis) instead — every instance would otherwise
// only see the subscribers connected to itself.
export function broadcast(username: string, event: string, data: unknown) {
  const set = subscribers.get(username);
  if (!set) return;
  const payload = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  for (const controller of set) {
    try {
      controller.enqueue(payload);
    } catch {
      // Dead connection — its own cancel() will unsubscribe it.
    }
  }
}
