import { Link } from 'react-router';
import { Logo } from '@/shared/ui';

interface FooterLink {
  label: string;
  to: string;
}

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'PsiPark',
    links: [
      { label: 'O nas', to: '/pomoc' },
      { label: 'Jak to działa', to: '/pomoc' },
      { label: 'Kontakt', to: '/pomoc' },
    ],
  },
  {
    heading: 'Dla właścicieli psów',
    links: [
      { label: 'Znajdź ogród', to: '/' },
      { label: 'Pomoc', to: '/pomoc' },
      { label: 'Zasady rezerwacji', to: '/regulamin' },
    ],
  },
  {
    heading: 'Dla gospodarzy',
    links: [
      { label: 'Zostań gospodarzem', to: '/rejestracja' },
      { label: 'Standardy bezpieczeństwa', to: '/regulamin' },
    ],
  },
  {
    heading: 'Regulamin',
    links: [
      { label: 'Regulamin serwisu', to: '/regulamin' },
      { label: 'Polityka prywatności (RODO)', to: '/polityka-prywatnosci' },
      { label: 'Usługi elektroniczne', to: '/uslugi-elektroniczne' },
    ],
  },
];

/** Global dark footer (Home Page.html) with legal links wired to F8 routes. */
export function Footer() {
  return (
    <footer className="mt-24 bg-ink-900 px-4 pb-8 pt-16 text-ink-200 md:px-8">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid grid-cols-2 gap-10 border-b border-white/10 pb-12 md:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 text-[19px] font-bold text-bone">
              <Logo size={36} />
              PsiPark
            </Link>
            <p className="mt-4 max-w-[280px] text-[13px] leading-relaxed text-ink-300">
              Platforma do wynajmu prywatnych ogrodów i wybiegów dla psów. Bezpieczne, spokojne
              miejsca w całej Polsce — zarezerwujesz w 30 sekund.
            </p>
          </div>
          {COLUMNS.map((column) => (
            <div key={column.heading}>
              <h4 className="mb-4 text-[13px] font-semibold text-bone">{column.heading}</h4>
              <ul className="flex flex-col gap-2.5">
                {column.links.map((link) => (
                  <li key={`${column.heading}-${link.label}`}>
                    <Link to={link.to} className="text-[13px] text-ink-300 transition hover:text-bone">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 pt-8 font-mono text-xs text-ink-300 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 PsiPark sp. z o.o. · Wszystkie prawa zastrzeżone</span>
          <span>Platforma nie odpowiada za szkody wyrządzone pupilowi.</span>
        </div>
      </div>
    </footer>
  );
}
