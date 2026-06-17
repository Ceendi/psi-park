import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { GardenListItem, Paginated } from '@/shared/api/types';
import { toApiParams, type GardenFilters } from './filters';

/**
 * Public catalogue data layer (PLAN §8.2 `GET /gardens/`). The list is the only
 * read F2 needs; filters/sort/paging are all server-side. `keepPreviousData`
 * keeps the current results on screen while the next page/filter loads (no flash).
 */
export function useGardens(filters: GardenFilters) {
  const params = toApiParams(filters);
  return useQuery({
    queryKey: ['gardens', 'list', params],
    queryFn: async () => {
      const { data } = await api.get<Paginated<GardenListItem>>('gardens/', { params });
      return data;
    },
    placeholderData: keepPreviousData,
  });
}
