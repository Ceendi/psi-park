import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Lock, ShieldCheck } from 'lucide-react';
import { Button, Checkbox, FormField, Input, Spinner } from '@/shared/ui';
import { formatPLN } from '@/shared/lib/money';
import type { Billing, Reservation } from '@/shared/api/types';
import { useCreatePaymentIntent, useReservation } from '../api';
import { getApiMessage } from '../errors';
import { billingSchema, EMPTY_BILLING, type BillingValues } from '../validation';

const STRIPE_PURPLE = '#635BFF';
// Memoised across renders so loadStripe runs once per publishable key.
const stripeCache = new Map<string, Promise<Stripe | null>>();
function getStripe(key: string): Promise<Stripe | null> {
  if (!stripeCache.has(key)) stripeCache.set(key, loadStripe(key));
  return stripeCache.get(key)!;
}

/** Inner card form — mounted once we have a client secret (Elements context). */
function CardForm({ amount, reservationId, onPaid }: { amount: string; reservationId: number; onPaid: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  // After Stripe confirms, the webhook flips the reservation — poll until then.
  const reservation = useReservation(confirmed ? reservationId : null, confirmed);
  useEffect(() => {
    if (confirmed && reservation.data && reservation.data.status !== 'pending_payment') {
      onPaid();
    }
  }, [confirmed, reservation.data, onPaid]);

  async function pay() {
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${window.location.origin}/rezerwacja/${reservationId}/sukces` },
      redirect: 'if_required',
    });
    if (stripeError) {
      setError(stripeError.message ?? 'Płatność nie powiodła się. Sprawdź dane karty.');
      setSubmitting(false);
      return;
    }
    setConfirmed(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && (
        <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-ink">
          {error}
        </p>
      )}
      <Button size="lg" loading={submitting || confirmed} leftIcon={<Lock className="size-4" />} onClick={pay}>
        {confirmed ? 'Potwierdzamy płatność…' : `Zapłać ${formatPLN(amount)}`}
      </Button>
      <div className="flex flex-wrap justify-center gap-4 text-[11px] text-ink-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3" /> 3-D Secure
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3" /> PCI DSS
        </span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="size-3" /> Stripe
        </span>
      </div>
    </div>
  );
}

/** Booking wizard — step 2 "Płatność" (Payment.html, card-only via Stripe). */
export function PaymentStep({ reservation, onPaid }: { reservation: Reservation; onPaid: () => void }) {
  const createIntent = useCreatePaymentIntent();
  const [intent, setIntent] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<BillingValues>({ resolver: zodResolver(billingSchema), defaultValues: EMPTY_BILLING });
  const company = form.watch('company');
  const { errors } = form.formState;

  const stripePromise = useMemo(
    () => (intent ? getStripe(intent.publishableKey) : null),
    [intent],
  );

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    const billing: Billing = {
      billing_name: values.billing_name,
      billing_email: values.billing_email,
      billing_address: values.billing_address,
      billing_postal_code: values.billing_postal_code,
      billing_city: values.billing_city,
      billing_country: values.billing_country || 'PL',
      billing_company: values.company ? values.billing_company : '',
      tax_id: values.company ? values.tax_id : '',
    };
    try {
      const res = await createIntent.mutateAsync({ reservationId: reservation.id, billing });
      setIntent({ clientSecret: res.client_secret, publishableKey: res.publishable_key });
    } catch (err) {
      setFormError(getApiMessage(err, 'Nie udało się rozpocząć płatności.'));
    }
  });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <div className="mb-1 flex items-center gap-3">
          <span className="font-mono text-[13px] font-semibold text-green-700">01</span>
          <h2 className="text-lg font-semibold tracking-tight">Dane do rozliczenia</h2>
        </div>
        <p className="mb-4 text-[13px] text-ink-500">Wymagane do faktury i potwierdzenia płatności.</p>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {formError && (
            <p role="alert" className="rounded-md bg-danger-soft px-3 py-2 text-sm text-danger-ink">
              {formError}
            </p>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Imię i nazwisko" htmlFor="b-name" required error={errors.billing_name?.message}>
              <Input id="b-name" invalid={!!errors.billing_name} {...form.register('billing_name')} />
            </FormField>
            <FormField label="E-mail" htmlFor="b-email" required error={errors.billing_email?.message}>
              <Input id="b-email" type="email" invalid={!!errors.billing_email} {...form.register('billing_email')} />
            </FormField>
          </div>
          <FormField label="Adres" htmlFor="b-addr" required error={errors.billing_address?.message}>
            <Input id="b-addr" invalid={!!errors.billing_address} {...form.register('billing_address')} />
          </FormField>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Kod pocztowy" htmlFor="b-zip" required error={errors.billing_postal_code?.message}>
              <Input id="b-zip" invalid={!!errors.billing_postal_code} {...form.register('billing_postal_code')} />
            </FormField>
            <FormField label="Miasto" htmlFor="b-city" required error={errors.billing_city?.message}>
              <Input id="b-city" invalid={!!errors.billing_city} {...form.register('billing_city')} />
            </FormField>
            <FormField label="Kraj" htmlFor="b-country" required error={errors.billing_country?.message}>
              <Input id="b-country" maxLength={2} {...form.register('billing_country')} />
            </FormField>
          </div>
          <Checkbox label="Chcę fakturę na firmę" {...form.register('company')} />
          {company && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nazwa firmy" htmlFor="b-company" error={errors.billing_company?.message}>
                <Input id="b-company" {...form.register('billing_company')} />
              </FormField>
              <FormField label="NIP" htmlFor="b-nip" error={errors.tax_id?.message}>
                <Input id="b-nip" {...form.register('tax_id')} />
              </FormField>
            </div>
          )}
          {!intent && (
            <Button type="submit" size="lg" loading={createIntent.isPending}>
              Przejdź do płatności kartą
            </Button>
          )}
        </form>
      </section>

      {intent && stripePromise && (
        <section className="border-t border-ink-100 pt-8">
          <div className="mb-1 flex items-center gap-3">
            <span className="font-mono text-[13px] font-semibold text-green-700">02</span>
            <h2 className="text-lg font-semibold tracking-tight">Płatność kartą</h2>
          </div>
          <p className="mb-4 text-[13px] text-ink-500">
            Akceptujemy VISA, Mastercard i American Express. Karta testowa: 4242 4242 4242 4242.
          </p>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: intent.clientSecret,
              appearance: { variables: { colorPrimary: STRIPE_PURPLE, borderRadius: '10px' } },
            }}
          >
            <CardForm amount={reservation.total_price} reservationId={reservation.id} onPaid={onPaid} />
          </Elements>
        </section>
      )}

      {createIntent.isPending && !intent && (
        <div className="flex justify-center text-green-700">
          <Spinner size={24} />
        </div>
      )}
    </div>
  );
}
