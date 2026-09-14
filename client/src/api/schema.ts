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

export const StructuredFilterSchema = z.object({
  nameContains: z.string().optional(),
  levels: z.array(z.number()).optional(),
  minHeadcount: z.number().optional(),
  maxHeadcount: z.number().optional(),
  minBudget: z.number().optional(),
  maxBudget: z.number().optional(),
  minPerformance: z.number().optional(),
  maxPerformance: z.number().optional(),
});

export type StructuredFilter = z.infer<typeof StructuredFilterSchema>;

export const AiSearchResponseSchema = z.object({
  filter: StructuredFilterSchema,
  source: z.enum(["llm", "heuristic"]),
});

export type AiSearchResponse = z.infer<typeof AiSearchResponseSchema>;
