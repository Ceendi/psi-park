import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Plus, X } from 'lucide-react';
import {
  Button,
  Checkbox,
  FormField,
  Input,
  Select,
  Spinner,
  Textarea,
  Toggle,
  useToast,
} from '@/shared/ui';
import type { Amenity } from '@/shared/api/types';
import { applyApiErrors } from '@/features/account/forms';
import { useCreateGarden, useHostGarden, useUpdateGarden } from './api';
import { AMENITY_LABELS, AMENITY_ORDER } from './labels';
import { LocationPicker } from './components/LocationPicker';
import { PhotoManager } from './components/PhotoManager';
import { EMPTY_GARDEN, gardenSchema, type GardenFormValues } from './validation';

const KNOWN_FIELDS = [
  'title',
  'description',
  'city',
  'address',
  'latitude',
  'longitude',
  'area_m2',
  'surface_type',
  'fence_height_m',
  'max_dogs',
  'price_per_hour',
  'open_from',
  'open_to',
  'min_booking_hours',
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-ink-100 bg-surface p-6">
      <h2 className="mb-5 text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

/** Create / edit a garden (PLAN §7.3, F6). New gardens land in `pending` review. */
export function GardenFormPage() {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const gardenId = params.id ? Number(params.id) : null;
  const editing = gardenId != null;

  const detail = useHostGarden(gardenId);
  const createGarden = useCreateGarden();
  const updateGarden = useUpdateGarden(gardenId ?? 0);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<GardenFormValues>({ resolver: zodResolver(gardenSchema), defaultValues: EMPTY_GARDEN });

  useEffect(() => {
    if (editing && detail.data) {
      const g = detail.data;
      reset({
        title: g.title,
        description: g.description,
        city: g.city,
        address: g.address,
        latitude: String(g.latitude),
        longitude: String(g.longitude),
        area_m2: String(g.area_m2),
        surface_type: (g.surface_type ?? 'grass') as GardenFormValues['surface_type'],
        is_fenced: g.is_fenced,
        fence_height_m: g.fence_height_m ?? '',
        max_dogs: String(g.max_dogs),
        price_per_hour: String(g.price_per_hour),
        open_from: String(g.open_from).slice(0, 5),
        open_to: String(g.open_to).slice(0, 5),
        min_booking_hours: String(g.min_booking_hours),
        amenities: ((g.amenities as string[] | null) ?? []) as Amenity[],
        rules: ((g.rules as string[] | null) ?? []) as string[],
        is_active: g.is_active,
      });
    }
  }, [editing, detail.data, reset]);

  const amenities = (watch('amenities') ?? []) as Amenity[];
  const rules = watch('rules') ?? [];
  const isFenced = watch('is_fenced');
  const isActive = watch('is_active');
  const lat = watch('latitude');
  const lng = watch('longitude');

  function toggleAmenity(code: Amenity) {
    setValue(
      'amenities',
      amenities.includes(code) ? amenities.filter((a) => a !== code) : [...amenities, code],
      { shouldDirty: true },
    );
  }

  const mutation = editing ? updateGarden : createGarden;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await mutation.mutateAsync(values);
      if (editing) {
        toast({ variant: 'success', title: 'Zapisano zmiany' });
        navigate('/gospodarz');
      } else {
        toast({
          variant: 'success',
          title: 'Ogród utworzony',
          description: 'Dodaj zdjęcia (min. 5) — oferta czeka na weryfikację administratora.',
        });
        navigate(`/gospodarz/ogrody/${saved.id}/edycja`);
      }
    } catch (error) {
      setFormError(applyApiErrors(error, setError, KNOWN_FIELDS));
    }
  });

  if (editing && detail.isLoading) {
    return (
      <div className="grid place-items-center py-20 text-green-700">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/gospodarz')}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-500 transition hover:text-ink-900"
      >
        <ArrowLeft className="size-4" />
        Moje ogrody
      </button>
      <h1 className="mb-7 text-[28px] font-bold tracking-tight">
        {editing ? 'Edytuj ogród' : 'Nowy ogród'}
      </h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        {formError && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {formError}
          </p>
        )}

        <Section title="Podstawowe informacje">
          <div className="flex flex-col gap-4">
            <FormField label="Tytuł oferty" htmlFor="g-title" required error={errors.title?.message}>
              <Input id="g-title" invalid={!!errors.title} {...register('title')} />
            </FormField>
            <FormField label="Opis" htmlFor="g-desc" required error={errors.description?.message}>
              <Textarea id="g-desc" rows={4} invalid={!!errors.description} {...register('description')} />
            </FormField>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Miasto" htmlFor="g-city" required error={errors.city?.message}>
                <Input id="g-city" invalid={!!errors.city} {...register('city')} />
              </FormField>
              <FormField label="Adres / okolica" htmlFor="g-addr" required error={errors.address?.message}>
                <Input id="g-addr" invalid={!!errors.address} {...register('address')} />
              </FormField>
            </div>
          </div>
        </Section>

        <Section title="Parametry terenu">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Powierzchnia (m²)" htmlFor="g-area" required error={errors.area_m2?.message}>
              <Input id="g-area" inputMode="numeric" invalid={!!errors.area_m2} {...register('area_m2')} />
            </FormField>
            <FormField label="Nawierzchnia" htmlFor="g-surface" error={errors.surface_type?.message}>
              <Select id="g-surface" {...register('surface_type')}>
                <option value="grass">Trawa</option>
                <option value="sand">Piasek</option>
                <option value="paved">Utwardzona</option>
                <option value="mixed">Mieszana</option>
              </Select>
            </FormField>
            <FormField label="Maks. liczba psów" htmlFor="g-maxdogs" required error={errors.max_dogs?.message}>
              <Input id="g-maxdogs" inputMode="numeric" invalid={!!errors.max_dogs} {...register('max_dogs')} />
            </FormField>
            <FormField label="Wysokość ogrodzenia (m)" htmlFor="g-fence" error={errors.fence_height_m?.message}>
              <Input id="g-fence" inputMode="decimal" placeholder="np. 1,8" {...register('fence_height_m')} />
            </FormField>
          </div>
          <div className="mt-4">
            <Checkbox label="Teren jest w pełni ogrodzony" checked={isFenced} onChange={(e) => setValue('is_fenced', e.target.checked)} />
          </div>
        </Section>

        <Section title="Cennik i godziny">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Cena za godzinę (zł)" htmlFor="g-price" required error={errors.price_per_hour?.message}>
              <Input id="g-price" inputMode="decimal" invalid={!!errors.price_per_hour} {...register('price_per_hour')} />
            </FormField>
            <FormField label="Min. liczba godzin" htmlFor="g-min" required error={errors.min_booking_hours?.message}>
              <Input id="g-min" inputMode="numeric" invalid={!!errors.min_booking_hours} {...register('min_booking_hours')} />
            </FormField>
            <FormField label="Otwarcie" htmlFor="g-from" required error={errors.open_from?.message}>
              <Input id="g-from" type="time" invalid={!!errors.open_from} {...register('open_from')} />
            </FormField>
            <FormField label="Zamknięcie" htmlFor="g-to" required error={errors.open_to?.message}>
              <Input id="g-to" type="time" invalid={!!errors.open_to} {...register('open_to')} />
            </FormField>
          </div>
        </Section>

        <Section title="Lokalizacja">
          <LocationPicker lat={lat} lng={lng} onChange={(la, lo) => {
            setValue('latitude', la, { shouldValidate: true });
            setValue('longitude', lo, { shouldValidate: true });
          }} />
          {(errors.latitude || errors.longitude) && (
            <p className="mt-2 text-xs text-danger">Wskaż lokalizację na mapie.</p>
          )}
        </Section>

        <Section title="Udogodnienia">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {AMENITY_ORDER.map((code) => (
              <Checkbox
                key={code}
                label={AMENITY_LABELS[code]}
                checked={amenities.includes(code)}
                onChange={() => toggleAmenity(code)}
              />
            ))}
          </div>
        </Section>

        <Section title="Zasady gospodarza">
          <div className="flex flex-col gap-3">
            {rules.map((rule, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={rule}
                  onChange={(e) => {
                    const next = [...rules];
                    next[index] = e.target.value;
                    setValue('rules', next, { shouldDirty: true });
                  }}
                  placeholder="np. Sprzątanie po psie obowiązkowe"
                />
                <button
                  type="button"
                  onClick={() => setValue('rules', rules.filter((_, i) => i !== index), { shouldDirty: true })}
                  aria-label="Usuń zasadę"
                  className="grid size-10 shrink-0 place-items-center rounded-md text-ink-500 transition hover:bg-ink-50 hover:text-danger"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Plus className="size-3.5" />}
              onClick={() => setValue('rules', [...rules, ''], { shouldDirty: true })}
              className="self-start"
            >
              Dodaj zasadę
            </Button>
          </div>
        </Section>

        {editing && detail.data && (
          <Section title="Zdjęcia">
            <PhotoManager garden={detail.data} />
          </Section>
        )}

        <Section title="Widoczność">
          <Toggle
            label="Oferta widoczna w katalogu (po weryfikacji)"
            checked={isActive}
            onChange={(e) => setValue('is_active', e.target.checked)}
          />
        </Section>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => navigate('/gospodarz')}>
            Anuluj
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            {editing ? 'Zapisz zmiany' : 'Utwórz ogród'}
          </Button>
        </div>
      </form>
    </div>
  );
}
