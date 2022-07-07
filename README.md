# dexie-solid, Dexie integration for Solid

[DexieJS](https://dexie.org/) is a more friendly wrapper around
[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API).
IndexedDB allows for the efficient browser storage and retrieval of structured
data; it's like a localstorage that's a database.

[Solid](https://www.solidjs.com/) is a UI framework for browsers that offers
reactive hooks.

What this package does is integrate Dexie queries with Solid. It allows you to
use IndexedDB databases like you use any data in Solid - it's reactive.

So, you can write Dexie queries that are live: when you add data to your
database, the queries and thus your UI automatically updates. The queries are
also reactive: if you use signals to construct your query, the query result and
thus your UI changes automatically when you update the signals.

## `createDexieArrayQuery`

`createDexieArrayQuery` lets you create live queries. Here's an example:

```typescript
const friends = createDexieArrayQuery(() => db.friends.toArray());
```

`friends` is a special Solid store (think `createStore`). So, you can build
UIs with it:

```tsx
<For each={friends}>
  {(friend) => (
    <div>
      {friend.id} {friend.name} {friend.age}
    </div>
  )}
</For>
```

The UI updates automatically when you modify the database in some event handler:

```typescript
const handleAdd = () => {
  await db.friends.add({ name: "Foo", age: 10 });
};
```

You can also create dynamic queries with signals:

```typescript
const [value, setValue] = createSignal(0);
const friends = createDexieArrayQuery() => db.friends.where("age").above(value()).toArray());
```

Now when you modify `value` with `setValue`, `friends` automatically updates to
reflect this change.

## `createDexieSignalQuery`

Some Dexie queries return non-array values. For this, you should use
`createDexieSignalQuery`.

```typescript
const friendsCount = createDexieSignalQuery(() => db.friends.count());
```

`friendsCount` starts out as `undefined`, then obtains the value of the query.

You use this like any signal:

```tsx
<div>My friends count: {friendsCount()}</div>
```

It also updates automatically when you modify the database, and is reactive
to signals used in a dymnamic query, just like `createDexieArrayQuery`.
