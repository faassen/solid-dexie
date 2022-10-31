import {
  from,
  Accessor,
  createMemo,
  createEffect,
  on,
  onCleanup,
} from "solid-js";
import { createStore, reconcile, ReconcileOptions, SetStoreFunction } from "solid-js/store";
import { liveQuery, PromiseExtended } from "dexie";

export const DEFAULT_RECONCILE_OPTIONS: ReconcileOptions = { key: "id" }

type NotArray<T> = T extends any[] ? never : T;

export function createDexieSignalQuery<T>(
  querier: () => NotArray<T> | PromiseExtended<NotArray<T>>
): Accessor<T | undefined> {
  const get = createMemo(() => from<T>(liveQuery(querier)));
  return () => get()();
}

export function createDexieArrayQuery<T>(
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

function fromReconcileStore<T>(
  producer: {
    subscribe: (
      fn: (v: T) => void
    ) => (() => void) | { unsubscribe: () => void };
  },
  store: T,
  setStore: SetStoreFunction<T>,
  options: ReconcileOptions = DEFAULT_RECONCILE_OPTIONS
): T {
  const unsub = producer.subscribe((v) => setStore(reconcile(v, options)));
  onCleanup(() => ("unsubscribe" in unsub ? unsub.unsubscribe() : unsub()));
  return store;
}
