import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, Checkbox, RadioGroup, Spinner, Textarea, TimeRangePicker } from '@/shared/ui';
import type { TimeRange } from '@/shared/ui';
import { DatePicker } from '@/shared/ui/DatePicker';
import type { DogListItem, Garden } from '@/shared/api/types';

const MAX_MESSAGE = 500;

function SectionHead({ step, title }: { step: string; title: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="font-mono text-[13px] font-semibold text-green-700">{step}</span>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    </div>
  );
}

export interface Step1Props {
  garden: Garden;
  dogs: DogListItem[];
  dogsLoading: boolean;
  date: Date | undefined;
  onDate: (d: Date | undefined) => void;
  range: TimeRange | null;
  onRange: (r: TimeRange | null) => void;
  slots: { hour: string; available: boolean }[];
  slotsLoading: boolean;
  dogId: number | null;
  onDog: (id: number) => void;
  message: string;
  onMessage: (v: string) => void;
  onAddDog: () => void;
  onProceed: () => void;
  proceeding: boolean;
  error: string | null;
}

/** Booking wizard — step 1 "Szczegóły rezerwacji" (Booking Form.html). */
export function Step1Details(props: Step1Props) {
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [health, setHealth] = useState(false);
  const [reminders, setReminders] = useState(false);

  const consentsOk = terms && privacy && health;
  const ready = Boolean(props.date && props.range && props.dogId && consentsOk);

  return (
    <div className="flex flex-col gap-8">
      {props.error && (
        <p role="alert" className="rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-ink">
          {props.error}
        </p>
      )}

      <section>
        <SectionHead step="01" title="Kiedy przyjedziesz?" />
        <div className="flex flex-col gap-4 lg:flex-row">
          <DatePicker selected={props.date} onSelect={props.onDate} disabled={{ before: new Date() }} />
          <div className="flex-1">
            <div className="mb-2 text-[13px] font-semibold text-ink-900">Godziny</div>
            {!props.date ? (
              <p className="rounded-md bg-ink-50 px-3 py-2 text-[13px] text-ink-500">Najpierw wybierz datę.</p>
            ) : props.slotsLoading ? (
              <div className="flex py-3 text-green-700">
                <Spinner size={20} />
              </div>
            ) : props.slots.length === 0 ? (
              <p className="rounded-md bg-ink-50 px-3 py-2 text-[13px] text-ink-500">Brak wolnych godzin tego dnia.</p>
            ) : (
              <TimeRangePicker slots={props.slots} value={props.range} onChange={props.onRange} />
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-ink-100 pt-8">
        <SectionHead step="02" title="Z którym psem przyjedziesz?" />
        {props.dogsLoading ? (
          <Spinner size={20} />
        ) : props.dogs.length === 0 ? (
          <p className="mb-3 rounded-md bg-ink-50 px-3 py-2 text-[13px] text-ink-500">
            Nie masz jeszcze dodanego psa.
          </p>
        ) : (
          <RadioGroup
            name="dog"
            value={props.dogId ? String(props.dogId) : undefined}
            onChange={(v) => props.onDog(Number(v))}
            options={props.dogs.map((d) => ({
              value: String(d.id),
              label: d.name,
              description: [d.breed, d.vaccinations_status === 'expired' ? 'Szczepienia nieaktualne!' : null]
                .filter(Boolean)
                .join(' · '),
            }))}
          />
        )}
        <Button variant="secondary" size="sm" className="mt-4" leftIcon={<Plus className="size-3.5" />} onClick={props.onAddDog}>
          Dodaj kolejnego psa
        </Button>
      </section>

      <section className="border-t border-ink-100 pt-8">
        <SectionHead step="03" title="Wiadomość dla gospodarza" />
        <Textarea
          rows={3}
          maxLength={MAX_MESSAGE}
          value={props.message}
          onChange={(e) => props.onMessage(e.target.value)}
          placeholder="np. Przyjadę z energicznym labradorem, który uwielbia aportować."
        />
        <div className="mt-1 text-right font-mono text-[11px] text-ink-300">
          {props.message.length}/{MAX_MESSAGE}
        </div>
      </section>

      <section className="border-t border-ink-100 pt-8">
        <SectionHead step="04" title="Akceptacja regulaminu" />
        <div className="flex flex-col gap-3">
          <Checkbox label="Akceptuję Regulamin serwisu PsiPark." checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <Checkbox label="Akceptuję Politykę prywatności (RODO)." checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} />
          <Checkbox
            label="Potwierdzam, że mój pies jest zdrowy i ma aktualne szczepienia."
            checked={health}
            onChange={(e) => setHealth(e.target.checked)}
          />
          <Checkbox
            label="Chcę otrzymywać przypomnienia o rezerwacji (opcjonalnie)."
            checked={reminders}
            onChange={(e) => setReminders(e.target.checked)}
          />
        </div>
      </section>

      <Button size="lg" disabled={!ready} loading={props.proceeding} onClick={props.onProceed}>
        Przejdź do płatności
      </Button>
    </div>
  );
}
