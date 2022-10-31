import { onCleanup } from "solid-js";
import { reconcile, ReconcileOptions, SetStoreFunction } from "solid-js/store";

export const DEFAULT_RECONCILE_OPTIONS: ReconcileOptions = { key: "id" }

export const fromReconcileStore = <T>(
  producer: {
    subscribe: (
      fn: (v: T) => void
    ) => (() => void) | { unsubscribe: () => void };
  },
  store: T,
  setStore: SetStoreFunction<T>,
  options: ReconcileOptions = DEFAULT_RECONCILE_OPTIONS
): T => {
  const unsub = producer.subscribe((v) => setStore(reconcile(v, options)));
  onCleanup(() => ("unsubscribe" in unsub ? unsub.unsubscribe() : unsub()));
  return store;
};
