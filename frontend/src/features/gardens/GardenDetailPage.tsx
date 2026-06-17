import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Check, Heart, MapPin, MessageSquare, Share2, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Avatar, Badge, Button, EmptyState, GardenIcon, Skeleton, StarFilledIcon, useToast } from '@/shared/ui';
import { useAuth } from '@/shared/auth';
import { cn } from '@/shared/lib/cn';
import { formatDate } from '@/shared/lib/dates';
import type { Garden } from '@/shared/api/types';
import { useGarden, useStartConversation } from './api';
import { useFavorites } from './favorites';
import { SURFACE_LABELS } from './labels';
import { Gallery } from './components/Gallery';
import { BookingWidget } from './components/BookingWidget';
import { ReviewsSection } from './components/ReviewsSection';

interface AmenityDisplay {
  code: string;
  label: string;
}

function Highlight({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-ink-100 p-3.5">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-green-50 text-green-700">{icon}</span>
      <div>
        <div className="text-[12px] text-ink-500">{label}</div>
        <div className="text-sm font-semibold text-ink-900">{value}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-ink-100 pt-6">
      <h3 className="mb-4 text-xl font-semibold tracking-tight">{title}</h3>
      {children}
    </section>
  );
}

function DetailBody({ garden }: { garden: Garden }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const favorites = useFavorites();
  const startConversation = useStartConversation();
  const [showAllAmenities, setShowAllAmenities] = useState(false);

  const amenities = (garden.amenities_display ?? []) as unknown as AmenityDisplay[];
  const rules = (garden.rules as string[] | null) ?? [];
  const visibleAmenities = showAllAmenities ? amenities : amenities.slice(0, 6);
  const saved = favorites.has(garden.id);

  function share() {
    void navigator.clipboard?.writeText(window.location.href);
    toast({ variant: 'success', title: 'Skopiowano link do ogrodu' });
  }

  function message() {
    if (!isAuthenticated) {
      navigate(`/logowanie?next=${encodeURIComponent(`/ogrody/${garden.id}`)}`);
      return;
    }
    startConversation.mutate(garden.id, {
      onSuccess: (conv) => navigate(`/panel/wiadomosci/${conv.id}`),
      onError: () =>
        toast({ variant: 'error', title: 'Nie udało się otworzyć rozmowy', description: 'Spróbuj ponownie.' }),
    });
  }

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
      <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-[13px] text-ink-500">
        <Link to="/" className="hover:text-ink-900">
          PsiPark
        </Link>
        <span>/</span>
        <Link to={`/?city=${encodeURIComponent(garden.city)}`} className="hover:text-ink-900">
          {garden.city}
        </Link>
        <span>/</span>
        <span className="text-ink-700">{garden.title}</span>
      </nav>

      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold leading-tight tracking-tight md:text-[32px]">{garden.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-700">
            <span className="flex items-center gap-1 font-semibold">
              <StarFilledIcon size={14} className="text-sun" />
              {garden.rating_avg != null ? garden.rating_avg.toFixed(2).replace('.', ',') : '—'}
            </span>
            <a href="#reviews" className="text-ink-500 underline-offset-2 hover:underline">
              {garden.rating_count} recenzji
            </a>
            {garden.host.is_verified_host && (
              <Badge variant="success" leftIcon={<ShieldCheck className="size-3.5" />}>
                Zweryfikowany gospodarz
              </Badge>
            )}
            <span className="flex items-center gap-1 text-ink-500">
              <MapPin className="size-3.5" />
              {garden.city}, {garden.address}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Share2 className="size-3.5" />} onClick={share}>
            Udostępnij
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leftIcon={<Heart className={cn('size-3.5', saved && 'fill-danger text-danger')} />}
            onClick={() => favorites.toggle(garden.id)}
          >
            {saved ? 'Zapisano' : 'Zapisz'}
          </Button>
        </div>
      </header>

      <Gallery photos={garden.photos} title={garden.title} />

      <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                Ogród prowadzony przez {garden.host.full_name}
              </h2>
              <p className="mt-0.5 text-[13px] text-ink-500">
                Gospodarz w PsiPark od {formatDate(garden.created_at, 'LLLL yyyy')}
              </p>
            </div>
            <Avatar name={garden.host.full_name} size={48} tone="green" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Highlight icon={<GardenIcon size={20} />} label="Powierzchnia" value={`${garden.area_m2} m²`} />
            <Highlight
              icon={<ShieldCheck className="size-5" />}
              label="Ogrodzenie"
              value={garden.is_fenced ? `Pełne${garden.fence_height_m ? `, ${garden.fence_height_m} m` : ''}` : 'Brak'}
            />
            <Highlight icon={<Check className="size-5" />} label="Maks. psów" value={`${garden.max_dogs}`} />
            <Highlight icon={<MapPin className="size-5" />} label="Nawierzchnia" value={SURFACE_LABELS[garden.surface_type]} />
          </div>

          <Section title="O tym ogrodzie">
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-700">{garden.description}</p>
          </Section>

          {amenities.length > 0 && (
            <Section title="Co oferuje ten ogród">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {visibleAmenities.map((a) => (
                  <div key={a.code} className="flex items-center gap-2.5 text-[14px] text-ink-700">
                    <Check className="size-4 text-green-700" />
                    {a.label}
                  </div>
                ))}
              </div>
              {amenities.length > 6 && (
                <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShowAllAmenities((s) => !s)}>
                  {showAllAmenities ? 'Pokaż mniej' : `Pokaż wszystkie ${amenities.length} udogodnień`}
                </Button>
              )}
            </Section>
          )}

          {rules.length > 0 && (
            <Section title="Zasady gospodarza">
              <ul className="flex flex-col gap-2.5">
                {rules.map((rule, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-[14px] text-ink-700">
                    <Check className="mt-0.5 size-4 shrink-0 text-green-700" />
                    {rule}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title="Poznaj gospodarza">
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-ink-100 p-5">
              <Avatar name={garden.host.full_name} size={56} tone="green" />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-semibold">
                  {garden.host.full_name}
                  {garden.host.is_verified_host && <ShieldCheck className="size-4 text-green-700" />}
                </div>
                <div className="text-[13px] text-ink-500">Odpowiada zwykle w ciągu kilku godzin</div>
              </div>
              <Button
                variant="secondary"
                leftIcon={<MessageSquare className="size-4" />}
                loading={startConversation.isPending}
                onClick={message}
              >
                Napisz do gospodarza
              </Button>
            </div>
          </Section>

          <div className="border-t border-ink-100 pt-6">
            <ReviewsSection gardenId={garden.id} ratingAvg={garden.rating_avg} ratingCount={garden.rating_count} />
          </div>
        </div>

        <aside>
          <div className="sticky top-[96px]">
            <BookingWidget garden={garden} />
          </div>
        </aside>
      </div>
    </div>
  );
}

/** Garden detail page (Garden Detail.html, PLAN F3). */
export function GardenDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const garden = useGarden(id);

  if (garden.isLoading) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-8 md:px-8">
        <Skeleton className="mb-5 h-10 w-2/3 rounded-md" />
        <Skeleton className="aspect-[16/7] w-full rounded-lg" />
      </div>
    );
  }

  if (garden.isError || !garden.data) {
    return (
      <div className="mx-auto max-w-[1200px] px-4 py-16 md:px-8">
        <EmptyState
          icon={<GardenIcon size={24} />}
          title="Nie znaleziono ogrodu"
          description="Ten ogród nie istnieje lub nie jest już dostępny."
          action={
            <Button onClick={() => garden.refetch()} variant="secondary">
              Spróbuj ponownie
            </Button>
          }
        />
      </div>
    );
  }

  return <DetailBody garden={garden.data} />;
}
