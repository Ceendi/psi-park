import { Link, useParams } from 'react-router';
import { CheckCircle2, Download, FileText } from 'lucide-react';
import { Button, Spinner, useToast } from '@/shared/ui';
import { api } from '@/shared/api/client';
import { formatDate, formatTime } from '@/shared/lib/dates';
import { formatPLN } from '@/shared/lib/money';
import { useInvoice, useReservation } from './api';
import { getApiMessage } from './errors';

/** Booking wizard — step 3 confirmation (`/rezerwacja/:id/sukces`, PLAN F4). */
export function SuccessPage() {
  const params = useParams();
  const { toast } = useToast();
  const id = Number(params.id);

  const reservation = useReservation(id, true);
  const r = reservation.data;
  const paid = Boolean(r && r.status !== 'pending_payment');
  const invoice = useInvoice(id, paid);

  async function downloadInvoice() {
    try {
      const { data } = await api.get<Blob>(`reservations/${id}/invoice/pdf/`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `faktura-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({ variant: 'error', title: 'Faktura niedostępna', description: getApiMessage(err) });
    }
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center md:px-8">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-green-50 text-green-700">
        <CheckCircle2 className="size-9" />
      </span>
      <h1 className="mt-5 text-2xl font-bold tracking-tight">Rezerwacja przyjęta!</h1>
      <p className="mt-2 text-[15px] text-ink-500">
        {paid
          ? 'Twoja rezerwacja oczekuje teraz na akceptację gospodarza. Powiadomimy Cię e-mailem.'
          : 'Potwierdzamy Twoją płatność — to potrwa chwilę.'}
      </p>

      <div className="mt-8 rounded-lg border border-ink-100 bg-surface p-5 text-left">
        {reservation.isLoading || !r ? (
          <div className="grid place-items-center py-6 text-green-700">
            <Spinner size={24} />
          </div>
        ) : (
          <dl className="flex flex-col gap-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Ogród</dt>
              <dd className="font-medium">{r.garden.title}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Termin</dt>
              <dd className="font-medium">
                {formatDate(r.start_time)} · {formatTime(r.start_time)}–{formatTime(r.end_time)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Pies</dt>
              <dd className="font-medium">{r.dog.name}</dd>
            </div>
            <div className="flex justify-between border-t border-ink-100 pt-2.5 text-base font-bold">
              <dt>Zapłacono</dt>
              <dd>{formatPLN(r.total_price)}</dd>
            </div>
            {invoice.data && (
              <div className="flex items-center justify-between pt-1 text-[13px] text-ink-500">
                <span className="flex items-center gap-1.5">
                  <FileText className="size-3.5" />
                  Faktura {invoice.data.number}
                </span>
              </div>
            )}
          </dl>
        )}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/panel">
          <Button variant="secondary">Moje rezerwacje</Button>
        </Link>
        {invoice.data && (
          <Button variant="secondary" leftIcon={<Download className="size-4" />} onClick={downloadInvoice}>
            Pobierz fakturę
          </Button>
        )}
        <Link to="/">
          <Button>Wróć do katalogu</Button>
        </Link>
      </div>
    </div>
  );
}
