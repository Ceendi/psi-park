import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Button,
  Checkbox,
  FormField,
  Input,
  Modal,
  Select,
  Textarea,
  useToast,
} from '@/shared/ui';
import { applyApiErrors } from '@/features/account/forms';
import { useCreateDog, useDog, useUpdateDog } from '../api';
import { dogSchema, EMPTY_DOG, type DogFormValues } from '../validation';

export interface DogFormModalProps {
  open: boolean;
  onClose: () => void;
  /** `null` → create; a dog id → edit (its detail is fetched to pre-fill). */
  dogId: number | null;
}

const FIELDS = [
  'name',
  'breed',
  'birth_date',
  'weight_kg',
  'sex',
  'is_sterilized',
  'vaccinations_valid_until',
  'deworming_valid_until',
  'notes',
] as const;

/** Create / edit a dog profile (PLAN §7.2 fields). */
export function DogFormModal({ open, onClose, dogId }: DogFormModalProps) {
  const { toast } = useToast();
  const editing = dogId != null;
  const detail = useDog(open && editing ? dogId : null);
  const createDog = useCreateDog();
  const updateDog = useUpdateDog(dogId ?? 0);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<DogFormValues>({
    resolver: zodResolver(dogSchema),
    defaultValues: EMPTY_DOG,
  });

  // Reset to a blank form on open (create) or to the fetched values (edit).
  useEffect(() => {
    if (!open) return;
    if (!editing) {
      reset(EMPTY_DOG);
      setFormError(null);
      return;
    }
    if (detail.data) {
      const d = detail.data;
      reset({
        name: d.name ?? '',
        breed: d.breed ?? '',
        birth_date: d.birth_date ?? '',
        weight_kg: d.weight_kg ?? '',
        sex: d.sex ?? '',
        is_sterilized: d.is_sterilized ?? false,
        vaccinations_valid_until: d.vaccinations_valid_until ?? '',
        deworming_valid_until: d.deworming_valid_until ?? '',
        notes: d.notes ?? '',
      });
      setFormError(null);
    }
  }, [open, editing, detail.data, reset]);

  const mutation = editing ? updateDog : createDog;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await mutation.mutateAsync(values);
      toast({
        variant: 'success',
        title: editing ? 'Zapisano zmiany' : 'Dodano psa',
        description: editing
          ? 'Profil pupila został zaktualizowany.'
          : `${values.name} dołączył do Twoich pupili.`,
      });
      onClose();
    } catch (error) {
      setFormError(applyApiErrors(error, setError, FIELDS));
    }
  });

  const loadingDetail = editing && detail.isLoading;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'Edytuj profil psa' : 'Dodaj psa'}
      description="Im więcej danych podasz, tym lepsze rekomendacje ogrodów dostaniesz."
    >
      {loadingDetail ? (
        <p className="py-8 text-center text-sm text-ink-500">Wczytuję profil…</p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-ink">
              {formError}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Imię" htmlFor="dog-name" required error={errors.name?.message}>
              <Input id="dog-name" invalid={!!errors.name} {...register('name')} />
            </FormField>
            <FormField label="Rasa" htmlFor="dog-breed" error={errors.breed?.message}>
              <Input id="dog-breed" placeholder="np. Beagle" {...register('breed')} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Data urodzenia" htmlFor="dog-birth" error={errors.birth_date?.message}>
              <Input id="dog-birth" type="date" {...register('birth_date')} />
            </FormField>
            <FormField label="Waga (kg)" htmlFor="dog-weight" error={errors.weight_kg?.message}>
              <Input
                id="dog-weight"
                inputMode="decimal"
                placeholder="18"
                invalid={!!errors.weight_kg}
                {...register('weight_kg')}
              />
            </FormField>
            <FormField label="Płeć" htmlFor="dog-sex" error={errors.sex?.message}>
              <Select id="dog-sex" {...register('sex')}>
                <option value="">—</option>
                <option value="female">Suka</option>
                <option value="male">Pies</option>
              </Select>
            </FormField>
          </div>

          <Checkbox label="Sterylizacja / kastracja" {...register('is_sterilized')} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              label="Szczepienia ważne do"
              htmlFor="dog-vacc"
              error={errors.vaccinations_valid_until?.message}
            >
              <Input id="dog-vacc" type="date" {...register('vaccinations_valid_until')} />
            </FormField>
            <FormField
              label="Odrobaczanie ważne do"
              htmlFor="dog-deworm"
              error={errors.deworming_valid_until?.message}
            >
              <Input id="dog-deworm" type="date" {...register('deworming_valid_until')} />
            </FormField>
          </div>

          <FormField
            label="Notatki / książeczka zdrowia"
            htmlFor="dog-notes"
            hint="Uwagi dla gospodarza, informacje zdrowotne."
            error={errors.notes?.message}
          >
            <Textarea id="dog-notes" rows={3} {...register('notes')} />
          </FormField>

          <div className="mt-2 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose} type="button">
              Anuluj
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {editing ? 'Zapisz zmiany' : 'Dodaj psa'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
