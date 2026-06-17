import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { Button, EmptyState, GardenIcon, Skeleton, Stepper } from '@/shared/ui';
import type { TimeRange } from '@/shared/ui';
import { parseISO, toISODate } from '@/shared/lib/dates';
import type { Reservation } from '@/shared/api/types';
import { useGarden, useAvailability } from '@/features/gardens/api';
import { useClientDogs, useCreateReservation } from './api';
import { getApiMessage } from './errors';
import { Step1Details } from './components/Step1Details';
import { PaymentStep } from './components/PaymentStep';
import { AddDogModal } from './components/AddDogModal';
import { OrderSummary } from './components/OrderSummary';

const STEPS = ['Szczegóły rezerwacji', 'Płatność', 'Potwierdzenie'];

interface PrefillState {
  date?: string;
  start?: string;
  end?: string;
  dogs?: number;
}

function toIso(date: Date, hour: string): string {
  const h = Number.parseInt(hour.slice(0, 2), 10);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, 0, 0, 0).toISOString();
}

/** Booking wizard — steps 1 (details) and 2 (payment); step 3 is `/…/sukces`. */
export function BookingWizardPage() {
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const gardenId = Number(params.gardenId);
  const prefill = (location.state as PrefillState | null) ?? null;

  const garden = useGarden(gardenId);
  const dogs = useClientDogs();
  const createReservation = useCreateReservation();

  const [step, setStep] = useState<0 | 1>(0);
  const [date, setDate] = useState<Date | undefined>(prefill?.date ? parseISO(prefill.date) : undefined);
  const [range, setRange] = useState<TimeRange | null>(
    prefill?.start && prefill?.end ? { start: prefill.start, end: prefill.end } : null,
  );
  const [dogId, setDogId] = useState<number | null>(null);
  const [dogsCount] = useState(prefill?.dogs ?? 1);
  const [message, setMessage] = useState('');
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [addDogOpen, setAddDogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateISO = date ? toISODate(date) : '';
  const availability = useAvailability(gardenId, step === 0 ? dateISO : '');
  const slots = (availability.data?.slots ?? []).map((s) => ({ hour: s.hour, available: s.available }));

  if (garden.isLoading) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
        <Skeleton className="h-10 w-full rounded-md" />
      </div>
    );
  }
  if (garden.isError || !garden.data) {
    return (
      <div className="mx-auto max-w-[1100px] px-4 py-16 md:px-8">
        <EmptyState
          icon={<GardenIcon size={24} />}
          title="Nie znaleziono ogrodu"
          description="Nie można rozpocząć rezerwacji dla tego ogrodu."
          action={<Button onClick={() => navigate('/')}>Wróć do katalogu</Button>}
        />
      </div>
    );
  }

  async function proceed() {
    if (!date || !range || !dogId) return;
    setError(null);
    try {
      const res = await createReservation.mutateAsync({
        garden: gardenId,
        dog: dogId,
        start_time: toIso(date, range.start),
        end_time: toIso(date, range.end),
        dogs_count: dogsCount,
        message_to_host: message,
      });
      setReservation(res);
      setStep(1);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(getApiMessage(err));
    }
  }

  const selection = {
    date: dateISO,
    start: range?.start ?? '',
    end: range?.end ?? '',
    dogName: dogs.data?.find((d) => d.id === dogId)?.name,
    dogsCount,
  };

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-8 md:px-8">
      <Stepper steps={STEPS} current={step} className="mb-8" />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <div>
          {step === 0 ? (
            <Step1Details
              garden={garden.data}
              dogs={dogs.data ?? []}
              dogsLoading={dogs.isLoading}
              date={date}
              onDate={setDate}
              range={range}
              onRange={setRange}
              slots={slots}
              slotsLoading={availability.isLoading}
              dogId={dogId}
              onDog={setDogId}
              message={message}
              onMessage={setMessage}
              onAddDog={() => setAddDogOpen(true)}
              onProceed={proceed}
              proceeding={createReservation.isPending}
              error={error}
            />
          ) : (
            reservation && (
              <PaymentStep
                reservation={reservation}
                onPaid={() => navigate(`/rezerwacja/${reservation.id}/sukces`)}
              />
            )
          )}
        </div>

        <aside>
          <div className="sticky top-[96px]">
            <OrderSummary garden={garden.data} selection={selection} />
          </div>
        </aside>
      </div>

      <AddDogModal
        open={addDogOpen}
        onClose={() => setAddDogOpen(false)}
        onCreated={(dog) => setDogId(dog.id)}
      />
    </div>
  );
}
