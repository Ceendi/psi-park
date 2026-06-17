/**
 * Legal / help page content (PLAN F8). Placeholder copy with the mandatory
 * liability disclaimer (PLAN §11) — to be replaced by a lawyer-reviewed version.
 * Kept as data so a single `StaticPage` renders every document.
 */
export type StaticDocKey = 'regulamin' | 'polityka-prywatnosci' | 'pomoc' | 'uslugi-elektroniczne';

export interface StaticSection {
  heading: string;
  body: string[];
}

export interface StaticDoc {
  title: string;
  updated: string;
  intro: string;
  sections: StaticSection[];
}

const DISCLAIMER =
  'PsiPark jest wyłącznie pośrednikiem w wynajmie terenów i nie ponosi odpowiedzialności za szkody ' +
  'wyrządzone pupilowi ani przez pupila w trakcie pobytu. Opiekun psa odpowiada za jego zachowanie ' +
  'oraz za przestrzeganie zasad gospodarza.';

export const STATIC_DOCS: Record<StaticDocKey, StaticDoc> = {
  regulamin: {
    title: 'Regulamin serwisu',
    updated: '2026-06-01',
    intro:
      'Niniejszy regulamin określa zasady korzystania z platformy PsiPark — serwisu pośredniczącego ' +
      'w wynajmie prywatnych, ogrodzonych terenów dla psów.',
    sections: [
      {
        heading: '1. Definicje',
        body: [
          'Platforma — serwis internetowy PsiPark dostępny pod adresem psipark.pl.',
          'Gospodarz — użytkownik udostępniający teren do wynajęcia.',
          'Klient — użytkownik rezerwujący teren dla swojego psa.',
        ],
      },
      {
        heading: '2. Rezerwacje i płatności',
        body: [
          'Rezerwacja jest skuteczna po opłaceniu i akceptacji przez gospodarza.',
          'Płatności obsługuje operator Stripe. Do ceny wynajmu doliczana jest prowizja serwisowa.',
          'Anulowanie do 24 godzin przed startem uprawnia do pełnego zwrotu; później zwrot nie przysługuje.',
        ],
      },
      {
        heading: '3. Odpowiedzialność',
        body: [DISCLAIMER],
      },
    ],
  },
  'polityka-prywatnosci': {
    title: 'Polityka prywatności (RODO)',
    updated: '2026-06-01',
    intro:
      'Dbamy o Twoje dane osobowe. Poniżej wyjaśniamy, jakie dane przetwarzamy, w jakim celu i jakie ' +
      'masz prawa zgodnie z RODO.',
    sections: [
      {
        heading: '1. Administrator danych',
        body: ['Administratorem danych jest PsiPark sp. z o.o. Kontakt: kontakt@psipark.pl.'],
      },
      {
        heading: '2. Zakres i cel przetwarzania',
        body: [
          'Przetwarzamy dane konta (imię, nazwisko, e-mail, telefon) w celu świadczenia usługi.',
          'Dane rozliczeniowe przetwarzamy w celu wystawienia faktur i obsługi płatności.',
        ],
      },
      {
        heading: '3. Twoje prawa',
        body: [
          'Masz prawo dostępu, sprostowania, usunięcia i przeniesienia danych.',
          'Konto możesz usunąć w ustawieniach — dane są anonimizowane z zachowaniem dokumentów księgowych.',
        ],
      },
    ],
  },
  pomoc: {
    title: 'Centrum pomocy',
    updated: '2026-06-01',
    intro: 'Najczęstsze pytania i odpowiedzi. Nie znalazłeś rozwiązania? Napisz na kontakt@psipark.pl.',
    sections: [
      {
        heading: 'Jak zarezerwować ogród?',
        body: [
          'Wybierz ogród z katalogu, wskaż datę i godziny, wybierz psa i przejdź do płatności. ' +
            'Po opłaceniu gospodarz zatwierdza rezerwację.',
        ],
      },
      {
        heading: 'Jak zostać gospodarzem?',
        body: [
          'Zarejestruj konto gospodarza, dodaj ogród ze zdjęciami i lokalizacją. ' +
            'Oferta trafia do weryfikacji administratora przed publikacją.',
        ],
      },
      {
        heading: 'Jak działają zwroty?',
        body: ['Anulowanie do 24 godzin przed startem to pełny zwrot. Odrzucenie przez gospodarza również.'],
      },
    ],
  },
  'uslugi-elektroniczne': {
    title: 'Świadczenie usług drogą elektroniczną',
    updated: '2026-06-01',
    intro:
      'Informacja o warunkach świadczenia usług drogą elektroniczną zgodnie z ustawą z dnia 18 lipca 2002 r.',
    sections: [
      {
        heading: '1. Rodzaj usług',
        body: ['Platforma umożliwia zakładanie konta, publikowanie ofert, rezerwacje, płatności i czat.'],
      },
      {
        heading: '2. Wymagania techniczne',
        body: ['Do korzystania z serwisu wystarczy nowoczesna przeglądarka z włączoną obsługą JavaScript i cookies.'],
      },
      {
        heading: '3. Reklamacje i odpowiedzialność',
        body: ['Reklamacje przyjmujemy na kontakt@psipark.pl.', DISCLAIMER],
      },
    ],
  },
};
