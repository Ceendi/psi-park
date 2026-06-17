import { useEffect, useState } from 'react';
import { Button, FormField, Input, Modal, useToast } from '@/shared/ui';
import type { DogListItem } from '@/shared/api/types';
import { useAddDog } from '../api';
import { getApiMessage } from '../errors';

/** Quick "add a dog" used inside the booking step-1 picker (PLAN F4). */
export function AddDogModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (dog: DogListItem) => void;
}) {
  const { toast } = useToast();
  const addDog = useAddDog();
  const [name, setName] = useState('');
  const [breed, setBreed] = useState('');
  const [vacc, setVacc] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName('');
      setBreed('');
      setVacc('');
      setError(null);
    }
  }, [open]);

  async function submit() {
    if (name.trim() === '') {
      setError('Podaj imię psa.');
      return;
    }
    try {
      const dog = await addDog.mutateAsync({ name, breed, vaccinations_valid_until: vacc });
      toast({ variant: 'success', title: 'Dodano psa' });
      onCreated(dog);
      onClose();
    } catch (err) {
      setError(getApiMessage(err, 'Nie udało się dodać psa.'));
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Dodaj psa"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Anuluj
          </Button>
          <Button loading={addDog.isPending} onClick={submit}>
            Dodaj psa
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-ink">
            {error}
          </p>
        )}
        <FormField label="Imię" htmlFor="qd-name" required>
          <Input id="qd-name" value={name} onChange={(e) => setName(e.target.value)} invalid={!!error && !name} />
        </FormField>
        <FormField label="Rasa" htmlFor="qd-breed">
          <Input id="qd-breed" value={breed} placeholder="np. Beagle" onChange={(e) => setBreed(e.target.value)} />
        </FormField>
        <FormField
          label="Szczepienia ważne do"
          htmlFor="qd-vacc"
          hint="Wymagane, by zarezerwować — muszą być ważne w dniu wizyty."
        >
          <Input id="qd-vacc" type="date" value={vacc} onChange={(e) => setVacc(e.target.value)} />
        </FormField>
      </div>
    </Modal>
  );
}
