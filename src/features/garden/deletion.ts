import { z } from "zod";

export const PendingDelete = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(["plant", "sighting"]),
  deadline: z.number().nullable(),
  leaseUntil: z.number().optional(),
  status: z.enum(["pending", "committing", "retry", "failed"]),
});
export type PendingDelete = z.infer<typeof PendingDelete>;
const Journal = z.array(PendingDelete);
export interface DeleteStorage {
  read(owner: string, key: string): Promise<unknown>;
  update(
    owner: string,
    key: string,
    change: (raw: unknown) => unknown,
  ): Promise<unknown>;
}
export function deletionQueue(owner: string, storage: DeleteStorage) {
  const parse = (raw: unknown) => Journal.parse(raw ?? []);
  return {
    async list() {
      return parse(await storage.read(owner, "deletions"));
    },
    async enqueue(
      item: Pick<PendingDelete, "id" | "label" | "kind">,
      now: number,
      accessible = false,
    ) {
      await storage.update(owner, "deletions", (raw) => {
        const items = parse(raw);
        return items.some((x) => x.id === item.id && x.kind === item.kind)
          ? items
          : [
              ...items,
              {
                ...item,
                deadline: accessible ? null : now + 5000,
                status: "pending",
              },
            ];
      });
    },
    async undo(id: string) {
      await storage.update(owner, "deletions", (raw) =>
        parse(raw).filter((x) => x.id !== id || x.status !== "pending"),
      );
    },
    async dismiss(id: string) {
      await storage.update(owner, "deletions", (raw) =>
        parse(raw).map((x) =>
          x.id === id && x.status === "pending" ? { ...x, deadline: 0 } : x,
        ),
      );
    },
    async retry(id: string) {
      await storage.update(owner, "deletions", (raw) =>
        parse(raw).map((x) =>
          x.id === id ? { ...x, status: "retry", leaseUntil: 0 } : x,
        ),
      );
    },
    async restore(id: string) {
      await storage.update(owner, "deletions", (raw) =>
        parse(raw).filter((x) => x.id !== id || x.status !== "failed"),
      );
    },
    async flush(
      now: number,
      active: () => boolean,
      remove: (item: PendingDelete) => Promise<void>,
    ) {
      // Atomically claim each item; Undo cannot race a dispatched DELETE.
      for (const candidate of await this.list()) {
        if (!active()) return;
        let claimed = false;
        await storage.update(owner, "deletions", (raw) =>
          parse(raw).map((x) => {
            if (
              x.id !== candidate.id ||
              x.status === "failed" ||
              (x.status === "committing" && (x.leaseUntil ?? 0) > now) ||
              (x.status === "pending" &&
                (x.deadline === null || x.deadline > now))
            )
              return x;
            claimed = true;
            return { ...x, status: "committing", leaseUntil: now + 30000 };
          }),
        );
        if (!claimed || !active()) continue;
        try {
          await remove(candidate);
          await storage.update(owner, "deletions", (raw) =>
            parse(raw).filter((x) => x.id !== candidate.id),
          );
        } catch (error) {
          const status =
            typeof error === "object" && error !== null && "status" in error
              ? Number(error.status)
              : 0;
          await storage.update(owner, "deletions", (raw) =>
            parse(raw).map((x) =>
              x.id === candidate.id
                ? {
                    ...x,
                    status:
                      status >= 400 &&
                      status < 500 &&
                      ![401, 408, 429].includes(status)
                        ? "failed"
                        : "retry",
                  }
                : x,
            ),
          );
        }
      }
    },
  };
}
