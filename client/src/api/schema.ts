import { z } from "zod";

export const OrgNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  parentId: z.string().min(1).nullable(),
  headcount: z.number().nonnegative(),
  budget: z.number().nonnegative(),
  performance: z.number().min(0).max(100),
  updatedAt: z.string().min(1),
});

export const OrgTreeResponseSchema = z.array(OrgNodeSchema);

export type OrgNode = z.infer<typeof OrgNodeSchema>;

export const OrgNodePatchSchema = z.object({
  type: z.literal("node-updated"),
  id: z.string().min(1),
  changes: z
    .object({
      headcount: z.number().nonnegative().optional(),
      budget: z.number().nonnegative().optional(),
      performance: z.number().min(0).max(100).optional(),
      updatedAt: z.string().min(1).optional(),
    })
    .partial(),
});

export type OrgNodePatch = z.infer<typeof OrgNodePatchSchema>;
