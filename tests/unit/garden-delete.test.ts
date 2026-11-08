import { jest } from "@jest/globals";
import { deletionQueue } from "../../src/features/garden/deletion.js";
function storage() {
  const docs = new Map<string, unknown>();
  return {
    async read(o: string, k: string) {
      return docs.get(`${o}/${k}`) ?? null;
    },
    async update(o: string, k: string, f: (x: unknown) => unknown) {
      const v = f(docs.get(`${o}/${k}`) ?? null);
      docs.set(`${o}/${k}`, v);
      return v;
    },
  };
}
const item = { id: "p1", label: "Sunflower", kind: "plant" as const };
test("undo window makes zero destructive calls and survives coordinator restart", async () => {
  const db = storage();
  let q = deletionQueue("a", db);
  const remove = jest.fn(async () => {});
  await q.enqueue(item, 1000);
  await q.flush(5999, () => true, remove);
  expect(remove).not.toHaveBeenCalled();
  q = deletionQueue("a", db);
  expect(await q.list()).toHaveLength(1);
  await q.undo(item.id);
  await q.flush(8000, () => true, remove);
  expect(remove).not.toHaveBeenCalled();
  expect(await q.list()).toEqual([]);
});
test("expired deletions retry lost replies with independent items and scope", async () => {
  const db = storage(),
    a = deletionQueue("a", db),
    b = deletionQueue("b", db);
  await a.enqueue(item, 0);
  await a.enqueue({ ...item, id: "p2" }, 0);
  await b.enqueue(item, 0);
  await a.undo("p2");
  const remove = jest
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue(undefined);
  await a.flush(5000, () => true, remove);
  expect((await a.list())[0]?.status).toBe("retry");
  await deletionQueue("a", db).flush(6000, () => true, remove);
  expect(await a.list()).toEqual([]);
  expect(await b.list()).toHaveLength(1);
  expect(remove.mock.calls.map((x) => x[0].id)).toEqual(["p1", "p1"]);
});
test("screen reader gets a persistent undo opportunity and inactive scopes never dispatch", async () => {
  const q = deletionQueue("a", storage()),
    remove = jest.fn(async () => {});
  await q.enqueue(item, 0, true);
  await q.flush(999999, () => true, remove);
  expect(remove).not.toHaveBeenCalled();
  await q.dismiss(item.id);
  await q.flush(999999, () => false, remove);
  expect(remove).not.toHaveBeenCalled();
  await q.flush(999999, () => true, remove);
  expect(remove).toHaveBeenCalledTimes(1);
});
test("concurrent coordinators share a lease and permanent errors offer restoration", async () => {
  const db = storage(),
    a = deletionQueue("a", db),
    b = deletionQueue("a", db);
  await a.enqueue(item, 0);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const remove = jest.fn(async () => {
    await gate;
  });
  const first = a.flush(5000, () => true, remove);
  await b.flush(5001, () => true, remove);
  release();
  await first;
  expect(remove).toHaveBeenCalledTimes(1);
  await a.enqueue(item, 10000);
  await a.flush(
    15000,
    () => true,
    async () => {
      throw { status: 403 };
    },
  );
  expect((await a.list())[0]?.status).toBe("failed");
  await a.restore(item.id);
  expect(await a.list()).toEqual([]);
});
