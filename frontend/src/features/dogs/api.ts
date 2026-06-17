import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/api/client';
import type { Dog, DogListItem, Paginated } from '@/shared/api/types';
import type { DogFormValues } from './validation';

/**
 * Dogs data layer (PLAN §16.0 — components never call axios directly). The client
 * panel reads its own dogs and runs the full profile CRUD + avatar upload
 * (PLAN §8.2 `/dogs/`).
 */

export const dogsKeys = {
  all: ['dogs'] as const,
  detail: (id: number) => ['dogs', id] as const,
};

/** Turn the controlled form values into a `DogWrite` body (drops empties → null). */
function toDogPayload(values: DogFormValues): Record<string, unknown> {
  return {
    name: values.name.trim(),
    breed: values.breed.trim(),
    birth_date: values.birth_date || null,
    weight_kg: values.weight_kg ? values.weight_kg.replace(',', '.') : null,
    sex: values.sex,
    is_sterilized: values.is_sterilized,
    vaccinations_valid_until: values.vaccinations_valid_until || null,
    deworming_valid_until: values.deworming_valid_until || null,
    notes: values.notes.trim(),
  };
}

export function useDogs() {
  return useQuery({
    queryKey: dogsKeys.all,
    queryFn: async () => {
      const { data } = await api.get<Paginated<DogListItem>>('dogs/', {
        params: { page_size: 100 },
      });
      return data;
    },
  });
}

/** Full detail (the list shape omits dates/notes needed to pre-fill the edit form). */
export function useDog(id: number | null) {
  return useQuery({
    queryKey: id ? dogsKeys.detail(id) : ['dogs', 'none'],
    queryFn: async () => {
      const { data } = await api.get<Dog>(`dogs/${id}/`);
      return data;
    },
    enabled: id != null,
  });
}

export function useCreateDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: DogFormValues) => {
      const { data } = await api.post<Dog>('dogs/', toDogPayload(values));
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dogsKeys.all }),
  });
}

export function useUpdateDog(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: DogFormValues) => {
      const { data } = await api.patch<Dog>(`dogs/${id}/`, toDogPayload(values));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: dogsKeys.all });
      qc.invalidateQueries({ queryKey: dogsKeys.detail(id) });
    },
  });
}

export function useDeleteDog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`dogs/${id}/`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dogsKeys.all }),
  });
}

export function useUploadDogPhoto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }) => {
      const form = new FormData();
      form.append('photo', file);
      const { data } = await api.post<Dog>(`dogs/${id}/photo/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: dogsKeys.all });
      qc.invalidateQueries({ queryKey: dogsKeys.detail(id) });
    },
  });
}
