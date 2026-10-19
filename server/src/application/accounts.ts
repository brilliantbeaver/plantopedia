import { z } from "zod";
import { Id } from "@plantopedia/contracts";
import type { Auth } from "../http/identity.js";
import type { Dependencies } from "./ports.js";
import { hash, path } from "./core.js";
import { scanRecords } from "../storage/repository.js";
export const DeletedUser = z.object({
  id: Id,
  uid: Id,
  status: z.enum(["deleting", "deleted"]),
});
const OwnedJob = z.object({ id: Id, owner: Id });
export function accountService(deps: Dependencies) {
  async function cleanup(uid: string) {
    const auth = { uid, sessionId: "account-cleanup" };
    await deps.voice.closeUser(uid);
    await deps.photos.removePrefix(`${path(auth)}/`);
    await deps.repository.removeTree(path(auth));
    for (const collection of [
      "memory_work",
      "memory_failures",
      "deletion_work",
    ])
      for await (const job of scanRecords(
        deps.repository,
        collection,
        OwnedJob,
      ))
        if (job.owner === uid)
          await deps.repository.transaction(async (tx) =>
            tx.delete(`${collection}/${job.id}`),
          );
    await deps.identity.deleteUser(uid);
    await deps.repository.transaction(async (tx) => {
      tx.set(`deleted_users/${hash(uid)}`, {
        id: hash(uid),
        uid,
        status: "deleted",
      });
      tx.delete(`account_deletion_work/${hash(uid)}`);
    });
  }
  async function remove(auth: Auth) {
    await deps.repository.transaction(async (tx) => {
      tx.set(`deleted_users/${hash(auth.uid)}`, {
        id: hash(auth.uid),
        uid: auth.uid,
        status: "deleting",
      });
      tx.set(`account_deletion_work/${hash(auth.uid)}`, {
        id: hash(auth.uid),
        uid: auth.uid,
        status: "deleting",
      });
    });
    await cleanup(auth.uid);
  }
  async function processBatch() {
    const jobs = await deps.repository.list(
      "account_deletion_work",
      DeletedUser,
      3,
    );
    await Promise.allSettled(jobs.map((job) => cleanup(job.uid)));
  }
  return { remove, processBatch };
}
