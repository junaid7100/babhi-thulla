/**
 * Minimal per-key async mutex. Used to serialize all mutations to a given
 * room so two near-simultaneous PLAY_CARD requests can never both read the
 * same "current turn" and both succeed — the second always observes the
 * first's committed effect.
 */
export class KeyedMutex {
  private tail = new Map<string, Promise<void>>();

  async run<T>(key: string, fn: () => Promise<T> | T): Promise<T> {
    const prev = this.tail.get(key) ?? Promise.resolve();
    let releaseNext!: () => void;
    const gate = new Promise<void>((resolve) => (releaseNext = resolve));
    this.tail.set(key, prev.then(() => gate));
    await prev;
    try {
      return await fn();
    } finally {
      releaseNext();
    }
  }
}
