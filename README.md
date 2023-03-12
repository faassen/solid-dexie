# solid-dexie, Dexie integration for Solid

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

## Installation

```shell
npm install solid-dexie
```

It declares both `solid-js` and `dexie` as peer dependencies, so you
also need them installed in your projects.

## `createDexieArrayQuery`

`createDexieArrayQuery` lets you create live queries. Here's an example:

```typescript
import { createDexieArrayQuery } from "solid-dexie";

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
const friends = createDexieArrayQuery(() => db.friends.where("age").above(value()).toArray());
```

Now when you modify `value` with `setValue`, `friends` automatically updates to
reflect this change.

### Optimization note

Internally, `createDexieArrayQuery` is optimized for arrays - it uses Solid's
[`reconcile`](https://www.solidjs.com/docs/latest/api#reconcile) function to
ensure your data is stable so your UI won't update for objects that don't
change. It depends on the primary key of your database table to be `id`.

## `createDexieSignalQuery`

Some Dexie queries (`count()`, `first()`, `last()`, `get()`) return non-array
values. For this, you should use `createDexieSignalQuery`, which behaves much
like a normal Solid signal.

```typescript
import { createDexieSignalQuery } from "solid-dexie";

const friendsCount = createDexieSignalQuery(() => db.friends.count());
```

`friendsCount` starts out as `undefined`, then obtains the value of the query.

You use this like any signal in Solid:

```tsx
<div>My friends count: {friendsCount()}</div>
```

The signal updates automatically when you modify the database, and is reactive
to signals used in a dymnamic query, just like with `createDexieArrayQuery`.

You should not use `createDexieSignalQuery` with queries that produce an array
(`.toArray()`), because it causes your UI to redraw for each item for all
changes; use `createDexieArrayQuery` instead. In fact, TypeScript prevents you
from using array queries in `createDexieSignalQuery` to remind you of this.

## Development

### Running the demo

You can run the demo app by running:

```shell
npm run dev
```

### Making a release

You can create a new npm release automatically by doing the following on the
`main` branch:

```shell
npm version patch  # or minor, major, etc
git push --follow-tags
```

[`npm version`](https://docs.npmjs.com/cli/v8/commands/npm-version) updates the
version number automatically and also puts the latest date in `CHANGELOG.md`.
You then need to push using `--follow-tags` (**NOT** `--tags`).

The release process is done through a github action defined in
`.workflows/publish.yml` which publishes to the npm registry automatically.
