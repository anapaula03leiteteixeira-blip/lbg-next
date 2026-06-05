interface RateWindow {
  count: number;
  start: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

// In-process store — best-effort on serverless (per lambda instance)
const store = new Map<string, RateWindow>();

// Lazy cleanup: remove expired windows older than 2× WINDOW_MS
function sweep() {
  const cutoff = Date.now() - WINDOW_MS * 2;
  for (const [key, win] of store) {
    if (win.start < cutoff) store.delete(key);
  }
}

export function checkRateLimit(ip: string): { ok: boolean; retryAfter: number } {
  if (store.size > 5_000) sweep();

  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now - entry.start > WINDOW_MS) {
    store.set(ip, { count: 1, start: now });
    return { ok: true, retryAfter: 0 };
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.start)) / 1000);
    return { ok: false, retryAfter };
  }

  entry.count++;
  return { ok: true, retryAfter: 0 };
}
