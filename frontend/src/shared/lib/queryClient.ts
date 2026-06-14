import { QueryClient } from '@tanstack/react-query';

/**
 * Shared React Query client factory (PLAN §12). Lists are cached briefly so
 * navigating back to the catalogue is instant; we keep a single retry and skip
 * refetch-on-focus to avoid surprising the user with reloads.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
