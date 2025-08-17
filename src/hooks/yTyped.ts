import * as Y from 'yjs';

// TypeScript wrapper for Y.Map with better type safety
export class TypedYMap<T extends Record<string, unknown>> {
  private map: Y.Map<unknown>;

  constructor() {
    this.map = new Y.Map<unknown>();
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.map.get(key as string) as T[K];
  }

  set<K extends keyof T>(key: K, value: T[K]): T[K] {
    this.map.set(key as string, value);
    return value;
  }

  observe(handler: (event: Y.YMapEvent<unknown>) => void): void {
    this.map.observe(handler);
  }

  unobserve(handler: (event: Y.YMapEvent<unknown>) => void): void {
    this.map.unobserve(handler);
  }
}

// Helper to create a typed Y.Map
export function createTypedYMap<T extends Record<string, unknown>>(): TypedYMap<T> {
  return new TypedYMap<T>();
}
