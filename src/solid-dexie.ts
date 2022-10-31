import {
  from,
  Accessor,
  createMemo,
  createEffect,
  on,
} from "solid-js";
import { createStore } from "solid-js/store";
import { liveQuery, PromiseExtended } from "dexie";
import { fromReconcileStore } from "./from-reconcile-store";

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
