import { z } from 'zod';

/**
 * Dog profile form schema (PLAN §7.2, F5). Messages are Polish; the backend stays
 * the source of truth and its 400s are mapped onto fields by `applyApiErrors`.
 * Optional fields use empty-string defaults from the controlled inputs and are
 * normalised to `null`/omitted before hitting `DogWrite`.
 */
export const dogSchema = z.object({
  name: z.string().min(1, 'Podaj imię psa.').max(60, 'Imię jest za długie.'),
  breed: z.string().max(80, 'Rasa jest za długa.'),
  birth_date: z.string(),
  weight_kg: z
    .string()
    .refine((v) => v === '' || /^\d{1,3}([.,]\d)?$/.test(v), 'Podaj wagę w kg, np. 18 lub 18,5.'),
  sex: z.enum(['', 'male', 'female']),
  is_sterilized: z.boolean(),
  vaccinations_valid_until: z.string(),
  deworming_valid_until: z.string(),
  notes: z.string().max(2000, 'Notatka jest za długa.'),
});

export type DogFormValues = z.infer<typeof dogSchema>;

export const EMPTY_DOG: DogFormValues = {
  name: '',
  breed: '',
  birth_date: '',
  weight_kg: '',
  sex: '',
  is_sterilized: false,
  vaccinations_valid_until: '',
  deworming_valid_until: '',
  notes: '',
};
