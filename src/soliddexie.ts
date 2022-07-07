import {
  from,
  Accessor,
  createMemo,
  Setter,
  createSignal,
  createEffect,
  on,
  onCleanup,
} from "solid-js";
import { createStore, reconcile, SetStoreFunction } from "solid-js/store";
import { liveQuery } from "dexie";

type ReconcileOptions = Parameters<typeof reconcile>[1];

export function createLiveQuery<T>(querier: () => T | Promise<T>): Accessor<T> {
  const get = createMemo(() => from<T>(liveQuery(querier)));
  return () => get()();
}

export function createLiveArrayQuery<T>(
  querier: () => T[] | Promise<T[]>
): Accessor<T[]> {
  const value = createMemo(() =>
    fromReconcile<T[]>(liveQuery(querier), [] as any)
  );
  return () => value();
}

// this one is nice
export function createDexieArrayStore<T>(
  querier: () => T[] | Promise<T[]>
): T[] {
  const [store, setStore] = createStore<T[]>([]);

  createEffect(
    on(querier, () => {
      fromReconcileStore<T[]>(liveQuery(querier), store, setStore);
    })
  );

  return store;
}

export function createLiveObjectQuery<T>(
  querier: () => T | Promise<T>
): Accessor<T> {
  const value = createMemo(() =>
    fromReconcile<T>(liveQuery(querier), {} as any, { key: null, merge: true })
  );
  return () => value();
}

export function fromReconcile<T>(
  producer: {
    subscribe: (
      fn: (v: T) => void
    ) => (() => void) | { unsubscribe: () => void };
  },
  empty: T,
  options: ReconcileOptions = { key: "id" }
): T {
  const [s, set] = createStore<T>(empty as any);
  const unsub = producer.subscribe((v) => set(reconcile(v, options)));
  onCleanup(() => ("unsubscribe" in unsub ? unsub.unsubscribe() : unsub()));
  return s;
}

export function fromReconcileStore<T>(
  producer: {
    subscribe: (
      fn: (v: T) => void
    ) => (() => void) | { unsubscribe: () => void };
  },
  store: T,
  setStore: SetStoreFunction<T>,
  options: ReconcileOptions = { key: "id" }
): T {
  const unsub = producer.subscribe((v) => setStore(reconcile(v, options)));
  onCleanup(() => ("unsubscribe" in unsub ? unsub.unsubscribe() : unsub()));
  return store;
}
