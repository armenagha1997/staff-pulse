import { useQuery } from "@tanstack/react-query";
import { fetchOrgTree } from "@/api/orgTree";

export const ORG_TREE_QUERY_KEY = ["org-tree"] as const;

export function useOrgTree() {
  return useQuery({
    queryKey: ORG_TREE_QUERY_KEY,
    // react-query passes an AbortSignal tied to the query lifecycle, so the request
    // is cancelled automatically on unmount / query cancellation.
    queryFn: ({ signal }) => fetchOrgTree(signal),
  });
}
