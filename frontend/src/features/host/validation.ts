import { z } from 'zod';

/**
 * Garden create/edit form schema (PLAN §7.3, F6). Numeric/decimal inputs are kept
 * as strings in the form and normalised to the `GardenWrite` shape in `api.ts`.
 * Messages are Polish; the backend re-validates and its 400s map onto fields.
 */
const decimal = (msg: string) => z.string().refine((v) => v !== '' && !Number.isNaN(Number(v)), msg);
const intInRange = (min: number, max: number, msg: string) =>
  z.string().refine((v) => {
    const n = Number(v);
    return v !== '' && Number.isInteger(n) && n >= min && n <= max;
  }, msg);

export const gardenSchema = z
  .object({
    title: z.string().min(1, 'Podaj tytuł.').max(120, 'Tytuł jest za długi.'),
    description: z.string().min(1, 'Dodaj opis ogrodu.'),
    city: z.string().min(1, 'Podaj miasto.').max(80, 'Nazwa miasta jest za długa.'),
    address: z.string().min(1, 'Podaj adres.').max(200, 'Adres jest za długi.'),
    latitude: z.string().min(1, 'Wskaż lokalizację na mapie.'),
    longitude: z.string().min(1, 'Wskaż lokalizację na mapie.'),
    area_m2: intInRange(1, 2_000_000, 'Podaj powierzchnię w m².'),
    surface_type: z.enum(['', 'grass', 'sand', 'paved', 'mixed']),
    is_fenced: z.boolean(),
    fence_height_m: z.string(),
    max_dogs: intInRange(1, 50, 'Podaj maksymalną liczbę psów.'),
    price_per_hour: decimal('Podaj cenę za godzinę.'),
    open_from: z.string().min(1, 'Podaj godzinę otwarcia.'),
    open_to: z.string().min(1, 'Podaj godzinę zamknięcia.'),
    min_booking_hours: intInRange(1, 24, 'Podaj minimalną liczbę godzin.'),
    amenities: z.array(z.string()),
    rules: z.array(z.string()),
    is_active: z.boolean(),
  })
  .refine((d) => d.open_from < d.open_to, {
    message: 'Godzina zamknięcia musi być po otwarciu.',
    path: ['open_to'],
  });

export type GardenFormValues = z.infer<typeof gardenSchema>;

export const EMPTY_GARDEN: GardenFormValues = {
  title: '',
  description: '',
  city: '',
  address: '',
  latitude: '',
  longitude: '',
  area_m2: '',
  surface_type: 'grass',
  is_fenced: true,
  fence_height_m: '',
  max_dogs: '1',
  price_per_hour: '',
  open_from: '08:00',
  open_to: '20:00',
  min_booking_hours: '1',
  amenities: [],
  rules: [],
  is_active: true,
};
