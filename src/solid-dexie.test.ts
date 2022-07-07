import "fake-indexeddb/auto";
import { createRoot, on, createEffect, createSignal, Setter } from "solid-js";

import { DbFixture, Friend } from "./db-fixture";
import { createLiveQuery, createDexieArrayStore } from "./solid-dexie";

let db: DbFixture;

beforeEach(() => {
  db = new DbFixture();
});

afterEach(async () => {
  await db.delete();
});

test("dexie sanity check", async () => {
  await db.friends.add({ name: "Foo", age: 10 });
  const result = await db.friends.toArray();
  expect(result).toMatchObject([{ age: 10, name: "Foo" }]);
});

test("live array, add one", async () => {
  let friends: Friend[];

  const [resolve, startup, runDb] = runner();

  await createRoot(async () => {
    const currentFriends = createDexieArrayStore(() => db.friends.toArray());

    createEffect(
      on(
        () => currentFriends.length,
        () => {
          friends = currentFriends;
          resolve();
        }
      )
    );
  });

  await startup();
  expect(friends!).toEqual([]);

  await runDb(async () => {
    await db.friends.add({ name: "Foo", age: 10 });
  });
  expect(friends!).toMatchObject([{ name: "Foo", age: 10 }]);
});

test("live array, add two", async () => {
  let friends: Friend[];

  const [resolve, startup, runDb] = runner();

  await createRoot(async () => {
    const currentFriends = createDexieArrayStore(() => db.friends.toArray());

    createEffect(
      on(
        () => currentFriends.length,
        () => {
          friends = currentFriends;
          resolve();
        }
      )
    );
  });

  await startup();
  expect(friends!).toEqual([]);

  await runDb(async () => {
    await db.friends.add({ name: "Foo", age: 10 });
  });
  expect(friends!).toMatchObject([{ name: "Foo", age: 10 }]);

  await runDb(async () => {
    await db.friends.add({ name: "Bar", age: 11 });
  });
  expect(friends!).toMatchObject([
    { name: "Foo", age: 10 },
    { name: "Bar", age: 11 },
  ]);
});

test("live array, change name", async () => {
  let friends: Friend[];

  const [resolve, startup, runDb] = runner();

  await createRoot(async () => {
    const currentFriends = createDexieArrayStore(() => db.friends.toArray());

    // to trigger observability we have to touch both length and name
    createEffect(
      on(
        () => currentFriends.length === 1 && currentFriends[0].name,
        () => {
          friends = currentFriends;
          resolve();
        }
      )
    );
  });

  await startup();
  expect(friends!).toEqual([]);

  await runDb(async () => {
    await db.friends.add({ name: "Foo", age: 10 });
  });
  expect(friends!).toMatchObject([{ name: "Foo", age: 10 }]);

  await runDb(async () => {
    await db.friends.update(friends[0].id!, { name: "CHANGED" });
  });
  expect(friends!).toMatchObject([{ name: "CHANGED", age: 10 }]);
});

test("live array, reconcile should leave untouched object identical", async () => {
  let friends: Friend[];

  const [resolve, startup, runDb] = runner();

  await createRoot(async () => {
    const currentFriends = createDexieArrayStore(() => db.friends.toArray());

    createEffect(
      on(
        () => currentFriends.length >= 1 && currentFriends[0].name,
        () => {
          friends = currentFriends;
          resolve();
        }
      )
    );
  });

  await startup();
  await runDb(async () => {
    await db.friends.add({ name: "Foo", age: 10 });
  });
  const friend0 = friends![0];
  expect(friend0).toMatchObject({
    name: "Foo",
    age: 10,
  });
  await runDb(async () => {
    await db.friends.add({ name: "Bar", age: 11 });
  });
  const friend1 = friends![1];
  expect(friend1).toMatchObject({
    name: "Bar",
    age: 11,
  });
  await runDb(async () => {
    await db.friends.update(friends[0].id!, { name: "CHANGED" });
  });

  expect(friends!).toMatchObject([
    { name: "CHANGED", age: 10 },
    { name: "Bar", age: 11 },
  ]);
  // existing reference is updated
  expect(friend0).toMatchObject({
    name: "CHANGED",
    age: 10,
  });
  // but it's still the same object
  expect(friend0).toBe(friends![0]);
  expect(friend1).toBe(friends![1]);
});

test("live array, bulk add", async () => {
  let friends: Friend[];

  const [resolve, startup, runDb] = runner();

  await createRoot(async () => {
    const currentFriends = createDexieArrayStore(() => db.friends.toArray());

    createEffect(
      on(
        () => currentFriends.length,
        () => {
          friends = currentFriends;
          resolve();
        }
      )
    );
  });

  await startup();
  await runDb(async () => {
    await db.friends.bulkAdd([
      { name: "Foo", age: 10 },
      { name: "Bar", age: 11 },
    ]);
  });

  expect(friends!).toMatchObject([
    { name: "Foo", age: 10 },
    { name: "Bar", age: 11 },
  ]);
});

test("live array, where with signal", async () => {
  let friends: Friend[];
  let set: Setter<number>;

  const [resolve, startup, runDb] = runner();

  await createRoot(async () => {
    const [n, setN] = createSignal(0);
    set = setN;
    const currentFriends = createDexieArrayStore(() =>
      db.friends.where("age").above(n()).toArray()
    );

    createEffect(
      on(
        () => currentFriends.length && n(),
        () => {
          friends = currentFriends;
          resolve();
        }
      )
    );
    await startup();
    await runDb(async () => {
      await db.friends.bulkAdd([
        { name: "Foo", age: 10 },
        { name: "Bar", age: 11 },
      ]);
    });

    expect(friends!).toMatchObject([
      { name: "Foo", age: 10 },
      { name: "Bar", age: 11 },
    ]);

    await runDb(async () => {
      set!(10);
    });
    // XXX why is this needed to wait for the thing to settle?
    await runDb(async () => {});
    expect(friends!).toMatchObject([{ name: "Bar", age: 11 }]);
  });
});

class WaitFor {
  resolve: () => void = () => {};

  promise = new Promise<void>((resolve) => (this.resolve = resolve));
}

type RunDb = (f: () => Promise<void>) => Promise<void>;

function runner(): [() => void, () => Promise<void>, RunDb] {
  let waitFor = new WaitFor();

  const runDb: RunDb = async (f) => {
    waitFor = new WaitFor();
    await f();
    await waitFor.promise;
  };

  return [() => waitFor.resolve(), async () => await waitFor.promise, runDb];
}
