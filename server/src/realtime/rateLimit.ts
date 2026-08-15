/** Simple fixed-window rate limiter keyed by socket id, to blunt action-flooding. */
export class RateLimiter {
  private windows = new Map<string, { count: number; windowStart: number }>();
  constructor(private readonly limit: number, private readonly windowMs: number) {}

  allow(key: string): boolean {
    const now = Date.now();
    const entry = this.windows.get(key);
    if (!entry || now - entry.windowStart > this.windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= this.limit;
  }

  clear(key: string): void {
    this.windows.delete(key);
  }
}
