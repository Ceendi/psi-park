import { Link, useNavigate } from 'react-router';
import { Button, Card, PriceTag, Rating, Badge, ShieldIcon } from '@/shared/ui';

/** Branded landing placeholder for `/`. The full catalogue + map ships in F2. */
export function HomePlaceholder() {
  const navigate = useNavigate();
  return (
    <section className="mx-auto grid max-w-[1400px] items-center gap-14 px-4 py-16 md:px-8 lg:grid-cols-[1.2fr_1fr]">
      <div>
        <span className="inline-flex items-center gap-2 rounded-pill border border-ink-100 bg-surface px-3 py-1.5 text-xs font-semibold text-ink-700">
          <span className="size-1.5 rounded-full bg-green-600 ring-[3px] ring-green-100" />
          Polska · ogrody dla psów
        </span>
        <h1 className="mt-3 text-[clamp(2.5rem,5vw,3.5rem)] font-bold leading-[1.05] tracking-tight">
          Znajdź{' '}
          <span className="relative whitespace-nowrap text-green-700">
            idealny ogród
            <span className="absolute inset-x-0 -bottom-0.5 -z-10 h-2.5 rounded bg-green-100" />
          </span>{' '}
          dla swojego psa
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-ink-500">
          Wynajmij prywatny, ogrodzony teren na godziny — spacer, trening i zabawa bez innych psów i
          ludzi. Rezerwacja w 30 sekund.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => navigate('/rejestracja')}>
            Załóż konto
          </Button>
          <Button variant="secondary" size="lg" onClick={() => navigate('/logowanie')}>
            Zaloguj się
          </Button>
        </div>
        <p className="mt-6 text-sm text-ink-500">
          Pełny katalog z mapą i filtrami powstaje w części F2.
          {import.meta.env.DEV && (
            <>
              {' '}
              <Link to="/_ui" className="font-medium text-green-800 underline underline-offset-2">
                Podgląd design systemu →
              </Link>
            </>
          )}
        </p>
      </div>

      {/* Preview card — a taste of the GardenCard built fully in F2. */}
      <Card padded={false} className="overflow-hidden">
        <div className="relative aspect-[4/3] bg-[linear-gradient(160deg,#DCEFD8_0%,#C8E1C3_100%)]">
          <div className="absolute left-3.5 top-3.5">
            <Badge variant="solid" leftIcon={<ShieldIcon size={12} />}>
              Zweryfikowany gospodarz
            </Badge>
          </div>
          <div className="grid size-full place-items-center font-mono text-[11px] text-green-800/70">
            // zdjęcie ogrodu 4:3
          </div>
        </div>
        <div className="flex flex-col gap-2 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-base font-semibold tracking-tight">Ogród z basenem i wiatą</h3>
            <Rating value={4.9} size={13} showValue />
          </div>
          <p className="text-[13px] text-ink-500">Kraków, Wola Justowska · 3,4 km</p>
          <PriceTag amount="45.00" className="mt-2" />
        </div>
      </Card>
    </section>
  );
}
