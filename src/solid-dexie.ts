import {
  from,
  Accessor,
  createMemo,
  createEffect,
  on,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { liveQuery, PromiseExtended } from "dexie";

import { fromReconcileStore, DEFAULT_RECONCILE_OPTIONS } from "./from-reconcile-store";

type ReconcileOptions = Parameters<typeof reconcile>[1];

type NotArray<T> = T extends any[] ? never : T;

export function createDexieSignalQuery<T>(
  querier: () => NotArray<T> | PromiseExtended<NotArray<T>>
): Accessor<T | undefined> {
  const get = createMemo(() => from<T>(liveQuery(querier)));
  return () => get()();
}

export function createDexieArrayQuery<T, S = undefined>(
  querier: (sourceValue?: S | false | null | undefined) => T[] | Promise<T[]>,
  options?: ReconcileOptions & {
    source?: (() => S | false | null | undefined)
  },
): T[]
export function createDexieArrayQuery<T, S = undefined>(
  querier: (_?: any) => T[] | Promise<T[]>,
  options: ReconcileOptions & {
    source?: any,
  } = DEFAULT_RECONCILE_OPTIONS,
): T[] {
  const [store, setStore] = createStore<T[]>([]);

  const queryWithSource = () => {
    const source = options.source
    if (source) {
      return querier(source?.());
    } else {
      return querier();
    }
  };

  const deps = options?.source ? [queryWithSource, options.source] : [queryWithSource];

  createEffect(
    on(deps, () => {
      fromReconcileStore<T[]>(liveQuery(queryWithSource), store, setStore, options ?? undefined);
    })
  );

  return store;
}
