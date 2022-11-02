import "fake-indexeddb/auto";
import { createRoot, on, createEffect, createSignal, Setter, createRenderEffect, untrack } from "solid-js";

import { DbFixture, Friend } from "./db-fixture";
import { createDexieSignalQuery, createDexieArrayQuery } from "./solid-dexie";

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

describe("createDexieSignalQuery", () => {
  test("count", async () => {
    let count: number | undefined;

    const [resolve, startup, runDb] = runner();

    await createRoot(async () => {
      const currentCount = createDexieSignalQuery(() => db.friends.count());

      createEffect(
        on(
          () => currentCount(),
          () => {
            count = currentCount();
            resolve();
          }
        )
      );
    });

    await startup();
    expect(count).toEqual(undefined);

    // wait a tick
    await runDb(async () => {});

    expect(count).toEqual(0);

    await runDb(async () => {
      await db.friends.add({ name: "Foo", age: 10 });
    });
    expect(count).toEqual(1);
  });

  test("count, where with signal", async () => {
    let count: number | undefined;
    let set: Setter<number>;

    const [resolve, startup, runDb] = runner();

    await createRoot(async () => {
      const [n, setN] = createSignal(0);
      set = setN;
      const currentCount = createDexieSignalQuery(() =>
        db.friends.where("age").above(n()).count()
      );

      createEffect(
        on(
          () => currentCount(),
          () => {
            count = currentCount();
            resolve();
          }
        )
      );

      await startup();

      await runDb(async () => {});
      expect(count!).toEqual(0);

      await runDb(async () => {
        await db.friends.bulkAdd([
          { name: "Foo", age: 10 },
          { name: "Bar", age: 11 },
        ]);
      });

      expect(count!).toEqual(2);

      await runDb(async () => {
        set!(10);
      });
      // XXX why is this needed to wait for the thing to settle?
      await runDb(async () => {});
      expect(count!).toEqual(1);
    });
  });
});

describe("createDexieArrayQuery", () => {
  test("live array, add one", async () => {
    let friends: Friend[];

    const [resolve, startup, runDb] = runner();

    await createRoot(async () => {
      const currentFriends = createDexieArrayQuery(() => db.friends.toArray());

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
  });;

  test("filtered live array, add items, signal as parameter", async () => {
    let results: Friend[];

    const [resolve, startup, runDb] = runner();

    const PARAM = 30;

    await createRoot(async () => {
      const [filter, setFilter] = createSignal(28);
      const matchingFriends = createDexieArrayQuery((x) => {
        return db.friends.where({ age: filter() }).toArray();
      }, {
        source: filter
      });

      createRenderEffect(() => {
        untrack(()=>{
          setFilter(PARAM);
        })
      });

      createEffect(
        on(
          () => [matchingFriends.length],
          () => {
            results = JSON.parse(JSON.stringify(matchingFriends));
            resolve();
          }
        )
      );

      createEffect(()=>{
        if (matchingFriends.filter(friend=>friend.age === PARAM).length == 1) {
          setFilter(35)
        }
      })
    });

    await startup();
    expect(results!).toEqual([]);

    await runDb(async () => {
      await db.friends.add({ name: "Foo", age: 20 });
      await db.friends.add({ name: "Foo", age: 35 });
      await db.friends.add({ name: "Foo", age: 35 });
      await db.friends.add({ name: "Expected", age: PARAM });
      await db.friends.add({ name: "Foo", age: 40 });
    });
    expect(results!).toMatchObject([{ name: "Expected", age: PARAM }]);
    await runDb(async () => {
      await db.friends.add({ name: "Expected2", age: PARAM });
    });
    expect(results!).toMatchObject([
      { name: "Foo", age: 35 },
      { name: "Foo", age: 35 },
    ]);
  });

  test("live array, add two", async () => {
    let friends: Friend[];

    const [resolve, startup, runDb] = runner();

    await createRoot(async () => {
      const currentFriends = createDexieArrayQuery(() => db.friends.toArray());

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
      const currentFriends = createDexieArrayQuery(() => db.friends.toArray());

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
    let firedEffect = 0;

    const [resolve, startup, runDb] = runner();

    await createRoot(async () => {
      const currentFriends = createDexieArrayQuery(() => db.friends.toArray());

      createEffect(
        on(
          () => currentFriends.length >= 1 && currentFriends[0].name,
          () => {
            friends = currentFriends;
            resolve();
          }
        )
      );

      createEffect(() => {
        // we listen to the name of the first item
        if (currentFriends.length > 1 && currentFriends[1].name) {
          firedEffect++;
        }
      });
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
    expect(firedEffect).toBe(1);

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
    // and we haven't fired the effect for friend[1] again
    expect(firedEffect).toBe(1);
  });

  test("live array, bulk add", async () => {
    let friends: Friend[];

    const [resolve, startup, runDb] = runner();

    await createRoot(async () => {
      const currentFriends = createDexieArrayQuery(() => db.friends.toArray());

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
      const currentFriends = createDexieArrayQuery(() =>
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
