import { Component, createEffect, Show } from "solid-js";
import { For, createSignal } from "solid-js";

import { createDexieSignalQuery, createDexieArrayQuery } from "./solid-dexie";
import { DbFixture } from "./db-fixture";

const db = new DbFixture();

const DemoApp: Component = () => {
  const [counter, setCounter] = createSignal(0);
  const [min, setMin] = createSignal(0);
  const [max, setMax] = createSignal(100);

  const handleAdd = async () => {
    await db.friends.add({ name: `Friend ${counter()}`, age: counter() * 10 });
    console.log(`Friend ${counter()} added`);
    setCounter(counter() + 1);
  };

  const handleModify = async () => {
    const f = oldestFriend();
    if (f != null) {
      await db.friends.update(f.id as number, { name: f.name + "!" });
    }
  };

  const handleClear = async () => {
    await db.friends.clear();
    setCounter(0);
  };

  const friends = createDexieArrayQuery(() =>
    db.friends.where("age").between(min(), max()).toArray()
  );

  const friendsCount = createDexieSignalQuery(() => db.friends.count());

  const oldestFriend = createDexieSignalQuery(() =>
    db.friends.orderBy("age").last()
  );

  createEffect(() => {
    console.log("Friend 0 changed name: ", friends[0] && friends[0].name);
  });

  createEffect(() => {
    const o = oldestFriend();
    if (o != null) {
      console.log("Oldest friend name: ", o.name);
    }
  });

  return (
    <div>
      <div>
        {counter()} {min()} {max()}
      </div>
      <div>
        Min:{" "}
        <input
          value={min()}
          onInput={(e) => setMin(Number(e.currentTarget.value))}
        />
      </div>
      <div>
        Max:{" "}
        <input
          value={max()}
          onInput={(e) => setMax(Number(e.currentTarget.value))}
        />
      </div>
      <div>Total friends: {friendsCount()}</div>
      <div>
        Oldest age: <Show when={oldestFriend()}>{(friend) => friend.age}</Show>
      </div>
      <For each={friends}>
        {(friend) => (
          <div>
            {friend.id} {friend.name} {friend.age}
          </div>
        )}
      </For>
      <button onClick={handleAdd}>Add</button>
      <button onClick={handleModify}>Modify oldest friend</button>
      <button onClick={handleClear}>Clear</button>
    </div>
  );
};

export default DemoApp;
