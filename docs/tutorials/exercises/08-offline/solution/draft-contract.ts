import { z } from "zod";
export const DraftSchema = z.object({ owner: z.string().min(1), id: z.string().min(1), nickname: z.string().trim().min(1).max(120) });
export type Draft = z.infer<typeof DraftSchema>;
