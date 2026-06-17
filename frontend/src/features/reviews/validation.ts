import { z } from 'zod';

/** Review form schema (PLAN §8.2 `ReviewWrite`). Rating 1–5 is required. */
export const reviewSchema = z.object({
  rating: z.number().int().min(1, 'Wybierz ocenę.').max(5),
  comment: z.string().max(2000, 'Komentarz jest za długi.'),
});

export type ReviewFormValues = z.infer<typeof reviewSchema>;
