import { QueryClient } from "@tanstack/react-query";

// staleTime keeps data fresh for 5s (assignment: "stale time 5 секунд") — within that
// window, remounts/refocus reuse the cache instead of issuing a new request.
// Cache invalidation happens explicitly (queryClient.invalidateQueries) only when the
// server signals a real data change, not on a fixed schedule.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
