import "fake-indexeddb/auto";
import {
  createRoot,
  createSignal,
  onMount,
  observable,
  from,
  Accessor,
  on,
  createEffect,
} from "solid-js";
import { waitForElementToBeRemoved } from "solid-testing-library";

import { DbFixture, Friend } from "./db-fixture";
import { createLiveQuery, createLiveArrayQuery2 } from "./soliddexie";

let db: DbFixture;

beforeEach(() => {
  db = new DbFixture();
});

afterEach(async () => {
  await db.delete();
});

test("some test", async () => {
  await db.friends.add({ name: "Foo", age: 10 });
  const result = await db.friends.toArray();
  expect(result).toMatchObject([{ age: 10, name: "Foo" }]);
});

// test("createLiveQuery without add", (done) => {
//   createRoot(async () => {
//     const friends = createLiveQuery(() => db.friends.toArray());
//     createEffect(() => {
//       // why is this undefined??
//       // expect(friends!()).toMatchObject([]);
//       done();
//     });
//   });
// });

// test("createLiveQuery with single add", (done) => {
//   createRoot(async () => {
//     const friends = createLiveQuery(() => db.friends.toArray());
//     await db.friends.add({ name: "Foo", age: 10 });

//     const effects: Friend[][] = [];

//     createEffect(() => {
//       effects.push(friends());
//       // an absolutely ridiculous way to track that all the effects come in
//       if (effects.length >= 2) {
//         expect(effects).toMatchObject([[], [{ name: "Foo", age: 10 }]]);
//         done();
//       }
//     });
//   });
// });

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

test("live array, add one", async () => {
  let friends: Friend[];

  const [resolve, wait, runDb] = runner();

  await createRoot(async () => {
    const currentFriends = createLiveArrayQuery2(() => db.friends.toArray());

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

  await wait();
  expect(friends!).toEqual([]);

  await runDb(async () => {
    await db.friends.add({ name: "Foo", age: 10 });
  });
  expect(friends!).toMatchObject([{ name: "Foo", age: 10 }]);
});

test("live array, add two", async () => {
  let friends: Friend[];

  const [resolve, wait, runDb] = runner();

  await createRoot(async () => {
    const currentFriends = createLiveArrayQuery2(() => db.friends.toArray());

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

  await wait();
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

// test("nicer approach", async () => {
//   let friends: Friend[];
//   let signal = new Signal();

//   const dbRun = async (f: () => Promise<void>): Promise<void> => {
//     signal = new Signal();
//     await f();
//     await signal.promise;
//   };

//   await createRoot(async () => {
//     const currentFriends = createLiveQuery(() => db.friends.toArray());

//     createEffect(() => {
//       friends = currentFriends();
//       signal.resolve();
//     });
//   });

//   await signal.promise;
//   expect(friends!).toEqual(undefined);

//   signal = new Signal();
//   await db.friends.add({ name: "Foo", age: 10 });
//   await signal.promise;
//   expect(friends!).toMatchObject([]);

//   signal = new Signal();
//   await signal.promise;
//   expect(friends!).toMatchObject([{ name: "Foo", age: 10 }]);

//   signal = new Signal();
//   await db.friends.add({ name: "Bar", age: 11 });
//   await signal.promise;
//   expect(friends!).toMatchObject([
//     { name: "Foo", age: 10 },
//     { name: "Bar", age: 11 },
//   ]);
// });

test("from subscribable", async () => {
  let out: () => string;
  let set: (v: string) => void;
  createRoot(() => {
    const [s, _set] = createSignal("Hi"),
      obsv$ = observable(s);

    set = _set;
    out = from(obsv$);
  });
  expect(out!()).toBe("Hi");
  set!("John");
  expect(out!()).toBe("John");
});

// test("createLiveQuery with multiple adds", (done) => {
//   createRoot(async () => {
//     const friends = createLiveQuery(() => db.friends.toArray());
//     await db.friends.add({ name: "Foo", age: 10 });
//     await db.friends.add({ name: "Bar", age: 11 });

//     const effects: Friend[][] = [];

//     createEffect(() => {
//       effects.push(friends());
//       console.log(effects);
//       // an absolutely ridiculous way to track that all the effects come in
//       if (effects.length == 2) {
//         console.log("Received", effects);
//         expect(effects).toMatchObject([
//           [],
//           [{ name: "Foo", age: 10, id: 1 }],
//           [
//             { name: "Foo", age: 10, id: 1 },
//             { name: "Bar", age: 11, id: 2 },
//           ],
//         ]);
//         done();
//       }
//     });
//   });
// });

// test("createLiveQuery with single add 2", (done) => {
//   createRoot(async () => {
//     const friends = createLiveQuery(() => db.friends.toArray());
//     await db.friends.add({ name: "Foo", age: 10 });

//     setTimeout(() => {
//       expect(friends!()).toMatchObject([{ name: "Foo", age: 10 }]);
//       done();
//     });
//   });
// });

const asyncTimeout = () => {
  return new Promise((resolve) => {
    setTimeout(resolve);
  });
};

// test("createLiveQuery with multiple adds", (done) => {
//   createRoot(async () => {
//     const friends = createLiveQuery(() => db.friends.toArray());
//     await db.friends.add({ name: "Foo", age: 10 });
//     setTimeout(() => {
//       expect(friends!()).toMatchObject([{ name: "Foo", age: 10 }]);
//       done();
//     });

//     // await db.friends.add({ name: "Bar", age: 11 });
//     // await asyncTimeout();
//     // expect(friends!()).toMatchObject([
//     //   { name: "Foo", age: 10 },
//     //   { name: "Bar", age: 11 },
//     // ]);
//     // done();
//   });
// });

// describe("test", () => {
//   it("works", () => {
//     let temp: string;
//     createRoot(() => {
//       onMount(() => (temp = "unpure"));
//     });
//     expect(temp!).toBe("unpure");
//   });
// });
