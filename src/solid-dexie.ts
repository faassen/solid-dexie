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

export function createDexieSignalQuery<T>(
  querier: () => T | Promise<T>
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
  options: ReconcileOptions = { key: "id" }
): T {
  const unsub = producer.subscribe((v) => setStore(reconcile(v, options)));
  onCleanup(() => ("unsubscribe" in unsub ? unsub.unsubscribe() : unsub()));
  return store;
}
