import { Link, Outlet } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { Avatar, Logo, StarFilledIcon } from '@/shared/ui';
import gardenDog from '@/assets/garden-dog.svg';

/** Split-screen auth shell (assets/auth.css): illustration + form column. */
export function AuthLayout() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden flex-col overflow-hidden bg-gradient-to-b from-green-50 to-green-300 p-10 lg:flex">
        <img
          src={gardenDog}
          alt=""
          className="pointer-events-none absolute inset-0 size-full select-none object-cover"
        />
        <Link
          to="/"
          className="relative z-10 inline-flex items-center gap-2.5 self-start rounded-pill bg-white/85 px-4 py-2.5 text-[19px] font-bold tracking-tight shadow-1 backdrop-blur"
        >
          <Logo size={32} />
          PsiPark
        </Link>
        <figure className="relative z-10 mt-auto max-w-[380px] rounded-lg bg-white/90 p-6 shadow-2 backdrop-blur">
          <div className="mb-2.5 flex gap-0.5 text-sun">
            {[1, 2, 3, 4, 5].map((i) => (
              <StarFilledIcon key={i} size={16} />
            ))}
          </div>
          <blockquote className="mb-4 text-[15px] font-medium leading-relaxed text-ink-900">
            „Mój pies wreszcie może pobiegać bez smyczy w bezpiecznym, ogrodzonym miejscu. PsiPark to
            strzał w dziesiątkę."
          </blockquote>
          <figcaption className="flex items-center gap-3">
            <Avatar initials="KN" tone="clay" size={36} />
            <div>
              <div className="text-[13px] font-semibold">Katarzyna Nowak</div>
              <div className="font-mono text-[11px] text-ink-500">Właścicielka Łaty</div>
            </div>
          </figcaption>
        </figure>
      </aside>

      <div className="flex flex-col items-center overflow-y-auto px-6 py-8 md:px-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 self-start rounded-pill px-3.5 py-2 text-[13px] text-ink-500 transition hover:bg-green-50 hover:text-green-800"
        >
          <ArrowLeft className="size-4" />
          Wróć do strony głównej
        </Link>
        <main className="mt-8 w-full max-w-[440px]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
