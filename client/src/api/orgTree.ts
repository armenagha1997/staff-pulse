import { OrgTreeResponseSchema, type OrgNode } from "@/api/schema";

export class InvalidOrgTreeResponseError extends Error {
  constructor(details: string) {
    super(`Invalid org-tree API response: ${details}`);
    this.name = "InvalidOrgTreeResponseError";
  }
}

export async function fetchOrgTree(signal?: AbortSignal): Promise<OrgNode[]> {
  const res = await fetch("/api/org-tree", { signal });

  if (!res.ok) {
    throw new Error(`Org tree request failed with status ${res.status}`);
  }

  const json: unknown = await res.json();
  const parsed = OrgTreeResponseSchema.safeParse(json);

  if (!parsed.success) {
    throw new InvalidOrgTreeResponseError(parsed.error.message);
  }

  return parsed.data;
}
