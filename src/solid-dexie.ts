import {
  from,
  Accessor,
  createMemo,
  createEffect,
  on,
} from "solid-js";
import { createStore, reconcile } from "solid-js/store";
import { liveQuery, PromiseExtended } from "dexie";
import {ResourceSource} from 'solid-js/types/reactive/signal';

import { fromReconcileStore, DEFAULT_RECONCILE_OPTIONS } from "./from-reconcile-store";

type ReconcileOptions = Parameters<typeof reconcile>[1];

type NotArray<T> = T extends any[] ? never : T;

export function createDexieSignalQuery<T>(
  querier: () => NotArray<T> | PromiseExtended<NotArray<T>>
): Accessor<T | undefined> {
  const get = createMemo(() => from<T>(liveQuery(querier)));
  return () => get()();
}


export function createDexieArrayQuery<T>(
  querier: () => T[] | Promise<T[]>,
  options: ReconcileOptions = DEFAULT_RECONCILE_OPTIONS
): T[] {
  const [store, setStore] = createStore<T[]>([]);

  createEffect(
    on(querier, () => {
      fromReconcileStore<T[]>(liveQuery(querier), store, setStore, options);
    })
  );

  return store;
}

export function createDexieArrayQueryWithSource<T, S>(
  querier: (source?: ResourceSource<S>) => T[] | Promise<T[]>,
  source: ResourceSource<S> = undefined,
  options: ReconcileOptions = DEFAULT_RECONCILE_OPTIONS
): T[] {
  const [store, setStore] = createStore<T[]>([]);

  let deps;
  let sourceAccessor: Accessor<S> | undefined;

  const queryWithSource = () => {
    return querier(sourceAccessor)
  }

  if (typeof source === "function") {
    sourceAccessor = source as Accessor<S>
    deps = [queryWithSource, source as Accessor<S>];
  } else {
    deps = [queryWithSource, (() => source) as Accessor<S>];
  }

  createEffect(
    on(deps, () => {
      fromReconcileStore<T[]>(liveQuery(queryWithSource), store, setStore, options ?? undefined);
    })
  );

  return store;
}
