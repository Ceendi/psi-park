# PsiPark — kompletny plan implementacji

> **Status:** zatwierdzony do realizacji.
> **Źródła:** `analiza.pdf` (analiza wstępna), `projekt.pdf` (diagram przypadków użycia, ERD, diagram hierarchii funkcji, projekt interfejsu z Claude Design, lista technologii).
> **Przeznaczenie:** ten dokument jest jedynym źródłem prawdy dla agentów implementujących poszczególne części systemu. Każda część (B0–B10, F0–F8) jest samodzielnym zadaniem dla jednego agenta.

---

## Spis treści

1. [Jak korzystać z tego dokumentu (instrukcja dla agentów)](#1-jak-korzystać-z-tego-dokumentu)
2. [Produkt — wizja, role, słownik pojęć](#2-produkt)
3. [Decyzje architektoniczne i korekty względem projekt.pdf](#3-decyzje-architektoniczne)
4. [Stos technologiczny i wersje (kompatybilność)](#4-stos-technologiczny)
5. [Struktura repozytorium](#5-struktura-repozytorium)
6. [Standardy jakości: clean code, SOLID, testy](#6-standardy-jakości)
7. [Model danych — pełna specyfikacja](#7-model-danych)
8. [Kontrakt API REST](#8-kontrakt-api-rest)
9. [Protokół WebSocket](#9-protokół-websocket)
10. [Integracje: Stripe, e-mail, faktury PDF, mapa](#10-integracje)
11. [Bezpieczeństwo i RODO](#11-bezpieczeństwo-i-rodo)
12. [Wydajność — budżety i techniki](#12-wydajność)
13. [Środowisko uruchomieniowe (Docker Compose)](#13-środowisko-uruchomieniowe)
14. [Dane demonstracyjne (seed)](#14-dane-demonstracyjne)
15. [Podział pracy — BACKEND (części B0–B10)](#15-podział-pracy--backend)
16. [Podział pracy — FRONTEND (części F0–F8) + specyfikacja stron](#16-podział-pracy--frontend)
17. [Kolejność realizacji i równoległość (DAG)](#17-kolejność-realizacji)
18. [Świadomie poza zakresem MVP](#18-świadomie-poza-zakresem-mvp)
19. [Ryzyka i pułapki techniczne](#19-ryzyka-i-pułapki)
20. [Końcowy smoke test (scenariusz E2E)](#20-końcowy-smoke-test)

---

## 1. Jak korzystać z tego dokumentu

### 1.1. Szablon zlecenia dla agenta

Każdą część zleca się agentowi promptem według wzoru:

```
Pracujesz w repozytorium PsiPark. Przeczytaj plik docs/PLAN.md — w całości sekcje 1–6
oraz sekcje wskazane w Twojej części. Zaimplementuj część <ID> (np. B3) dokładnie
według docs/PLAN.md, sekcja 15.x / 16.x. Nie wykraczaj poza zakres części. Po skończeniu
uruchom testy i lint zgodnie z Definition of Done tej części i zraportuj wynik.
```

### 1.2. Reguły nadrzędne (obowiązują każdego agenta)

1. **Kontrakt API (sekcja 8) i model danych (sekcja 7) są wiążące.** Nie wymyślaj endpointów, pól ani statusów spoza specyfikacji. Jeśli widzisz konieczność zmiany — zatrzymaj się i opisz problem w raporcie końcowym zamiast samowolnie zmieniać kontrakt.
2. **Nie dodawaj bibliotek spoza sekcji 4.** Jeśli czegoś brakuje, wybierz rozwiązanie w stdlib/istniejących zależnościach albo zgłoś w raporcie.
3. **Język:** cały kod, identyfikatory, docstringi, komentarze, nazwy commitów — po angielsku. Wszystkie teksty widoczne dla użytkownika (UI, e-maile, komunikaty błędów `detail`) — po polsku. Wartości enumów w API — po angielsku (np. `confirmed`), tłumaczenie na PL robi frontend.
4. **Nie zmieniaj struktury katalogów** z sekcji 5 i nie przenoś istniejących plików, chyba że część jawnie tego wymaga.
5. **Testy są częścią zakresu**, nie opcją. Część bez zielonych testów jest nieskończona.
6. **Migracje:** jedna spójna migracja na aplikację na część (przed oddaniem zrób `makemigrations` od zera dla nowych modeli; nie zostawiaj łańcuszka poprawkowych migracji w obrębie jednej części).
7. **Sekrety:** nigdy nie commituj `.env`. Aktualizuj `.env.example`, gdy dodajesz zmienną.
8. **Niejasność:** wybierz prostsze rozwiązanie zgodne z duchem dokumentu i dopisz decyzję do sekcji „Decyzje implementacyjne" w `README.md`.
9. **Definition of Done globalne** (oprócz DoD części):
   - `docker compose up` działa, healthcheck przechodzi,
   - backend: `ruff check .` i `ruff format --check .` czyste, `pytest` zielony,
   - backend: zaktualizowany snapshot OpenAPI `backend/schema.yaml` (`python manage.py spectacular --file schema.yaml`),
   - frontend: `npm run lint`, `npm run typecheck` (tsc --noEmit), `npm run test` zielone, `npm run build` przechodzi,
   - brak `print()`/`console.log` debugowych, brak `TODO` bez numeru części, brak martwego kodu.

### 1.3. Konwencja gita

- Gałąź per część: `feat/b3-gardens`, `feat/f2-home-search`.
- Commity: Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- Po skończeniu części: commit z opisem zakresu + raport w opisie PR/commita.

---

## 2. Produkt

### 2.1. Wizja

**PsiPark** to webowy marketplace (Polska, język polski, waluta PLN), na którym **gospodarze** (właściciele prywatnych ogrodów) wynajmują swoje ogrodzone tereny na godziny **klientom** (właścicielom psów) na spacery, trening i zabawę bez innych psów i ludzi. Platforma jest pośrednikiem: pobiera prowizję serwisową od każdej transakcji, obsługuje płatności online (Stripe), komunikację (czat), recenzje i faktury PDF.

Główny proces biznesowy (z analiza.pdf):
`Rejestracja gospodarza → dodanie ogrodu → weryfikacja ogrodu przez admina → wyszukanie przez klienta (mapa+filtry) → rezerwacja → płatność online → akceptacja gospodarza → pobyt → recenzja`.

### 2.2. Role użytkowników

| Rola | Kod w systemie | Uprawnienia |
|---|---|---|
| Niezalogowany | — | przegląda listę i szczegóły zweryfikowanych ogrodów, czyta recenzje, rejestruje się, loguje |
| Klient (właściciel psa) | `client` | wszystko co niezalogowany + profile psów (CRUD), rezerwacje (tworzenie, anulowanie, historia), płatności, faktury PDF, recenzje, czat z gospodarzem, edycja profilu |
| Gospodarz (właściciel terenu) | `host` | ogrody (CRUD + zdjęcia), zarządzanie rezerwacjami (akceptacja/odrzucenie), harmonogram, zarobki, czat z klientami, edycja profilu |
| Administrator | `admin` | weryfikacja/odrzucanie ogrodów, weryfikacja kont gospodarzy, blokowanie użytkowników, wgląd we wszystko (panel React + Django Admin) |

Jedno konto ma dokładnie jedną rolę (wybieraną przy rejestracji: klient albo gospodarz; admin tworzony seedem/komendą). To uproszczenie zgodne z mockupami (przełącznik „Klient/Gospodarz" na rejestracji).

### 2.3. Słownik pojęć

| Pojęcie | Definicja |
|---|---|
| Ogród (Garden) | oferta gospodarza: teren z lokalizacją, parametrami, cennikiem godzinowym i zdjęciami; widoczny publicznie po weryfikacji przez admina |
| Rezerwacja (Reservation) | zajęcie konkretnego ogrodu w przedziale `[start_time, end_time)` przez klienta z konkretnym psem; pełne godziny |
| Slot | godzina zegarowa w ramach godzin otwarcia ogrodu (np. 15:00–16:00) |
| Prowizja serwisowa | opłata platformy doliczana klientowi: `PLATFORM_FEE_PERCENT`% wartości wynajmu (domyślnie 10%) |
| Weryfikacja ogrodu | ręczna akceptacja oferty przez admina przed publikacją |
| Gospodarz zweryfikowany | konto hosta oznaczone przez admina (`verified_at`); badge „Zweryfikowany gospodarz" w UI |
| Rezerwacja zakończona | rezerwacja `confirmed`, której `end_time` minął — uprawnia do recenzji |

---

## 3. Decyzje architektoniczne

Decyzje wiążące z uzasadnieniem. Agent nie podważa tych decyzji w trakcie implementacji.

| # | Decyzja | Uzasadnienie |
|---|---|---|
| AD-1 | **Monorepo** `psi-park/` z katalogami `backend/` i `frontend/`, spinane jednym `docker-compose.yml` | najprostszy dev-setup; frontend i backend pozostają w pełni rozdzielone (osobne procesy, komunikacja wyłącznie po HTTP/WS) |
| AD-2 | **SPA React + czyste REST API** (DRF) + WebSocket (Channels) tylko dla czatu i powiadomień live | zgodnie z projekt.pdf; brak SSR — nie jest wymagany |
| AD-3 | **JWT** (simplejwt): access 30 min, refresh 30 dni, rotacja + blacklista. Access trzymany w pamięci JS, refresh w `localStorage` | standardowy flow simplejwt; rotacja ogranicza ryzyko wycieku refresh tokena; mockup „Zapamiętaj mnie na 30 dni" → refresh 30 dni |
| AD-4 | **Płatność: Stripe PaymentIntent + Payment Element** (formularz osadzony na stronie), webhook `payment_intent.succeeded` przez kontener `stripe-cli` | mockup pokazuje wbudowany formularz karty (nie redirect na Stripe Checkout); PaymentIntent to kanoniczny, najlepiej udokumentowany flow |
| AD-5 | **Przepływ rezerwacji: klient płaci od razu, gospodarz akceptuje po płatności** (`pending_payment → awaiting_host → confirmed/rejected`); odrzucenie/anulowanie = automatyczny pełny refund (anulowanie przez klienta <24h przed startem — bez zwrotu) | wizard w mockupie ma płatność jako krok 2 rezerwacji, a panel gospodarza ma „Oczekujące decyzji" z Akceptuj/Odrzuć — oba fakty wymuszają ten model |
| AD-6 | **Mapa: Leaflet + kafelki OpenStreetMap**, lokalizacja ogrodu wskazywana **kliknięciem na mapie** w formularzu (adres i miasto wpisywane ręcznie); brak geokodowania | projekt.pdf wskazuje Leaflet (nowszy dokument wygrywa z Google Maps z analizy); brak geokodera = zero zewnętrznych limitów/kluczy |
| AD-7 | **Zdjęcia: lokalny wolumen Dockera (`MEDIA_ROOT`)**, kompresja Pillow przy uploadzie (oryginał ≤1920 px, miniatura 640 px, JPEG q=82) | lista technologii w projekt.pdf nie zawiera S3; kompresja realizuje wymaganie niefunkcjonalne z analizy |
| AD-8 | **E-maile: synchronicznie przez SMTP do Mailpit**, za fasadą `notifications.services.send()` | brak Celery w stosie; Mailpit lokalny = ms-owe opóźnienia; fasada pozwala później podmienić na kolejkę bez zmian w wywołaniach (DIP) |
| AD-9 | **Warstwa usług**: views (DRF) cienkie → `services.py` (zapisy, logika biznesowa, transakcje) + `selectors.py` (odczyty, optymalizacja zapytań) | wymóg clean code/SOLID; wzorzec opisany w sekcji 6 |
| AD-10 | **Czat: model `Conversation`** (klient ↔ ogród, gospodarz wynika z ogrodu) zamiast luźnych wiadomości sender/receiver z ERD | umożliwia czat przed rezerwacją (przycisk „Napisz do gospodarza" w mockupie szczegółów ogrodu) i listę konwersacji jak w mockupie czatu |
| AD-11 | **Brak Celery/crona**: wygasanie nieopłaconych rezerwacji rozwiązane leniwie (filtrowanie po `expires_at` w zapytaniach) + komenda `cleanup_expired_reservations` do ręcznego/cyklicznego odpalenia | minimalizacja stosu; szczegóły w sekcji 7.6 i części B4 |
| AD-12 | **Administracja dwutorowo**: pełny Django Admin (szybki, niezawodny) + minimalny panel React (kolejka weryfikacji ogrodów, użytkownicy) na dedykowanych endpointach `/api/v1/admin/…` | use case'y wymagają funkcji admina; mockupy nie definiują UI admina, więc panel React jest celowo prosty |
| AD-13 | **API w snake_case**, format błędów DRF + pole `code` dla błędów biznesowych | brak warstwy translacji nazw = mniej kodu i błędów |
| AD-14 | **TypeScript na frontendzie** (strict) | wymóg jakości; typy generowane z OpenAPI (openapi-typescript) eliminują dryf kontraktu |
| AD-15 | **Strefa czasowa**: `TIME_ZONE="Europe/Warsaw"`, `USE_TZ=True` (przechowywanie w UTC); API przyjmuje/zwraca ISO-8601 z offsetem | jedyna poprawna obsługa zmiany czasu letniego przy slotach godzinowych |
| AD-16 | **Pieniądze**: `DecimalField` w PLN w bazie; do Stripe kwoty w groszach (`int(total * 100)`); nigdy float | poprawność rozliczeń |

### 3.1. Korekty względem ERD z projekt.pdf

ERD z projekt.pdf jest bazą, ale zawiera błędy/braki. Sekcja 7 zawiera ostateczny model. Lista zmian i powodów:

| # | Zmiana | Powód |
|---|---|---|
| K-1 | `Review.author_id UNIQUE` i `Review.garden_id UNIQUE` (osobno) → **`UniqueConstraint(author, garden)`** (para) + `OneToOne(reservation)` | osobne UNIQUE oznaczałyby: jedna recenzja na użytkownika *w całym systemie* i jedna na ogród *w ogóle* — to oczywisty błąd diagramu |
| K-2 | `Reservation.status (pending, confirmed, cancelled)` → **5 statusów**: `pending_payment, awaiting_host, confirmed, rejected, cancelled` | 3 statusy nie mieszczą przepływu płatność→akceptacja gospodarza widocznego w mockupach (taby „Oczekujące/Zaakceptowane/Odrzucone") |
| K-3 | `Payment.stripe_session_id` → **`stripe_payment_intent_id`** + statusy `pending, succeeded, failed, refunded` + pola danych rozliczeniowych | wynika z AD-4 (PaymentIntent zamiast Checkout Session); krok „Dane do rozliczenia" w mockupie wymaga przechowania danych do faktury |
| K-4 | `ChatMessage.receiver_id`, `reservation_id` → **`Conversation(client, garden)`** + `ChatMessage(conversation, sender)` | wynika z AD-10 |
| K-5 | `Garden` — dodane pola: `city`, `surface_type`, `fence_height_m`, `open_from`, `open_to`, `min_booking_hours`, `amenities`, `rules`, `verification_status` (zamiast samego `is_verified`), `rejection_reason`, `is_active` | filtr „miasto" i karta ogrodu z mockupu wymagają `city`; godziny otwarcia i udogodnienia są wprost na mockupach; status weryfikacji ma 3 stany („OCZEKUJE WERYFIKACJI" na mockupie) |
| K-6 | `Dog.age` → **`birth_date`**; dodane `weight_kg`, `sex`, `is_sterilized`, `vaccinations_valid_until` (data), `deworming_valid_until` (data); `vaccinations_info` → `notes` | wiek się dezaktualizuje; mockup „Moi pupile" pokazuje wagę, płeć, sterylizację i daty ważności szczepień/odrobaczenia z kolorowymi statusami |
| K-7 | `Reservation` — dodane: `price_per_hour_snapshot`, `subtotal`, `service_fee`, `total_price`, `expires_at`, `paid_at`, `decided_at`, `cancelled_at`, `message_to_host`, `dogs_count` | snapshot cen chroni historię przed zmianą cennika; pozostałe pola obsługują maszynę stanów i statystyki z mockupów |
| K-8 | `Invoice.file_url` → `pdf` (FileField) + **`number`** (unikalna numeracja `PSI/RRRR/MM/NNNN`) + tabela licznika `InvoiceSequence` | faktura bez numeru nie jest fakturą; licznik w tabeli = odporność na wyścigi |
| K-9 | Wszystkie modele dostają `created_at`/`updated_at` (abstrakcyjny `TimeStampedModel`) | standard audytowy |
| K-10 | `User` — dodane: `terms_accepted_at`, `marketing_consent`, `verified_at` (dla hostów); `role` z wartościami `client/host/admin` (EN) | zgody z formularza rejestracji (RODO), weryfikacja gospodarzy przez admina |

---

## 4. Stos technologiczny

### 4.1. Backend (Python 3.13)

Plik `backend/requirements.txt` — wersje przypięte do sprawdzonych, kompatybilnych zakresów:

```
Django>=5.2,<5.3                          # LTS; wspiera Pythona 3.13
djangorestframework>=3.16,<3.17           # oficjalne wsparcie Django 5.2 + Py3.13 (release 03.2025)
djangorestframework-simplejwt>=5.5,<6.0   # JWT; wspiera DRF 3.16/Django 5.2
django-cors-headers>=4.7,<5.0
django-filter>=25.1,<26.0                 # filtry list (calver)
drf-spectacular>=0.28,<0.29               # OpenAPI 3 schema
channels>=4.2,<5.0                        # WebSocket
channels-redis>=4.2,<5.0                  # channel layer na Redisie
daphne>=4.1,<5.0                          # serwer ASGI (także autoreload runserver przez app 'daphne')
psycopg[binary]>=3.2,<4.0                 # sterownik PostgreSQL (psycopg 3)
django-environ>=0.12,<0.13                # konfiguracja z env
argon2-cffi>=23.1                         # hasher haseł Argon2
Pillow>=11.0,<12.0                        # obrazy + kompresja
weasyprint>=65,<67                        # faktury PDF (wymaga pakietów systemowych — patrz Dockerfile)
stripe>=11,<13                            # SDK Stripe
redis>=5.2,<7.0
```

`backend/requirements-dev.txt`:

```
-r requirements.txt
pytest>=8.3
pytest-django>=4.11
pytest-cov>=6.0
factory-boy>=3.3
freezegun>=1.5
ruff>=0.11
```

**Uwagi kompatybilności (sprawdzone):**
- DRF 3.16 to pierwsza wersja z oficjalnym wsparciem Django 5.2 i Pythona 3.13 — nie schodzić poniżej.
- `channels` 4.x współdzieli `asgiref` z Django 5.2 — bez konfliktów; `daphne` musi być w `INSTALLED_APPS` **na pierwszym miejscu**, żeby `runserver` serwował ASGI (HTTP+WS) z autoreloadem w dev.
- WeasyPrint wymaga bibliotek systemowych (Pango); obraz `python:3.13-slim` + `apt-get install libpango-1.0-0 libpangoft2-1.0-0 fonts-liberation shared-mime-info` — patrz sekcja 13.2. Na gołym Windowsie WeasyPrint nie zadziała — **backend rozwijamy wyłącznie w Dockerze**.
- `psycopg` w wariancie 3 (nie `psycopg2`) — Django 5.2 w pełni go wspiera.

### 4.2. Frontend (Node 22 LTS)

`frontend/package.json` — dependencies:

```jsonc
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router": "^7.6.0",            // v7: importy z "react-router" (NIE react-router-dom)
    "@tanstack/react-query": "^5.80.0",  // cache/fetch — wspiera React 19
    "axios": "^1.9.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^5.0.0",           // v5 WYMAGA React 19 — zgodne
    "@stripe/stripe-js": "^5.0.0",
    "@stripe/react-stripe-js": "^3.6.0", // v3 wspiera React 19 (PaymentElement)
    "react-hook-form": "^7.56.0",
    "zod": "^3.24.0",                    // celowo zod 3 — para znana z resolvers ^3
    "@hookform/resolvers": "^3.10.0",
    "react-day-picker": "^9.7.0",        // kalendarz dostępności
    "date-fns": "^4.1.0",
    "lucide-react": "^0.510.0",          // ikony
    "clsx": "^2.1.0",
    "@fontsource-variable/inter": "^5.2.0",
    "@fontsource-variable/jetbrains-mono": "^5.2.0"  // mono z design systemu (ceny, ID, metadane)
  },
  "devDependencies": {
    "typescript": "~5.8.0",
    "vite": "^6.3.0",
    "@vitejs/plugin-react": "^4.4.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0",       // Tailwind v4 — plugin Vite, konfiguracja w CSS (@theme), NIE tailwind.config.js
    "vitest": "^3.1.0",
    "@testing-library/react": "^16.3.0",
    "@testing-library/jest-dom": "^6.6.0",
    "@testing-library/user-event": "^14.6.0",
    "jsdom": "^26.0.0",
    "openapi-typescript": "^7.6.0",      // generowanie typów z backend/schema.yaml
    "@types/leaflet": "^1.9.0",
    "eslint": "^9.0.0",
    "typescript-eslint": "^8.0.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "prettier": "^3.5.0"
  }
}
```

**Uwagi kompatybilności (sprawdzone):**
- `react-leaflet@5` ma peer dependency na React 19 — dokładnie nasza wersja; przy React 18 by nie zadziałał.
- React Router v7: pakiet nazywa się `react-router`; wszystkie importy (`createBrowserRouter`, `RouterProvider`, `Link`, `useNavigate`, `Outlet`…) z `"react-router"`. Nie instalować `react-router-dom`.
- Tailwind v4: brak `tailwind.config.js` — motyw definiowany w CSS przez `@theme` (sekcja 16.1). Nie generować configu w stylu v3.
- `zod@3` + `@hookform/resolvers@3` — sprawdzona para; nie podnosić zod do 4 bez podniesienia resolvers do ≥5.
- Vitest 3 + Testing Library 16 — wspierają React 19.

### 4.3. Infrastruktura

| Składnik | Obraz | Rola |
|---|---|---|
| PostgreSQL | `postgres:17-alpine` | główna baza (wymagane rozszerzenie `btree_gist` — instaluje migracja) |
| Redis | `redis:7-alpine` | channel layer dla Django Channels |
| Mailpit | `axllent/mailpit:latest` | lokalny SMTP (port 1025) + UI podglądu maili (port 8025) |
| Stripe CLI | `stripe/stripe-cli:latest` | forwardowanie webhooków Stripe (tryb testowy) do backendu |
| Backend | build z `backend/Dockerfile` (python:3.13-slim) | Django + DRF + Channels, port 8000 |
| Frontend | `node:22-alpine` (dev) | Vite dev server, port 5173 |

---

## 5. Struktura repozytorium

```
psi-park/
├── docs/
│   ├── PLAN.md                  # ten dokument (źródło prawdy)
│   ├── analiza.pdf              # analiza wstępna (źródłowa)
│   ├── projekt.pdf              # UML, ERD, projekt UI, lista technologii (źródłowy)
│   └── design/                  # handoff Claude Design — prototypy 9 ekranów FE (sek. 16.1.1)
├── README.md                    # quickstart + sekcja "Decyzje implementacyjne"
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   ├── pyproject.toml           # konfiguracja ruff + pytest
│   ├── manage.py
│   ├── schema.yaml              # snapshot OpenAPI (generowany, commitowany)
│   ├── config/
│   │   ├── settings/
│   │   │   ├── base.py
│   │   │   ├── dev.py
│   │   │   └── test.py
│   │   ├── urls.py              # /api/v1/... + /admin/ + media w DEBUG
│   │   ├── asgi.py              # ProtocolTypeRouter (http + websocket)
│   │   └── wsgi.py
│   └── apps/
│       ├── core/                # TimeStampedModel, wyjątki, paginacja, permissions, health, utils obrazów
│       │   ├── models.py
│       │   ├── exceptions.py
│       │   ├── pagination.py
│       │   ├── permissions.py
│       │   ├── images.py
│       │   ├── views.py         # /health/
│       │   └── management/commands/seed_demo.py
│       ├── accounts/            # User, auth, profil
│       ├── dogs/
│       ├── gardens/
│       ├── reservations/
│       ├── payments/
│       ├── invoices/
│       ├── reviews/
│       ├── chat/                # modele + consumers + REST historii
│       ├── notifications/       # fasada e-mail + szablony
│       └── adminpanel/          # endpointy /api/v1/admin/...
└── frontend/
    ├── package.json
    ├── vite.config.ts           # plugin react + tailwind + vitest
    ├── tsconfig.json            # strict: true, alias @ -> src
    ├── eslint.config.js
    ├── index.html
    └── src/
        ├── main.tsx
        ├── index.css            # @import "tailwindcss" + @theme (design tokens)
        ├── app/
        │   ├── router.tsx       # cała tablica tras (route table w sekcji 16.2)
        │   ├── providers.tsx    # QueryClientProvider, AuthProvider, Toaster
        │   └── layouts/         # PublicLayout, AuthLayout, DashboardLayout (klient/host/admin)
        ├── shared/
        │   ├── api/
        │   │   ├── client.ts    # axios + interceptory JWT (refresh queue)
        │   │   ├── schema.d.ts  # wygenerowane typy OpenAPI (commitowane)
        │   │   └── types.ts     # aliasy typów domenowych na schema.d.ts
        │   ├── auth/            # AuthContext, tokens.ts, RequireRole.tsx
        │   ├── ui/              # design system (sekcja 16.1)
        │   └── lib/             # money.ts, dates.ts, ws.ts, cn.ts
        └── features/
            ├── auth/            # strony logowania/rejestracji/resetu
            ├── gardens/         # strona główna + szczegóły ogrodu
            ├── booking/         # wizard rezerwacji + płatność
            ├── reservations/    # panel klienta: rezerwacje
            ├── dogs/            # panel klienta: pupile
            ├── reviews/
            ├── chat/
            ├── account/         # ustawienia konta (wspólne klient/host)
            ├── host/            # panel gospodarza (ogrody, rezerwacje, harmonogram, zarobki)
            ├── admin/           # panel admina
            └── static/          # Regulamin, Polityka prywatności, Pomoc
```

### 5.1. Warstwy backendu (obowiązkowe w każdej aplikacji domenowej)

```
apps/<domena>/
├── models.py        # modele + constraints + indeksy; BEZ logiki biznesowej (poza properties)
├── selectors.py     # WSZYSTKIE odczyty dla API (querysety z select_related/prefetch/annotate)
├── services.py      # WSZYSTKIE zapisy i logika biznesowa (transakcje, walidacje domenowe, side effects)
├── serializers.py   # tylko (de)serializacja i walidacja kształtu danych
├── views.py         # cienkie APIView/ViewSet: parse -> service/selector -> response
├── urls.py
├── permissions.py   # opcjonalnie, permission classes specyficzne dla domeny
├── admin.py
├── apps.py
├── migrations/
└── tests/
    ├── factories.py
    ├── test_services.py
    └── test_api.py
```

---

## 6. Standardy jakości

### 6.1. Zasady SOLID w tym projekcie — konkretnie

- **S (SRP):** widok DRF nie zawiera logiki biznesowej — tylko: uwierzytelnienie/uprawnienia, walidacja wejścia serializerem, wywołanie jednej funkcji z `services.py`/`selectors.py`, budowa odpowiedzi. Jedna funkcja serwisowa = jeden przypadek użycia (np. `create_reservation`, `accept_reservation`). Przetwarzanie obrazów tylko w `core/images.py`. Wysyłka maili tylko w `notifications/services.py`.
- **O (OCP):** nowy typ e-maila = nowy wpis w rejestrze szablonów `notifications.TEMPLATES` + pliki szablonów; bez zmian w kodzie wysyłki. Nowe udogodnienie ogrodu = nowy wpis w `Amenity.choices`; bez zmian w logice.
- **L (LSP):** permission classes i serializery dziedziczą wyłącznie po klasach DRF zgodnie z ich kontraktem; żadnych podklas zmieniających semantykę metod bazowych.
- **I (ISP):** osobne serializery na wejście i wyjście oraz na listę i szczegół (`GardenListSerializer`, `GardenDetailSerializer`, `GardenWriteSerializer`) — żadnych „boskich" serializerów z dziesiątkami flag.
- **D (DIP):** serwisy wyższego poziomu zależą od fasad, nie od bibliotek: płatności przez `payments/gateway.py` (moduł `StripeGateway` z funkcjami `create_payment_intent`, `refund`), maile przez `notifications.services.send()`, zegar przez `django.utils.timezone.now` przekazywany jako parametr domyślny tam, gdzie testy tego wymagają.

### 6.2. Wzorzec services/selectors — przykład wzorcowy

```python
# apps/reservations/services.py
from django.db import transaction
from django.utils import timezone

@transaction.atomic
def create_reservation(
    *,
    client: User,
    garden_id: int,
    dog_id: int,
    start_time: datetime,
    end_time: datetime,
    dogs_count: int,
    message_to_host: str = "",
) -> Reservation:
    """Create a pending-payment reservation after validating availability and dog ownership.

    Raises:
        SlotUnavailable: when the requested window collides with an active reservation.
        DogVaccinationRequired: when the dog's vaccination date is missing or expired.
        ValidationError: for window/opening-hours violations.
    """
    garden = Garden.objects.select_for_update().get(
        id=garden_id, verification_status=Garden.Verification.APPROVED, is_active=True
    )
    dog = _get_owned_dog(client=client, dog_id=dog_id)
    _validate_window(garden=garden, start_time=start_time, end_time=end_time)
    _validate_dog_health(dog=dog, on_date=start_time.date())
    if selectors.has_collision(garden_id=garden.id, start_time=start_time, end_time=end_time):
        raise SlotUnavailable()
    hours = _hours_between(start_time, end_time)
    subtotal = garden.price_per_hour * hours
    service_fee = money_round(subtotal * settings.PLATFORM_FEE_PERCENT / 100)
    return Reservation.objects.create(
        client=client, garden=garden, dog=dog, dogs_count=dogs_count,
        start_time=start_time, end_time=end_time,
        price_per_hour_snapshot=garden.price_per_hour,
        subtotal=subtotal, service_fee=service_fee, total_price=subtotal + service_fee,
        status=Reservation.Status.PENDING_PAYMENT,
        expires_at=timezone.now() + timedelta(minutes=30),
        message_to_host=message_to_host,
    )
```

```python
# apps/gardens/selectors.py
def public_garden_list(*, filters: dict) -> QuerySet[Garden]:
    """Approved+active gardens with cover photo and rating aggregates; no N+1."""
    return (
        Garden.objects.filter(verification_status=Garden.Verification.APPROVED, is_active=True)
        .select_related("host")
        .prefetch_related(Prefetch("photos", queryset=GardenPhoto.objects.order_by("position")))
        .annotate(rating_avg=Avg("reviews__rating"), rating_count=Count("reviews"))
    )
```

Zasady twarde:
- każda funkcja serwisowa przyjmuje **wyłącznie argumenty keyword-only** i ma type hints + docstring z sekcją `Raises`,
- mutacje wielokrokowe zawsze w `@transaction.atomic`; blokady `select_for_update` przy operacjach na dostępności i licznikach,
- selektory zwracają `QuerySet` (lenistwo zachowane), widoki nie wołają `.filter()` po modelach bezpośrednio,
- żadnych sygnałów Django do logiki biznesowej (side effects jawnie w serwisach) — wyjątek: brak,
- stałe biznesowe (`PLATFORM_FEE_PERCENT`, `RESERVATION_PAYMENT_TTL_MINUTES=30`, `FREE_CANCELLATION_HOURS=24`) w `settings` z env.

### 6.3. Wyjątki biznesowe i format błędów

`apps/core/exceptions.py` definiuje wyjątki mapowane przez customowy `EXCEPTION_HANDLER` na odpowiedzi z polem `code`:

| Wyjątek | HTTP | `code` |
|---|---|---|
| `SlotUnavailable` | 409 | `slot_unavailable` |
| `InvalidStateTransition` | 409 | `reservation_state_invalid` |
| `ReservationExpired` | 410 | `reservation_expired` |
| `DogVaccinationRequired` | 400 | `dog_vaccination_required` |
| `ReviewNotEligible` | 403 | `review_not_eligible` |
| `ReviewAlreadyExists` | 409 | `review_already_exists` |
| `PaymentAlreadyProcessed` | 409 | `payment_already_processed` |

Kształty odpowiedzi błędów (frontend obsługuje dokładnie te):
- 400 walidacja pól: `{"field_name": ["komunikat po polsku"], ...}` (standard DRF),
- błędy biznesowe i pozostałe: `{"detail": "komunikat po polsku", "code": "slot_unavailable"}`,
- 401: `{"detail": "...", "code": "token_not_valid"}` (standard simplejwt).

### 6.4. Standardy testów (backend)

- `pytest` + `pytest-django`, baza testowa PostgreSQL (ten sam kontener), `factory-boy` do danych.
- Struktura: `test_services.py` (logika domenowa, edge case'y), `test_api.py` (kontrakt: statusy HTTP, kształt JSON, uprawnienia per rola).
- Każdy endpoint ma test: happy path, brak autoryzacji (401), zła rola (403), walidacja (400) oraz specyficzne 409/410.
- Listy mają **test budżetu zapytań** (`django_assert_max_num_queries`) — limity w sekcji 12.
- Czas mrożony `freezegun` we wszystkich testach zależnych od zegara (wygasanie, polityka 24h).
- Cel pokrycia: `services.py` + `selectors.py` ≥ 85%, całość ≥ 75% (`--cov=apps --cov-fail-under=75`).
- Konfiguracja w `pyproject.toml` (`DJANGO_SETTINGS_MODULE=config.settings.test`, `--reuse-db`).

### 6.5. Standardy frontendu

- TypeScript `strict`; zakaz `any` (lint error); typy odpowiedzi API wyłącznie z `schema.d.ts`.
- Komponenty funkcyjne ≤ ~200 linii; logika w hookach `useX`, zapytania w `features/<domena>/api.ts` jako hooki React Query (`useGardens`, `useCreateReservation`); **komponenty nie wołają axios bezpośrednio**.
- Każdy widok obsługuje 4 stany: loading (skeleton/spinner), error (komunikat + retry), empty (ilustracja + CTA), success.
- Formularze: react-hook-form + zod (schematy walidacji per formularz, komunikaty PL).
- Pieniądze przez `lib/money.ts` (`formatPLN(89.5) → "89,50 zł"`), daty przez `lib/dates.ts` (date-fns, locale `pl`).
- Dostępność: każdy input ma `<label>`, modale trzymają focus, kontrast wg tokenów, nawigacja klawiaturą w kalendarzu i czacie.
- Testy Vitest: utilsy (money, dates, slots) w 100%; testy renderu dla komponentów krytycznych (BookingWidget, formularze auth, FiltersBar) z mockiem API (msw nie używamy — mock na poziomie hooków/axios adaptera).

---

## 7. Model danych

Pełna, ostateczna specyfikacja (ERD z projekt.pdf + korekty K-1…K-10). Wszystkie modele dziedziczą po `TimeStampedModel` (`created_at`, `updated_at`). PK to domyślny `BigAutoField`. Typy podane w notacji Django.

### 7.1. `accounts.User` (custom, `AUTH_USER_MODEL`)

Dziedziczy po `AbstractBaseUser` + `PermissionsMixin`; logowanie e-mailem (brak `username`). Manager z `create_user`/`create_superuser`.

| Pole | Typ | Uwagi |
|---|---|---|
| `email` | `EmailField(unique=True)` | login |
| `first_name` | `CharField(60)` | |
| `last_name` | `CharField(60)` | |
| `phone` | `CharField(20, blank=True)` | walidacja PL `+48…`/9 cyfr |
| `role` | `CharField(choices=Role)` | `client` / `host` / `admin` |
| `is_active` | `BooleanField(default=True)` | blokada konta przez admina ⇒ `False` |
| `is_staff` | `BooleanField(default=False)` | dostęp do Django Admin |
| `verified_at` | `DateTimeField(null=True)` | weryfikacja gospodarza (tylko `role=host`) |
| `terms_accepted_at` | `DateTimeField(null=True)` | zgoda na regulamin (RODO) |
| `marketing_consent` | `BooleanField(default=False)` | zgoda marketingowa |
| `created_at`/`updated_at` | z `TimeStampedModel` | |

`Role = TextChoices(CLIENT="client", HOST="host", ADMIN="admin")`.
Properties: `full_name`, `is_host`, `is_client`, `is_verified_host`.
Hasła: hasher **Argon2** pierwszy na liście `PASSWORD_HASHERS`.

### 7.2. `dogs.Dog`

| Pole | Typ | Uwagi |
|---|---|---|
| `owner` | `FK(User, on_delete=CASCADE, related_name="dogs")` | tylko klient |
| `name` | `CharField(60)` | |
| `breed` | `CharField(80, blank=True)` | |
| `birth_date` | `DateField(null=True)` | wiek liczony w locie (property `age_label`) |
| `weight_kg` | `DecimalField(4,1, null=True)` | mockup: „18 kg" |
| `sex` | `CharField(choices: male/female, blank=True)` | |
| `is_sterilized` | `BooleanField(default=False)` | mockup: „suka, sterylizowana" |
| `vaccinations_valid_until` | `DateField(null=True)` | mockup: „Ważne do 01.2027" |
| `deworming_valid_until` | `DateField(null=True)` | mockup: „Odrobaczanie — Ważne do…" |
| `notes` | `TextField(blank=True)` | „Książeczka zdrowia"/uwagi |
| `photo` | `ImageField(null=True)` | avatar psa (kompresja) |

Property `health_status` → `valid` / `expiring_soon` (≤30 dni) / `expired` / `unknown` na podstawie dat (kolorowe statusy z mockupu „Moi pupile"). Logika progów w `dogs/services.py`, nie w szablonie.

### 7.3. `gardens.Garden` i `gardens.GardenPhoto`

**Garden**

| Pole | Typ | Uwagi |
|---|---|---|
| `host` | `FK(User, on_delete=CASCADE, related_name="gardens")` | właściciel terenu |
| `title` | `CharField(120)` | „Ogród z basenem i wiatą…" |
| `description` | `TextField` | sekcja „O tym ogrodzie" |
| `city` | `CharField(80, db_index=True)` | filtr miasta; mockup „Kraków, Wola Justowska" |
| `address` | `CharField(200)` | ulica/okolica |
| `latitude` | `DecimalField(9,6)` | z kliknięcia na mapie |
| `longitude` | `DecimalField(9,6)` | |
| `area_m2` | `PositiveIntegerField` | „POWIERZCHNIA 800 m²" |
| `surface_type` | `CharField(choices: grass/sand/paved/mixed, blank=True)` | „NAWIERZCHNIA Trawa" |
| `is_fenced` | `BooleanField(default=True)` | |
| `fence_height_m` | `DecimalField(3,1, null=True)` | „OGRODZENIE 1,8 m" |
| `max_dogs` | `PositiveSmallIntegerField(default=1)` | „MAX PSÓW 3 psy" |
| `price_per_hour` | `DecimalField(7,2)` | PLN/h; „45 zł za godzinę" |
| `open_from` | `TimeField(default=08:00)` | godziny dostępności |
| `open_to` | `TimeField(default=20:00)` | |
| `min_booking_hours` | `PositiveSmallIntegerField(default=1)` | |
| `amenities` | `JSONField(default=list)` | lista kodów z `Amenity.choices` (sekcja 7.3.1) |
| `rules` | `JSONField(default=list)` | „Zasady gospodarza" (lista stringów) |
| `verification_status` | `CharField(choices: pending/approved/rejected, default=pending, db_index=True)` | K-5 |
| `rejection_reason` | `CharField(300, blank=True)` | uzasadnienie admina |
| `is_active` | `BooleanField(default=True)` | host może wyłączyć ofertę |

Properties: `rating_avg`, `rating_count` (anotowane w selektorze, nie liczone per-obiekt).
Constraint: `CheckConstraint(open_to > open_from)`, `CheckConstraint(price_per_hour > 0)`.
Indeks: `(city, verification_status, is_active)` pod listę publiczną.
Widoczność publiczna ⇔ `verification_status=approved AND is_active=True`.

**7.3.1. `Amenity` (TextChoices, współdzielone)** — kody i etykiety PL (mockup „Co oferuje ten ogród"): `pool` (Basen dla psów), `water` (Woda i miski), `shelter` (Wiata / schronienie), `lighting` (Oświetlenie wieczorne), `parking` (Parking), `agility` (Tor agility), `bench` (Ławki dla opiekuna), `bin` (Kosze na odchody), `fenced_secure` (Pełne ogrodzenie 1,8 m), `shade` (Naturalny cień / drzewa). Lista rozszerzalna (OCP).

**GardenPhoto**

| Pole | Typ | Uwagi |
|---|---|---|
| `garden` | `FK(Garden, on_delete=CASCADE, related_name="photos")` | |
| `image` | `ImageField` | oryginał po kompresji |
| `thumbnail` | `ImageField` | 640 px (generowana w serwisie) |
| `position` | `PositiveSmallIntegerField(default=0)` | kolejność galerii; pierwsza = okładka |

Limit: maks. 12 zdjęć/ogród (walidacja w serwisie). Pierwsza wg `position` to okładka karty.

### 7.4. `reservations.Reservation`

| Pole | Typ | Uwagi |
|---|---|---|
| `client` | `FK(User, PROTECT, related_name="reservations")` | |
| `garden` | `FK(Garden, PROTECT, related_name="reservations")` | |
| `dog` | `FK(Dog, PROTECT)` | NOT NULL |
| `dogs_count` | `PositiveSmallIntegerField(default=1)` | ≤ `garden.max_dogs` |
| `start_time` | `DateTimeField` | pełna godzina |
| `end_time` | `DateTimeField` | pełna godzina, > start |
| `status` | `CharField(choices=Status, db_index=True)` | maszyna stanów (7.4.1) |
| `price_per_hour_snapshot` | `DecimalField(7,2)` | cena z chwili rezerwacji |
| `subtotal` | `DecimalField(8,2)` | `snapshot * godziny` |
| `service_fee` | `DecimalField(8,2)` | prowizja platformy |
| `total_price` | `DecimalField(8,2)` | `subtotal + service_fee` |
| `message_to_host` | `TextField(blank=True)` | „Wiadomość dla gospodarza" z wizardu |
| `expires_at` | `DateTimeField(null=True)` | TTL nieopłaconej (AD-11) |
| `paid_at` | `DateTimeField(null=True)` | |
| `decided_at` | `DateTimeField(null=True)` | akcept/odrzucenie hosta |
| `cancelled_at` | `DateTimeField(null=True)` | |

**7.4.1. Maszyna stanów** (`Status = TextChoices`):

```
                    płatność OK (webhook)         host akceptuje
PENDING_PAYMENT ───────────────────────▶ AWAITING_HOST ─────────────▶ CONFIRMED
      │                                        │                          │
      │ expires_at minął / klient anuluje      │ host odrzuca (refund)    │ klient anuluje
      ▼                                        ▼                          ▼ (≥24h: refund)
   CANCELLED                                REJECTED                   CANCELLED
```

Dozwolone przejścia (egzekwowane w `services.transition`, każde inne → `InvalidStateTransition`):
- `PENDING_PAYMENT → AWAITING_HOST` (webhook `payment_intent.succeeded`)
- `PENDING_PAYMENT → CANCELLED` (TTL/anulowanie przed płatnością)
- `AWAITING_HOST → CONFIRMED` (host akceptuje)
- `AWAITING_HOST → REJECTED` (host odrzuca → refund + mail)
- `AWAITING_HOST → CANCELLED` (klient anuluje przed decyzją → refund)
- `CONFIRMED → CANCELLED` (klient anuluje; jeśli `< FREE_CANCELLATION_HOURS` przed startem — bez zwrotu, flaga w odpowiedzi)

**7.4.2. Reguła antykolizyjna (krytyczna):** dwie rezerwacje tego samego ogrodu w stanach `{AWAITING_HOST, CONFIRMED}` (oraz `PENDING_PAYMENT` z `expires_at > now`) nie mogą mieć nachodzących przedziałów `[start, end)`.
- Egzekwowane **dwuwarstwowo**: (1) `select_for_update` na ogrodzie + sprawdzenie w `services.create_reservation`; (2) **wykluczające ograniczenie bazodanowe** `ExclusionConstraint` (Postgres `btree_gist`) na `(garden, tsrange(start_time, end_time))` z warunkiem na aktywnych statusach. Migracja `0002` w `gardens`/`reservations` włącza `CREATE EXTENSION btree_gist`.

### 7.5. `payments.Payment`

| Pole | Typ | Uwagi |
|---|---|---|
| `reservation` | `OneToOne(Reservation, CASCADE, related_name="payment")` | |
| `stripe_payment_intent_id` | `CharField(120, unique=True, db_index=True)` | K-3 |
| `amount` | `DecimalField(8,2)` | = `reservation.total_price` (PLN) |
| `currency` | `CharField(3, default="pln")` | |
| `status` | `CharField(choices: pending/succeeded/failed/refunded)` | |
| `billing_name` | `CharField(120, blank=True)` | „Dane do rozliczenia" |
| `billing_email` | `EmailField(blank=True)` | |
| `billing_address` | `CharField(200, blank=True)` | |
| `billing_postal_code` | `CharField(12, blank=True)` | |
| `billing_city` | `CharField(80, blank=True)` | |
| `billing_country` | `CharField(2, default="PL")` | |
| `billing_company` | `CharField(160, blank=True)` | „chcę otrzymać fakturę na firmę" (NIP w tym polu lub osobno) |
| `tax_id` | `CharField(15, blank=True)` | NIP (opcjonalny) |
| `paid_at` | `DateTimeField(null=True)` | |
| `refunded_at` | `DateTimeField(null=True)` | |

### 7.6. `invoices.Invoice` i `invoices.InvoiceSequence`

**Invoice**

| Pole | Typ | Uwagi |
|---|---|---|
| `reservation` | `OneToOne(Reservation, PROTECT, related_name="invoice")` | |
| `number` | `CharField(20, unique=True)` | `PSI/RRRR/MM/NNNN` |
| `pdf` | `FileField(upload_to="invoices/%Y/%m/")` | wygenerowany WeasyPrint |
| `issued_at` | `DateTimeField` | data wystawienia |
| `total_gross` | `DecimalField(8,2)` | snapshot kwoty |

**InvoiceSequence** — `(year, month, last_number)`; inkrementacja w transakcji z `select_for_update` (odporność na wyścig numeracji). Faktura generowana po `payment.status=succeeded`.

### 7.7. `reviews.Review`

| Pole | Typ | Uwagi |
|---|---|---|
| `author` | `FK(User, CASCADE, related_name="reviews_written")` | klient |
| `garden` | `FK(Garden, CASCADE, related_name="reviews")` | |
| `reservation` | `OneToOne(Reservation, CASCADE, related_name="review")` | dowód uprawnienia |
| `rating` | `PositiveSmallIntegerField` | 1–5 (`CheckConstraint`) |
| `comment` | `TextField(blank=True)` | |

Constraint: `UniqueConstraint(author, garden)` (K-1). Uprawnienie do dodania: istnieje rezerwacja tego klienta w tym ogrodzie w stanie `CONFIRMED` z `end_time < now` i bez recenzji (inaczej `ReviewNotEligible`/`ReviewAlreadyExists`).

### 7.8. `chat.Conversation` i `chat.ChatMessage`

**Conversation** (K-4)

| Pole | Typ | Uwagi |
|---|---|---|
| `garden` | `FK(Garden, CASCADE, related_name="conversations")` | host wynika z `garden.host` |
| `client` | `FK(User, CASCADE, related_name="conversations")` | |
| `last_message_at` | `DateTimeField(null=True, db_index=True)` | sort listy konwersacji |

Constraint: `UniqueConstraint(garden, client)` (jedna konwersacja na parę). Uczestnicy: `client` i `garden.host`.

**ChatMessage**

| Pole | Typ | Uwagi |
|---|---|---|
| `conversation` | `FK(Conversation, CASCADE, related_name="messages")` | |
| `sender` | `FK(User, CASCADE)` | musi być uczestnikiem |
| `content` | `TextField` | |
| `read_at` | `DateTimeField(null=True)` | znacznik przeczytania (badge liczby nieprzeczytanych) |

### 7.9. `notifications` (bez modeli trwałych w MVP)

Tylko fasada wysyłki + szablony (sekcja 10.2). Brak tabeli — powiadomienia to e-maile (Mailpit). Opcjonalny licznik nieprzeczytanych w czacie liczony z `ChatMessage`.

### 7.10. Diagram relacji (tekstowo)

```
User(host) 1───* Garden 1───* GardenPhoto
User(client) 1───* Dog
User(client) 1───* Reservation *───1 Garden
Reservation 1───1 Payment
Reservation 1───1 Invoice
Reservation 1───1 Review   (Review *───1 Garden, *───1 User author)
Garden 1───* Conversation *───1 User(client);  Conversation 1───* ChatMessage *───1 User(sender)
```

---

## 8. Kontrakt API REST

### 8.1. Zasady ogólne

- Prefiks: **`/api/v1/`**. Format: JSON, pola **snake_case**, daty ISO-8601 z offsetem.
- Auth: nagłówek `Authorization: Bearer <access>`. Publiczne: lista/szczegóły ogrodów (approved), recenzje ogrodu, rejestracja, login, refresh, reset hasła, health.
- Paginacja list: `PageNumberPagination`, `?page=`, `page_size` domyślnie 12, max 50. Odpowiedź: `{count, next, previous, results}`.
- Filtrowanie/sort: `django-filter` + `OrderingFilter` (whitelist pól).
- Wersjonowanie schematu: `drf-spectacular`, schemat pod `/api/v1/schema/` + Swagger UI `/api/v1/docs/` (tylko DEBUG).
- Throttling: `AnonRateThrottle` (60/min) i `UserRateThrottle` (240/min); login/reset osobny scope `auth` (10/min).

### 8.2. Tabela endpointów

Legenda ról: 🌐 publiczny · 👤 zalogowany · 🐕 client · 🏠 host · 🛡 admin · (own) tylko właściciel zasobu.

**Auth & konto** (`accounts`, część B1)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| POST | `/api/v1/auth/register/` | 🌐 | rejestracja (pole `role`: client/host); zwraca user + parę tokenów; mail powitalny |
| POST | `/api/v1/auth/login/` | 🌐 | login e-mail+hasło → para tokenów |
| POST | `/api/v1/auth/refresh/` | 🌐 | rotacja refresh → nowy access (+ nowy refresh) |
| POST | `/api/v1/auth/logout/` | 👤 | blacklist refresh tokena |
| POST | `/api/v1/auth/password/reset/` | 🌐 | wysyła mail z linkiem resetu (token) |
| POST | `/api/v1/auth/password/reset/confirm/` | 🌐 | ustawia nowe hasło po tokenie |
| GET | `/api/v1/me/` | 👤 | profil zalogowanego (z rolą i flagami) |
| PATCH | `/api/v1/me/` | 👤 (own) | edycja danych profilu |
| PATCH | `/api/v1/me/password/` | 👤 (own) | zmiana hasła (stare+nowe) |
| DELETE | `/api/v1/me/` | 👤 (own) | usunięcie/dezaktywacja konta (RODO) |

**Psy** (`dogs`, B2)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/api/v1/dogs/` | 🐕 (own) | lista psów zalogowanego klienta |
| POST | `/api/v1/dogs/` | 🐕 | dodanie psa |
| GET | `/api/v1/dogs/{id}/` | 🐕 (own) | szczegóły |
| PATCH | `/api/v1/dogs/{id}/` | 🐕 (own) | edycja |
| DELETE | `/api/v1/dogs/{id}/` | 🐕 (own) | usunięcie (gdy brak aktywnych rezerwacji) |
| POST | `/api/v1/dogs/{id}/photo/` | 🐕 (own) | upload zdjęcia (multipart) |

**Ogrody — publiczne i hosta** (`gardens`, B3)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/api/v1/gardens/` | 🌐 | lista approved+active; filtry: `city`, `min_price`, `max_price`, `min_area`, `amenities` (CSV), `max_dogs`, `date`, `time_from`, `time_to`, `surface_type`; sort: `price_per_hour`, `-rating_avg`, `-created_at`; bbox mapy: `in_bbox=minLng,minLat,maxLng,maxLat` |
| GET | `/api/v1/gardens/{id}/` | 🌐 | szczegóły (zdjęcia, udogodnienia, zasady, host public, agregaty ocen) |
| GET | `/api/v1/gardens/{id}/availability/?date=YYYY-MM-DD` | 🌐 | mapa slotów godzinowych dnia: `[{hour, available}]` (na bazie godzin otwarcia + kolizji) |
| GET | `/api/v1/gardens/{id}/reviews/` | 🌐 | recenzje ogrodu (paginowane) |
| GET | `/api/v1/host/gardens/` | 🏠 (own) | ogrody zalogowanego hosta (wszystkie statusy) |
| POST | `/api/v1/host/gardens/` | 🏠 | utworzenie ogrodu (status `pending`) |
| PATCH | `/api/v1/host/gardens/{id}/` | 🏠 (own) | edycja (edycja po approved → wraca do `pending`? NIE w MVP; pola cennika/godzin edytowalne bez reweryfikacji, zmiana lokalizacji/zdjęć → `pending`) |
| DELETE | `/api/v1/host/gardens/{id}/` | 🏠 (own) | usunięcie/dezaktywacja (gdy brak przyszłych rezerwacji) |
| POST | `/api/v1/host/gardens/{id}/photos/` | 🏠 (own) | upload zdjęcia (multipart) |
| DELETE | `/api/v1/host/gardens/{id}/photos/{photoId}/` | 🏠 (own) | usuń zdjęcie |
| PATCH | `/api/v1/host/gardens/{id}/photos/reorder/` | 🏠 (own) | kolejność (`[photoId,…]`) |

**Rezerwacje** (`reservations`, B4)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| POST | `/api/v1/reservations/` | 🐕 | utworzenie (`garden`, `dog`, `start_time`, `end_time`, `dogs_count`, `message_to_host`) → `pending_payment` + kwoty; 409 `slot_unavailable` |
| GET | `/api/v1/reservations/` | 🐕 (own) | rezerwacje klienta; filtr `status_group=upcoming/completed/cancelled` (taby panelu) |
| GET | `/api/v1/reservations/{id}/` | 🐕/🏠 (uczestnik) | szczegóły |
| POST | `/api/v1/reservations/{id}/cancel/` | 🐕 (own) | anulowanie; odpowiedź zawiera `refunded: bool` (polityka 24h) |
| GET | `/api/v1/host/reservations/` | 🏠 (own) | rezerwacje na ogrody hosta; filtr `status_group=pending/accepted/completed/cancelled`, `garden` |
| POST | `/api/v1/host/reservations/{id}/accept/` | 🏠 (own) | `awaiting_host → confirmed` + mail |
| POST | `/api/v1/host/reservations/{id}/reject/` | 🏠 (own) | `awaiting_host → rejected` + refund + mail (`reason` opcjonalny) |
| GET | `/api/v1/host/schedule/?from=&to=&garden=` | 🏠 (own) | harmonogram (wydarzenia kalendarza) |
| GET | `/api/v1/host/stats/` | 🏠 (own) | kafelki panelu: liczby, suma zarobków, średnia ocena |
| GET | `/api/v1/reservations/export.csv` | 🐕 (own) | „Eksport CSV" z panelu klienta |

**Płatności** (`payments`, B5)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| POST | `/api/v1/reservations/{id}/payment-intent/` | 🐕 (own) | tworzy/zwraca `client_secret` PaymentIntent + zapis danych rozliczeniowych; 409 jeśli już opłacona/wygasła |
| POST | `/api/v1/payments/webhook/` | 🌐 (sygnatura Stripe) | webhook: `payment_intent.succeeded` → `awaiting_host`+`paid_at`+faktura; `payment_failed` |
| GET | `/api/v1/payments/config/` | 🌐 | publiczny `publishable_key` Stripe dla frontu |

**Faktury** (`invoices`, B6)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/api/v1/reservations/{id}/invoice/` | 🐕 (own) | metadane faktury (numer, data) |
| GET | `/api/v1/reservations/{id}/invoice/pdf/` | 🐕 (own) | pobranie PDF (`Content-Disposition: attachment`) |

**Recenzje** (`reviews`, B7)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| POST | `/api/v1/reservations/{id}/review/` | 🐕 (own) | dodanie recenzji (jeśli uprawniony) |
| GET | `/api/v1/reviews/{id}/` | 🌐 | szczegóły |
| PATCH/DELETE | `/api/v1/reviews/{id}/` | 🐕 (own) | edycja/usunięcie własnej |
| GET | `/api/v1/reviews/eligible/` | 🐕 (own) | rezerwacje czekające na recenzję (do CTA) |

**Czat** (`chat`, B8 — REST historii; live w sekcji 9)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/api/v1/conversations/` | 🐕/🏠 | lista konwersacji uczestnika (z ostatnią wiadomością i liczbą nieprzeczytanych) |
| POST | `/api/v1/conversations/` | 🐕 | rozpocznij/pobierz konwersację z ogrodem (`garden`) — „Napisz do gospodarza" |
| GET | `/api/v1/conversations/{id}/messages/?before=` | 🐕/🏠 (uczestnik) | historia (paginacja kursorowa po czasie) |
| POST | `/api/v1/conversations/{id}/read/` | 🐕/🏠 (uczestnik) | oznacz jako przeczytane |

**Admin** (`adminpanel`, B9)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/api/v1/admin/gardens/?status=pending` | 🛡 | kolejka weryfikacji |
| POST | `/api/v1/admin/gardens/{id}/approve/` | 🛡 | zatwierdź ogród + mail do hosta |
| POST | `/api/v1/admin/gardens/{id}/reject/` | 🛡 | odrzuć (`reason`) + mail |
| GET | `/api/v1/admin/users/` | 🛡 | lista/filtrowanie użytkowników |
| POST | `/api/v1/admin/users/{id}/verify/` | 🛡 | oznacz hosta jako zweryfikowanego |
| POST | `/api/v1/admin/users/{id}/block/` | 🛡 | `is_active=False` |
| POST | `/api/v1/admin/users/{id}/unblock/` | 🛡 | `is_active=True` |
| GET | `/api/v1/admin/reviews/` | 🛡 | moderacja (lista) |
| DELETE | `/api/v1/admin/reviews/{id}/` | 🛡 | usunięcie naruszającej recenzji |

**System** (`core`, B0)

| Metoda | Ścieżka | Rola | Opis |
|---|---|---|---|
| GET | `/api/v1/health/` | 🌐 | status app + DB + Redis (dla healthcheck Dockera) |

### 8.3. Przykładowe kontrakty (wiążące kształty)

`POST /api/v1/reservations/` — request:
```json
{ "garden": 12, "dog": 3, "start_time": "2026-05-24T15:00:00+02:00",
  "end_time": "2026-05-24T17:00:00+02:00", "dogs_count": 1, "message_to_host": "Łata, 18 kg" }
```
response 201:
```json
{ "id": 88, "status": "pending_payment", "garden": { "id": 12, "title": "...", "city": "Kraków" },
  "start_time": "...", "end_time": "...", "price_per_hour_snapshot": "45.00",
  "subtotal": "90.00", "service_fee": "9.00", "total_price": "99.00",
  "expires_at": "2026-05-20T12:30:00+02:00" }
```

`GET /api/v1/gardens/{id}/availability/?date=2026-05-24` — response:
```json
{ "date": "2026-05-24", "open_from": "08:00", "open_to": "20:00",
  "slots": [ {"hour": "08:00", "available": true}, {"hour": "15:00", "available": false} ] }
```

### 8.4. OpenAPI

`drf-spectacular` z opisanymi serializerami; po każdej części dotykającej API agent regeneruje `backend/schema.yaml`. Frontend generuje z niego `schema.d.ts` (`openapi-typescript`). To gwarancja braku dryfu kontraktu (jedno źródło typów).

---

## 9. Protokół WebSocket (Django Channels)

### 9.1. Endpoint i autoryzacja
- URL: `ws://<host>/ws/chat/{conversationId}/?token=<access_jwt>`.
- Autoryzacja: własne `JWTAuthMiddleware` (ASGI) waliduje access token z query stringa, ustawia `scope["user"]`; odrzuca, gdy user nie jest uczestnikiem konwersacji (`client` lub `garden.host`).
- Channel layer: Redis (`channels_redis`). Grupa: `chat_{conversationId}`.

### 9.2. Ramki (JSON)
Client → server:
```json
{ "type": "message.send", "content": "Cześć!" }
{ "type": "typing", "state": true }
{ "type": "read" }
```
Server → client (broadcast w grupie):
```json
{ "type": "message.new", "message": { "id": 1, "sender": 7, "content": "...", "created_at": "..." } }
{ "type": "typing", "user": 7, "state": true }
{ "type": "read", "user": 7, "at": "..." }
```

### 9.3. Reguły
- Zapis wiadomości do DB w consumerze (przez `chat/services.py`, `database_sync_to_async`), potem broadcast — kolejność: persist → emit.
- Aktualizacja `Conversation.last_message_at` i powiadomienie listy konwersacji drugiej strony (grupa `user_{id}` do badge'a) .
- Walidacja: `content` 1–2000 znaków; throttling po stronie consumera (np. ≤5 wiadomości/2 s).
- Reconnect po stronie frontu: hook `useChatSocket` z auto-reconnect i odświeżeniem historii (REST) po reconnect.
- Wiadomości historyczne ładuje REST (sekcja 8.2 chat), WS tylko dla strumienia na żywo.

---

## 10. Integracje

### 10.1. Stripe (część B5)
- Tryb **testowy**. Klucze z env (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`).
- Fasada `payments/gateway.py`: `create_payment_intent(amount_pln, metadata) -> (intent_id, client_secret)`, `refund(intent_id)`, `construct_event(payload, sig_header)`. Kwoty do Stripe w groszach (`int(Decimal*100)`), waluta `pln`.
- Frontend: `@stripe/react-stripe-js` `<Elements>` + `<PaymentElement>` z `clientSecret`; `stripe.confirmPayment` z `redirect: "if_required"` (karty testowe nie wymagają redirectu) → po sukcesie poll statusu rezerwacji.
- **Źródło prawdy o opłaceniu = webhook**, nie odpowiedź z frontu. `stripe-cli` w compose forwarduje `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded` na `/api/v1/payments/webhook/`. Idempotencja po `event.id` (zbiór przetworzonych w pamięci/krótka tabela — w MVP: sprawdzenie `payment.status` zapewnia idempotencję funkcjonalną).

### 10.2. E-mail / powiadomienia (część B10, używana przez inne)
Fasada `notifications/services.py`: `send(template_key, *, to, context)`. Rejestr `TEMPLATES: dict[str, Template]` (HTML + tekst, szablony Django w `notifications/templates/emails/`). Klucze MVP:
- `welcome` (po rejestracji), `password_reset`,
- `reservation_created` (do hosta — nowa oczekująca), `reservation_paid` (do klienta — potwierdzenie płatności + faktura w załączniku/linku),
- `reservation_accepted`, `reservation_rejected`, `reservation_cancelled` (do drugiej strony),
- `garden_approved`, `garden_rejected` (do hosta),
- `host_verified` (do hosta).
Wysyłka synchroniczna SMTP→Mailpit; `EMAIL_BACKEND=django SMTP`. Każde wywołanie zawiera DIP-owy punkt rozszerzenia (later: kolejka). Stopka z danymi platformy; nadawca `noreply@psipark.local`.

### 10.3. Faktury PDF (część B6)
WeasyPrint renderuje szablon HTML (`invoices/templates/invoices/invoice.html`) → PDF zapisany w `MEDIA_ROOT/invoices/`. Dane: numer `PSI/RRRR/MM/NNNN`, sprzedawca = PsiPark (dane z settings), nabywca = dane rozliczeniowe z `Payment`, pozycje: wynajem (subtotal) + prowizja serwisowa (service_fee), suma brutto. Generacja w `invoices/services.generate_invoice(reservation)` wołana z webhooka po `succeeded`.

### 10.4. Mapa (frontend F2/F3)
Leaflet + kafelki OSM (`https://tile.openstreetmap.org/{z}/{x}/{y}.png`, atrybucja wymagana). Lista ogrodów ze współrzędnymi → markery; klik markera → mini-karta + link do szczegółów. W formularzu ogrodu (host) klik na mapie ustawia `latitude/longitude` (komponent `LocationPicker`). Fix domyślnych ikon markerów Leaflet w Vite (znany problem ścieżek — `delete (L.Icon.Default.prototype)._getIconUrl` + import URL-i przez `?url`). Brak geokodowania.

---

## 11. Bezpieczeństwo i RODO

- **Hasła:** Argon2; walidatory siły haseł Django (min. 8 znaków, niepospolite).
- **JWT:** access 30 min / refresh 30 dni; rotacja + blacklist (`logout` i przy rotacji). Access nie w `localStorage` (XSS) — w pamięci JS + cichy refresh na starcie; refresh w `localStorage` (kompromis dla SPA bez backendu sesji; udokumentować w README).
- **CORS:** `django-cors-headers`, whitelista `http://localhost:5173`. **CSRF** nie dotyczy API JWT (brak ciasteczek sesyjnych dla API); webhook Stripe wyłączony z CSRF i autoryzowany sygnaturą.
- **Uprawnienia obiektowe:** każda operacja na zasobie sprawdza własność (`IsOwner`, `IsParticipant`, `IsHostOfGarden`) — nie polegać tylko na filtrze querysetu.
- **Walidacja wejścia:** serializery + walidacje domenowe; limity rozmiaru uploadu (≤5 MB/zdjęcie, whitelist MIME, weryfikacja przez Pillow `verify()`).
- **Rate limiting:** scope `auth` 10/min na login/reset/register (anty-bruteforce).
- **HTTPS:** wymóg analizy — w dev Mailpit/HTTP; w settings produkcyjnych `SECURE_*`/HSTS gotowe pod reverse-proxy (udokumentowane, niewłączone w dev).
- **RODO:** zgody (`terms_accepted_at`, `marketing_consent`) zbierane przy rejestracji; `DELETE /me/` anonimizuje dane osobowe i dezaktywuje konto (zachowując nieusuwalne dokumenty księgowe — faktury — zgodnie z prawem); strony „Regulamin", „Polityka prywatności", „Świadczenie usług drogą elektroniczną" (statyczne, F8). Disclaimer „platforma nie odpowiada za szkody wyrządzone pupilowi" w regulaminie i stopce.
- **Sekrety:** wyłącznie env; `.env` w `.gitignore`; `SECRET_KEY`, klucze Stripe spoza repo.
- **Nagłówki:** `SECURE_CONTENT_TYPE_NOSNIFF`, `X_FRAME_OPTIONS=DENY`, `Referrer-Policy`.

---

## 12. Wydajność

Wymagania z analizy: 1000 użytkowników naraz bez spadku, ładowanie ≤3 s, dostępność 99,5%, kompresja zdjęć.

- **Budżety zapytań SQL** (testowane `django_assert_max_num_queries`): lista ogrodów ≤ 6; szczegóły ogrodu ≤ 8; lista rezerwacji ≤ 6; lista konwersacji ≤ 5. Realizacja: `select_related`/`prefetch_related`/`annotate` w selektorach (sekcja 6.2).
- **Indeksy:** `Garden(city, verification_status, is_active)`, `Reservation(garden, start_time)`, `Reservation(status)`, `Conversation(client, last_message_at)`, `Payment(stripe_payment_intent_id)`, `ChatMessage(conversation, created_at)`.
- **Paginacja** wszędzie (brak nielimitowanych list). Czat — kursor po `created_at`.
- **Obrazy:** kompresja przy uploadzie (Pillow), miniatury 640 px do list/kart, `loading="lazy"`, `width/height` ustawione (CLS).
- **Frontend:** code-splitting per route (`React.lazy` + Suspense), React Query z `staleTime` dla list ogrodów, prefetch szczegółów na hover karty, mapa i Stripe ładowane dynamicznie (ciężkie). Cel bundla initial < 200 KB gz.
- **Cache:** nagłówki cache dla media/statycznych; agregaty ocen anotowane w zapytaniu (bez liczenia per-obiekt).
- **DB pool:** `CONN_MAX_AGE` ustawione; gunicorn/daphne workers konfigurowalne env (skalowanie poziome).

---

## 13. Środowisko uruchomieniowe

### 13.1. `docker-compose.yml` — usługi
`db` (postgres:17), `redis` (redis:7), `mailpit`, `backend` (depends_on: db healthy, redis), `frontend`, `stripe-cli` (forward webhooków). Wolumeny: `pgdata`, `media` (współdzielony przez backend), kod bind-mountowany w dev (hot reload). Healthchecki dla `db`, `redis`, `backend` (`/api/v1/health/`). Sieć domyślna. Porty: backend 8000, frontend 5173, Mailpit UI 8025, Postgres 5432.

### 13.2. `backend/Dockerfile`
Bazowy `python:3.13-slim`; instalacja zależności systemowych WeasyPrint:
```dockerfile
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz0b libpangocairo-1.0-0 \
    libgdk-pixbuf-2.0-0 libffi-dev shared-mime-info fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
```
Następnie `pip install -r requirements-dev.txt`, kopiowanie kodu, `entrypoint.sh`: `wait-for db` → `migrate` → (dev) `runserver 0.0.0.0:8000` przez Daphne/ASGI. Użytkownik nie-root.

### 13.3. `frontend` (dev)
`node:22-alpine`, `npm ci`, `npm run dev -- --host 0.0.0.0`. Vite proxy `/api` i `/ws` → `backend:8000` (konfiguracja w `vite.config.ts`), więc front woła ścieżki względne.

### 13.4. `.env.example` (klucze)
`POSTGRES_*`, `DATABASE_URL`, `REDIS_URL`, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `EMAIL_HOST=mailpit`, `EMAIL_PORT=1025`, `DEFAULT_FROM_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`, `PLATFORM_FEE_PERCENT=10`, `RESERVATION_PAYMENT_TTL_MINUTES=30`, `FREE_CANCELLATION_HOURS=24`, `FRONTEND_BASE_URL=http://localhost:5173`.

### 13.5. README — quickstart
`cp .env.example .env` → `docker compose up --build` → `docker compose exec backend python manage.py seed_demo` → front `http://localhost:5173`, API docs `http://localhost:8000/api/v1/docs/`, maile `http://localhost:8025`.

---

## 14. Dane demonstracyjne (seed)

Komenda `apps/core/management/commands/seed_demo.py` (część B0, rozszerzana przez kolejne części — każda część dorzuca swoją fabrykę). Zawartość docelowa:
- 1 admin (`admin@psipark.local` / hasło z env lub `admin12345`),
- 3 gospodarzy (w tym „Magda Krawczyk" z mockupu), część zweryfikowanych,
- 6–8 ogrodów w Krakowie i okolicy z realnymi współrzędnymi i zdjęciami placeholderowymi, różne statusy weryfikacji (w tym 1 `pending` do pokazania kolejki admina),
- 4 klientów (w tym „Katarzyna Nowak", „Magda" z mockupów) z psami (Łata, Borys),
- rezerwacje w różnych stanach (nadchodzące confirmed, oczekujące, zakończone do recenzji, anulowane),
- recenzje dla zakończonych, kilka konwersacji z wiadomościami,
- 1 opłacona rezerwacja z fakturą.
Idempotentna (czyści i tworzy od nowa, flaga `--fresh`). Dane spójne z liczbami z mockupów tam, gdzie to sensowne (pokaz portfolio).

---

## 15. Podział pracy — BACKEND

Każda część = jedno zlecenie dla jednego agenta. Format: **Cel · Zależności · Zakres (pliki/zadania) · Endpointy/Modele · Definition of Done**. Agent czyta sekcje 1–6 + wskazane + własną.

### B0 — Szkielet projektu, `core`, Docker, CI jakości
**Cel:** uruchamialny szkielet, na którym budują wszyscy. **Zależności:** brak (pierwsza).
**Zakres:**
- Inicjalizacja projektu Django (`config/`), podział settings `base/dev/test` (django-environ), `AUTH_USER_MODEL="accounts.User"` ustawione od razu (placeholder app accounts pusty model na razie? — **nie**: B0 tworzy minimalny `accounts.User` z sekcji 7.1, by uniknąć bolesnej migracji usera później; pełne API auth robi B1).
- `apps/core/`: `TimeStampedModel`, `exceptions.py` (klasy z 6.3) + `custom_exception_handler`, `pagination.py` (default page_size 12/max 50), `permissions.py` (`IsClient`, `IsHost`, `IsAdmin`, `IsOwner`, bazowe), `images.py` (kompresja Pillow: `process_upload(file) -> (image, thumbnail)`), `views.health`.
- DRF + simplejwt + spectacular + cors + filters skonfigurowane w settings; routing `/api/v1/` z dołączaniem urli aplikacji (placeholdery), `/admin/`, serwowanie media w DEBUG, ASGI z `ProtocolTypeRouter` (http; websocket placeholder do B8).
- `Dockerfile`, `docker-compose.yml` (db, redis, mailpit, backend, frontend placeholder, stripe-cli), `.env.example`, `entrypoint.sh`, healthchecki.
- `pyproject.toml` (ruff + pytest + coverage), `requirements*.txt`, `seed_demo` (szkielet: tworzy admina), snapshot `schema.yaml`.
- `apps/core/tests`: test `/health/`, test handlera wyjątków.
**DoD:** `docker compose up` wstaje, `/api/v1/health/` = 200 z `{db, redis, status}`, `pytest` zielony, ruff czysty, `schema.yaml` wygenerowany, Swagger `/api/v1/docs/` działa w DEBUG.

### B1 — Konta, uwierzytelnianie, profil (`accounts`)
**Cel:** rejestracja/logowanie/JWT/profil/reset hasła. **Zależności:** B0. **Sekcje:** 7.1, 8.2 (Auth), 11.
**Zakres:**
- Rozbudowa `accounts.User` (jeśli B0 zostawił minimalny) + manager; Argon2 hashers; walidatory haseł.
- `services.py`: `register_user` (z rolą, zgodami, mail `welcome`), `change_password`, `request_password_reset` (token + mail), `confirm_password_reset`, `deactivate_account` (RODO anonimizacja).
- `serializers.py`: Register (walidacja roli client/host, zgoda regulaminu wymagana, hasło+powtórzenie), Login (przez simplejwt `TokenObtainPairSerializer` rozszerzony o dane usera), Me (read), MeUpdate, PasswordChange, PasswordReset(+confirm).
- `views.py` + `urls.py`: endpointy z tabeli (Auth & konto). Logout = blacklist refresh.
- simplejwt: rotacja, blacklist (dodać app do INSTALLED_APPS + migracja), lifetimes z settings, custom claims (`role`).
- Throttling scope `auth` na register/login/reset.
- `tests`: rejestracja obu ról, login/refresh/rotacja/blacklist, reset flow (freezegun), uprawnienia me, walidacje (zła rola, brak zgody, słabe hasło), throttling.
**DoD:** pełny cykl auth działa end-to-end; maile widoczne w Mailpit; testy zielone; `schema.yaml` zaktualizowany.

### B2 — Psy (`dogs`)
**Cel:** CRUD profili psów + zdrowie. **Zależności:** B1. **Sekcje:** 7.2, 8.2 (Psy).
**Zakres:** model `Dog` (z `health_status` w services, nie w modelu), serializery (list/detail/write), selektory (`owned_dogs`), services (create/update/delete z blokadą gdy aktywne rezerwacje — w MVP sprawdzenie po stronie delete; rezerwacje pojawią się w B4, więc selektor sprawdzający import lazy/guard), upload zdjęcia (core.images), permissions `IsOwner`. Fabryka do seeda (Łata, Borys). Testy: CRUD, izolacja właściciela (klient A nie widzi psów B → 404), health_status (freezegun: valid/expiring/expired), upload (walidacja MIME/rozmiar).
**DoD:** klient zarządza psami; statusy zdrowia poprawne; testy zielone.

### B3 — Ogrody, zdjęcia, dostępność, wyszukiwanie (`gardens`)
**Cel:** serce katalogu: publiczna lista z filtrami/mapą, szczegóły, dostępność, zarządzanie przez hosta. **Zależności:** B1. **Sekcje:** 7.3, 8.2 (Ogrody), 8.3, 12.
**Zakres:**
- Modele `Garden`, `GardenPhoto`, `Amenity`/`SurfaceType` choices; constraints i indeksy z 7.3 i 12.
- `selectors.py`: `public_garden_list(filters)` (annotate rating, prefetch cover; wsparcie `in_bbox`), `garden_detail`, `host_gardens`, `availability(garden, date)` (sloty z godzin otwarcia minus kolizje — kolizje z rezerwacji; do czasu B4 funkcja kolizji w `gardens/selectors` przyjmuje pusty zbiór lub importuje z reservations lazy — **kontrakt:** `availability` deleguje do `reservations.selectors.busy_intervals` jeśli dostępne, inaczej zwraca wszystko wolne; B4 dostarcza realną implementację). Aby uniknąć cyklu: funkcję kolizji trzyma `reservations` i to ona jest właścicielem reguły; `gardens.availability` ją woła.
- `services.py`: create/update/delete garden (reguła reweryfikacji z tabeli endpointów), foto: add (kompresja+thumbnail+limit 12), delete, reorder.
- `FilterSet` (django-filter) z polami z tabeli; `OrderingFilter` whitelist; paginacja.
- Serializery: `GardenListSerializer` (lekki: okładka, miasto, cena, rating, współrzędne), `GardenDetailSerializer` (pełny + host public + amenities z etykietami PL + zasady), `GardenWriteSerializer`, `GardenPhotoSerializer`, `AvailabilitySerializer`.
- Permissions `IsHostOfGarden`. Rozszerzenie seeda o ogrody z mockupów (Kraków, współrzędne).
- Testy: filtry (city/price/area/amenities/date), sort, bbox, widoczność (pending niewidoczny publicznie, widoczny dla właściciela i admina), budżet zapytań listy ≤6 i detalu ≤8, CRUD hosta + izolacja, reguła reweryfikacji, limit zdjęć, availability (godziny otwarcia, kolizje).
**DoD:** publiczny katalog z filtrami i mapą zasilany; host zarządza ogrodami; budżety zapytań spełnione; testy zielone.

### B4 — Rezerwacje, maszyna stanów, harmonogram, statystyki (`reservations`)
**Cel:** logika rezerwacji z antykolizją i przejściami stanów. **Zależności:** B2, B3. **Sekcje:** 7.4, 8.2 (Rezerwacje), 8.3, 3 (AD-5, AD-11).
**Zakres:**
- Model `Reservation` (7.4) + `Status` + `ExclusionConstraint` (btree_gist; migracja z `CREATE EXTENSION`) + indeksy.
- `selectors.py`: `busy_intervals(garden, date_range)` (właściciel reguły kolizji — używany też przez gardens.availability), `client_reservations(status_group)`, `host_reservations(filters)`, `host_schedule(range)`, `host_stats()`, `has_collision(...)`.
- `services.py`: `create_reservation` (wzorzec z 6.2: select_for_update, walidacja okna/godzin otwarcia/min_booking_hours/max_dogs/zdrowie psa, kalkulacja kwot, TTL), `transition(reservation, target, actor)` (egzekwuje 7.4.1), `accept`, `reject` (+ wywołanie refundu przez payments.gateway — fasada; jeśli B5 niegotowe, `reject`/`cancel` wołają `payments.services.refund_if_paid` która jest no-op gdy brak płatności), `cancel` (polityka 24h → `refunded` flag), `expire_pending` (komenda `cleanup_expired_reservations`).
- Hooki powiadomień: po create → mail `reservation_created` do hosta; przejścia → odpowiednie maile (przez notifications, B10; do czasu B10 fasada `notifications.services.send` istnieje z B0/B10 — patrz kolejność: B10 przed B4 lub stub). **Kontrakt:** `notifications.services.send` musi istnieć zanim B4 woła; jeśli realizujemy B4 przed B10, używamy istniejącego stubu z B0 (logger). Zalecane: B10 przed B4 (patrz DAG).
- CSV eksport rezerwacji klienta.
- Serializery: ReservationCreate, ReservationDetail (z zagnieżdżonym ogrodem/psem/kwotami/flagami akcji), HostReservationList, ScheduleEvent, Stats.
- Testy: tworzenie (happy), kolizja (równoległe okna → 409, test też na constraint DB), walidacje (poza godzinami, <min_hours, >max_dogs, pies bez szczepień → odpowiednie code), wszystkie przejścia stanów + zakazane (409), polityka 24h (freezegun: refund vs brak), wygasanie (freezegun + komenda), izolacja klient/host, stats/schedule, budżety zapytań.
**DoD:** pełen przepływ rezerwacji bez płatności (do AWAITING_HOST symulowane), antykolizja dwuwarstwowa udowodniona testem; testy zielone.

### B5 — Płatności Stripe (`payments`)
**Cel:** PaymentIntent + webhook + refundy. **Zależności:** B4. **Sekcje:** 7.5, 8.2 (Płatności), 10.1, 3 (AD-4/16).
**Zakres:**
- Model `Payment` (7.5). Fasada `gateway.py` (`StripeGateway`: create_payment_intent, refund, construct_event) — jedyny moduł importujący `stripe`.
- `services.py`: `start_payment(reservation, billing_data)` (idempotentnie tworzy/zwraca PaymentIntent, zapisuje billing, blok gdy nie `pending_payment`/wygasła), `handle_webhook(event)` (succeeded → `Reservation.transition(AWAITING_HOST)`, `paid_at`, trigger faktury B6 + mail `reservation_paid`; failed → log; refunded → `Payment.refunded`), `refund_if_paid(reservation)` (wołane przez B4 reject/cancel).
- Endpoints: payment-intent, webhook (CSRF-exempt, weryfikacja sygnatury), config (publishable key). Idempotencja po stanie płatności.
- Testy: start (happy/idempotent/zły stan), webhook succeeded → przejście+faktura+mail (mock gateway/construct_event), webhook zła sygnatura → 400, refund przy reject/cancel (mock), kwoty w groszach poprawne (Decimal). Stripe SDK zamockowany (bez sieci).
**DoD:** ścieżka płatności działa z `stripe-cli` (manual smoke) i testami z mockiem; źródłem prawdy webhook; testy zielone.

### B6 — Faktury PDF (`invoices`)
**Cel:** generacja i pobieranie faktur. **Zależności:** B5. **Sekcje:** 7.6, 8.2 (Faktury), 10.3.
**Zakres:** modele `Invoice`, `InvoiceSequence` (numeracja z select_for_update), szablon HTML faktury (PL, dane sprzedawcy z settings, nabywca z Payment, pozycje subtotal+fee), `services.generate_invoice(reservation)` (WeasyPrint → FileField), endpoints metadanych i PDF (attachment, tylko właściciel). Wywołanie z webhooka B5. Testy: numeracja sekwencyjna (równoległość → unikalność, select_for_update), generacja PDF (istnieje plik, poprawny typ), dostęp (właściciel 200, obcy 403/404), brak faktury przed płatnością.
**DoD:** opłacona rezerwacja ma pobieralną fakturę PDF z unikalnym numerem; testy zielone.

### B7 — Recenzje (`reviews`)
**Cel:** wystawianie i czytanie recenzji. **Zależności:** B4. **Sekcje:** 7.7, 8.2 (Recenzje).
**Zakres:** model `Review` (+ UniqueConstraint, CheckConstraint 1–5), services (`create_review` z weryfikacją uprawnienia: zakończona confirmed rezerwacja bez recenzji; update/delete własnej), selektory (`garden_reviews`, `eligible_reservations`), serializery, endpoints. Aktualizacja agregatów ocen ogrodu = annotate w gardens (bez denormalizacji). Testy: uprawnienie (eligible/non-eligible/already-exists → odpowiednie code), CRUD własnej, izolacja, wpływ na rating ogrodu, publiczny odczyt.
**DoD:** klient po zakończonym pobycie wystawia recenzję; oceny widoczne w katalogu; testy zielone.

### B8 — Czat (`chat`): REST + WebSocket
**Cel:** konwersacje i wiadomości na żywo. **Zależności:** B3 (ogrody/host), B1. **Sekcje:** 7.8, 8.2 (Czat), 9.
**Zakres:**
- Modele `Conversation`, `ChatMessage` (+ constraints/indeksy). Services: `get_or_create_conversation(client, garden)`, `post_message`, `mark_read`. Selektory: lista konwersacji uczestnika (z unread count, last message), historia (kursor).
- REST endpoints (8.2 czat). WebSocket: `ChatConsumer` (AsyncJsonWebsocketConsumer), `JWTAuthMiddleware` (ASGI), routing `ws/chat/{id}/`, grupy Redis, ramki z sekcji 9, throttling, persist→broadcast, update `last_message_at`, powiadomienie listy drugiej strony (grupa `user_{id}`). Aktualizacja `config/asgi.py` o websocket router.
- Testy: REST (get_or_create idempotent, izolacja uczestników, unread count, historia), WebSocket (`ChannelsLiveServerTestCase`/`WebsocketCommunicator`: auth ok/odrzucenie obcego, wysłanie→broadcast→persist, typing, read), walidacja długości.
**DoD:** dwóch uczestników wymienia wiadomości na żywo; nieuczestnik odrzucony; historia przez REST; testy zielone.

### B9 — Panel administratora (`adminpanel`) + Django Admin
**Cel:** weryfikacja ogrodów, zarządzanie userami, moderacja. **Zależności:** B3, B1. **Sekcje:** 8.2 (Admin), 2.2.
**Zakres:** endpointy `/api/v1/admin/...` (IsAdmin): kolejka pending, approve/reject garden (+maile), lista/filtry userów, verify host (+mail `host_verified`), block/unblock, moderacja recenzji. Rejestracja wszystkich modeli w Django Admin z sensownymi `list_display`/`search_fields`/`list_filter` i akcjami (approve/verify/block). Services dla operacji (nie logika w view). Testy: dostęp tylko admin (403 dla innych), approve→ogród publiczny+mail, reject→reason+mail, verify host→badge, block→login niemożliwy/`is_active`.
**DoD:** admin prowadzi kolejkę weryfikacji i zarządza userami z poziomu API i Django Admin; testy zielone.

### B10 — Powiadomienia e-mail (`notifications`)
**Cel:** fasada wysyłki + wszystkie szablony. **Zależności:** B0 (używana przez B1,B4,B5,B9). **Sekcje:** 10.2.
**Zakres:** `services.send(template_key, *, to, context)` + rejestr `TEMPLATES` (OCP), szablony HTML+txt (PL) dla wszystkich kluczy z 10.2, konfiguracja SMTP→Mailpit, stopka/branding, link do frontu z `FRONTEND_BASE_URL`. Helper do załączania PDF faktury w `reservation_paid`. Testy: każdy szablon renderuje się z kontekstem, `send` trafia do `mail.outbox` (locmem w testach) z poprawnym tematem/odbiorcą; rejestr odrzuca nieznany klucz.
**Uwaga kolejności:** zrealizować **przed lub równolegle do B4/B5/B9**, bo te wołają `send`. Jeśli wcześniej potrzebny stub — B0 dostarcza no-op logger pod tym samym interfejsem, B10 go zastępuje. **Zalecenie:** B10 zaraz po B1.
**DoD:** wszystkie zdarzenia systemowe generują maile widoczne w Mailpit; testy zielone.

---

## 16. Podział pracy — FRONTEND

Frontend to **osobna aplikacja** (SPA React/Vite/TS), komunikuje się z backendem wyłącznie po HTTP (`/api/v1`) i WS (`/ws`). **Wizualnym źródłem prawdy jest handoff Claude Design w `docs/design/`** (gotowe prototypy 9 ekranów — mapowanie ekran→część w sek. 16.1.1); `projekt.pdf` pozostaje źródłem modelu danych/UML. Estetyka: zieleń marki `#2E7D32`, ciepła biel tła `#FAFFFA`, ciemny tekst `#1B1B1B`, font **Inter** (+ JetBrains Mono na metadane/ceny), **pill-buttony**, miękkie zaokrąglenia i 3-poziomowe cienie, dużo bieli — inspirowane Airbnb (dużo zdjęć, czysty layout).

### 16.0. Zasady wspólne dla wszystkich części FE
- **Zgodność z designem (priorytet):** każdy ekran odtwarza odpowiedni prototyp z `docs/design/project/` **piksel-w-piksel** — kolory, odstępy, typografia i komponenty wyłącznie wg tokenów §16.1; rozjazd z handoffem Claude Design traktujemy jak błąd. Cel produktu: UI w **100% zgodne** z Claude Design.
- Routing danych: każda strona pobiera dane przez hooki React Query z `features/<x>/api.ts`; komponenty nie wołają axiosa.
- Typy odpowiedzi wyłącznie z `shared/api/schema.d.ts` (generowane z `backend/schema.yaml`).
- 4 stany widoku (loading/error/empty/success) obowiązkowe.
- Teksty PL; pieniądze przez `formatPLN`, daty przez `lib/dates` (locale pl).
- Komponenty z `shared/ui` (design system), nie własne ad-hoc przyciski/inputy.
- Dostępność i responsywność (mockupy są desktopowe; układ ma się nie psuć ≥1280 px, sidebar zwija się < 1024 px do drawera — graceful, pełen mobile poza MVP).

### 16.1. Design system (część F0 tworzy, reszta używa)

**Tokeny w `src/index.css`** (Tailwind v4, `@theme` — bez `tailwind.config.js`). Wartości są **1:1 z Claude Design** (`docs/design/project/Design System.html` + `assets/auth.css`) — to wiążące źródło palety; nie zmieniaj odcieni bez aktualizacji handoffu:
```css
@import "tailwindcss";
@theme {
  /* Zieleń marki — 700 = primary (#2E7D32, natura/ogrody) */
  --color-green-50:#F0F8EE; --color-green-100:#DCEFD8; --color-green-300:#A5D6A7;
  --color-green-500:#66BB6A; --color-green-600:#43A047; --color-green-700:#2E7D32;
  --color-green-800:#1B5E20; --color-green-900:#0F3D14;
  /* Neutrale — tekst podstawowy #1B1B1B */
  --color-ink-50:#F5F5F4; --color-ink-100:#ECECEC; --color-ink-200:#D8D8D8;
  --color-ink-300:#B5B5B5; --color-ink-500:#6B6B6B; --color-ink-700:#3A3A3A; --color-ink-900:#1B1B1B;
  /* Powierzchnie — ciepła biel tła stron + białe karty */
  --color-bone:#FAFFFA; --color-surface:#FFFFFF;
  /* Stany */
  --color-success:#2E7D32; --color-warning:#E2A03F; --color-danger:#C5443A; --color-info:#3A6FB0;
  /* Akcenty (łapy / pinezki mapy) + fioletowy fokus pola karty Stripe */
  --color-clay:#C97B5A; --color-sun:#E8B84A; --color-stripe:#635BFF;
  /* Promienie (skala 6→28 + pill) */
  --radius-xs:6px; --radius-sm:10px; --radius-md:14px; --radius-lg:20px; --radius-xl:28px; --radius-pill:999px;
  /* Cienie (3 poziomy) */
  --shadow-1:0 1px 2px rgba(20,30,20,.06),0 1px 1px rgba(20,30,20,.04);
  --shadow-2:0 4px 12px rgba(20,30,20,.06),0 2px 4px rgba(20,30,20,.04);
  --shadow-3:0 12px 28px rgba(20,30,20,.10),0 4px 10px rgba(20,30,20,.05);
  /* Typografia — Inter (UI) + JetBrains Mono (ceny, ID, metadane, tokeny) */
  --font-sans:"Inter","Inter Variable",system-ui,"Segoe UI",sans-serif;
  --font-mono:"JetBrains Mono",ui-monospace,Menlo,monospace;
}
```
Skala typografii (Inter): display 56 → 40 → 32 → 28 → 22 → 20 → 18 → 16 → 15 → 14 → **13 (body)** → 12 → 11 (caption); wagi 400/500/600/700. Status zdrowia psa / weryfikacji mapowany na `success/warning/danger` (kropki z poświatą w panelu „Moi pupile").

**Biblioteka komponentów `src/shared/ui/`** (każdy z wariantami + stanami + a11y, pokryte podstawowymi testami render):
`Button` (primary/secondary/ghost/danger × sm/md/lg, kształt **pill**, loading, ikona), `Input`, `Textarea`, `Select`, `Checkbox`, `RadioGroup`, `Toggle`, `DatePicker` (react-day-picker, locale pl), `TimeRangePicker` (rząd chipów godzin: klik start → klik koniec, środkowe podświetlone, zajęte disabled), `Badge` (warianty success/warning/danger/info/neutral/outline/solid/rating — statusy rezerwacji pending/approved/confirmed/rejected/cancelled + zdrowie + ocena ★), `Avatar` (inicjały/zdjęcie), `Card`, `Modal`/`Dialog` (focus trap), `Drawer`, `Tabs`, `Table` (sortowalna, paginacja), `Pagination`, `Rating` (gwiazdki, read/write), `Toast`/`Toaster`, `Skeleton`, `EmptyState` (ilustracja+CTA), `Spinner`, `Tooltip`, `Stepper` (wizard 1·2·3 z aktywnym ringiem), `StatCard` (kafelek liczbowy), `PriceTag`, `FileDropzone` (upload zdjęć), `MapView` (wrapper Leaflet), `FormField` (label+error+hint wrapper dla RHF).

**Ikonografia:** `lucide-react` dla ikon generycznych + mały zestaw **autorskich ikon tematycznych line** (pies, łapa, kość, ogród/drzewo, furtka-klucz, tarcza-bezpieczeństwo, pinezka, kalendarz, gwiazdka) przeniesionych jako SVG z `docs/design/project/Design System.html` (sekcja „Ikony tematyczne", 24 ikony). Karta oferty (`GardenCard`): okładka 4:3, badge statusu w lewym górnym, „serce" (zapisz) w prawym górnym, price-tag, rating ★+liczba recenzji.

### 16.1.1. Ekrany źródłowe (Claude Design handoff)

**Wizualnym źródłem prawdy są prototypy HTML/CSS w `docs/design/project/`** (handoff z claude.ai/design; intencje i historia iteracji w `docs/design/chats/chat1.md`, instrukcja w `docs/design/README.md`). Odtwarzaj je **piksel-w-piksel** w React — odwzoruj wygląd, nie kopiuj struktury HTML prototypu. Mapowanie ekran → część:

| Plik w `docs/design/project/` | Część | Kluczowe elementy do odwzorowania |
|---|---|---|
| `Design System.html` | F0 | paleta, typografia, promienie/cienie, Button 4×3 pill, inputy, badge, karty, 24 ikony tematyczne |
| `Home Page.html` | F2 | nav (logo, wyszukiwarka centralnie max 640px, „Zostań gospodarzem" + „Zaloguj się" + ciemny CTA „Zarejestruj się"); hero z podświetloną frazą „idealny ogród" + 3 staty; pasek filtrów pill; **split 50/50** lista kart 2×3 ↔ sticky mapa z ceną na pinezkach; **hover karty ↔ podświetlenie pinezki**; ciemna stopka 5 kolumn |
| `Garden Detail.html` | F3 | galeria 1 duże + 2×2; breadcrumb; „★ 4,8 · 23 recenzje"; highlights; udogodnienia (dostępne + przekreślone brakujące); zasady; karta gospodarza; sticky BookingWidget („45 / zł / za godzinę", kalendarz, **chipy godzin**, licznik psów ± z dopłatą, koszty na żywo); mini-mapa z ringiem przybliżonej lokalizacji + „dokładny adres po rezerwacji" |
| `Booking Form.html` | F4 (krok 1) | stepper 1→2→3; sekcje 01 Kiedy / 02 Pies (karty radio z badge szczepień) / 03 Wiadomość (textarea 0/500) / 04 Regulamin (3 wymagane + 1 opcjonalny); sticky podsumowanie; CTA disabled do zaznaczenia 3 zgód; plakietka „Bezpieczna rezerwacja · SSL" |
| `Payment.html` | F4 (krok 2) | **tylko karty** (Stripe): pasek „Akceptujemy VISA/Mastercard/AMEX", compound input (numer + auto-detekcja brandu, MM/RR, CVC, właściciel), **fokus fioletowy `--color-stripe`**, „Zapisz kartę"; dane do rozliczenia + rozwijane „faktura na firmę" (NIP); CTA „Zapłać 89 zł" z kłódką; trust bar 3-D Secure · PCI DSS · Stripe; modal autoryzacji 3-D Secure |
| `Login.html` | F1 | „Cześć ponownie!"; e-mail + hasło (toggle podglądu); „Zapamiętaj mnie na 30 dni" + „Zapomniałeś hasła?"; CTA; divider „lub" + Google/Apple (tylko wizualnie, §18); link do rejestracji; lewa kolumna = ilustracja biegnącego psa (SVG) |
| `Register.html` | F1 | toggle **Klient / Gospodarz** (ikony łapa/płot, „Szukam ogrodu"/„Wynajmuję ogród"); imię+nazwisko 2 kolumny; e-mail/telefon/hasło/powtórz; **miernik siły hasła** (4 segmenty: Słabe/OK/Dobre/Mocne); 3 checkboxy (RODO + Regulamin wymagane, newsletter opcjonalny); CTA disabled do obu wymaganych |
| `Client Panel.html` | F5 | sidebar 280px (avatar + „Klient", Moje rezerwacje/Moi pupile/Recenzje/Wiadomości[badge]/Ustawienia, „Wyloguj się" w danger); 4 StatCard; taby Nadchodzące/Zakończone/Anulowane; karty rezerwacji (miniatura \| info \| akcje) z badge statusu; zakładka „Moi pupile" z kropkami statusu zdrowia |
| `Host Panel.html` | F6 | sidebar (avatar MK + weryfikacja + „Super-Gospodarz"; Moje ogrody/Rezerwacje[badge]/Harmonogram/Wiadomości/Zarobki; widget zarobków ciemnozielony „1 847 zł"); 4 StatCard; taby Wszystkie/Oczekuje(•)/Zaakceptowane/Odrzucone; **tabela rezerwacji** (Klient/Pies/Ogród/Data/Kwota brutto+netto/Status/Akcje), wiersze pending z pomarańczowym lewym borderem, Akceptuj/Odrzuć; zakładka „Moje ogrody" — karty 16:9 z badge statusu |

`Login.html`/`Register.html` współdzielą `docs/design/project/assets/auth.css` i ilustrację `assets/garden-dog.svg`. SSO Google/Apple pozostaje **tylko wizualne** (PLAN §18). Płatność **wyłącznie kartą przez Stripe** — pierwotny wybór metod (BLIK/Przelewy24/Apple/Google Pay) został **świadomie usunięty** w handoffie (decyzja właściciela: „aplikacja obsługuje tylko Stripe, karty płatnicze").

### 16.2. Tablica tras (`src/app/router.tsx`, React Router v7)

| Ścieżka | Layout | Strona | Dostęp | Część |
|---|---|---|---|---|
| `/` | Public | Home / katalog + mapa | 🌐 | F2 |
| `/ogrody/:id` | Public | Szczegóły ogrodu | 🌐 | F3 |
| `/logowanie` | Auth | Logowanie | 🌐 | F1 |
| `/rejestracja` | Auth | Rejestracja | 🌐 | F1 |
| `/reset-hasla`, `/reset-hasla/:token` | Auth | Reset hasła | 🌐 | F1 |
| `/rezerwacja/:gardenId` | Public(zalog.) | Wizard rezerwacji + płatność | 🐕 | F4 |
| `/rezerwacja/:id/sukces` | Public(zalog.) | Potwierdzenie | 🐕 | F4 |
| `/panel` (index → rezerwacje) | DashboardClient | Moje rezerwacje | 🐕 | F5 |
| `/panel/pupile` | DashboardClient | Moi pupile | 🐕 | F5 |
| `/panel/recenzje` | DashboardClient | Moje recenzje / do wystawienia | 🐕 | F5 |
| `/panel/wiadomosci`, `/panel/wiadomosci/:id` | DashboardClient | Czat | 🐕 | F7 |
| `/panel/ustawienia` | DashboardClient | Ustawienia konta | 👤 | F5 |
| `/gospodarz` (index → ogrody) | DashboardHost | Moje ogrody | 🏠 | F6 |
| `/gospodarz/ogrody/nowy`, `/gospodarz/ogrody/:id/edycja` | DashboardHost | Formularz ogrodu + mapa | 🏠 | F6 |
| `/gospodarz/rezerwacje` | DashboardHost | Rezerwacje (tabela, accept/reject) | 🏠 | F6 |
| `/gospodarz/harmonogram` | DashboardHost | Harmonogram | 🏠 | F6 |
| `/gospodarz/wiadomosci`, `/:id` | DashboardHost | Czat | 🏠 | F7 |
| `/gospodarz/zarobki` | DashboardHost | Zarobki | 🏠 | F6 |
| `/gospodarz/ustawienia` | DashboardHost | Ustawienia konta | 👤 | F5/F6 |
| `/admin` (+podstrony) | DashboardAdmin | Kolejka weryfikacji, użytkownicy, moderacja | 🛡 | F8 |
| `/regulamin`, `/polityka-prywatnosci`, `/pomoc`, `/uslugi-elektroniczne` | Public | Strony statyczne | 🌐 | F8 |
| `*` | Public | 404 | 🌐 | F0 |

Ochrona tras: `RequireAuth` i `RequireRole` (czyta `AuthContext`), przekierowanie na `/logowanie?next=`. Lazy-loading per route.

### 16.3. Współdzielona infrastruktura (część F0)
- `shared/api/client.ts`: axios instance, baza `/api/v1`, interceptory: dołącz `Authorization`, na 401 → kolejkowy refresh (jedno odświeżenie, retry oryginalnych żądań), na wygaśnięcie refresh → logout. 
- `shared/auth/`: `AuthContext` (user, login, logout, register, status), `tokens.ts` (access w pamięci, refresh w localStorage), `RequireAuth`/`RequireRole`.
- `shared/lib/`: `money.ts`, `dates.ts` (slots, formatowanie pl), `ws.ts` (`createChatSocket`), `cn.ts` (clsx), `queryClient.ts`.
- `app/providers.tsx`, `app/layouts/*`, `app/router.tsx`.
- Skrypt `npm run gen:api` → `openapi-typescript backend/schema.yaml -o src/shared/api/schema.d.ts`.

---

### F0 — Szkielet FE, design system, routing, auth, API client
**Cel:** fundament, na którym budują F1–F8. **Zależności:** B0 (schema.yaml istnieje). 
**Zakres:** init Vite+React19+TS strict; Tailwind v4 + tokeny (16.1); `shared/ui` (16.1) z testami render i Storybook-free demo stroną `/_ui` (tylko dev); `shared/api` (client+interceptory+typy); `shared/auth` (context+guards+tokens); `shared/lib`; layouty (Public z navbarem jak w mockupie: logo PsiPark, miasto, „Zostań gospodarzem", „Zaloguj się/Zarejestruj"; Auth split-screen; trzy Dashboard z sidebarami wg `Client Panel.html`/`Host Panel.html`); router z lazy; providers; `EmptyState`/error boundary/404; `vite.config` (proxy /api,/ws; vitest); ESLint/Prettier/tsconfig; `npm run gen:api`.
**DoD:** `npm run dev` pokazuje Home placeholder + `/_ui` z komponentami; lint/typecheck/test/build zielone; interceptor JWT przetestowany (mock 401→refresh→retry).

### F1 — Uwierzytelnianie (Logowanie, Rejestracja, Reset)
**Cel:** ekrany auth (`Login.html`, `Register.html`; sek. 16.1.1). **Zależności:** F0, B1.
**Zakres / strony:**
- **AuthLayout** split: lewa kolumna pastelowa ilustracja (wzgórza+pies+chmury, SVG/obraz) z kartką-testimonialem na dole; prawa kolumna formularz. „Wróć do strony głównej" u góry.
- **Rejestracja** (`/rejestracja`): toggle **Klient / Gospodarz** (segmenty z mockupu), pola Imię, Nazwisko, E-mail, Telefon, Hasło (siła), Powtórz hasło; checkboxy: akceptacja Regulaminu+Polityki (wymagana), zgoda marketingowa (opcjonalna); przycisk „Załóż konto"; przyciski Google/Apple (wizualnie, disabled z tooltipem „wkrótce" — poza zakresem auth społ.); link „Masz już konto? Zaloguj się". Walidacja zod, mapowanie błędów 400 z API na pola. Po sukcesie: zapis tokenów, redirect (klient→`/panel`, host→`/gospodarz`).
- **Logowanie** (`/logowanie`): E-mail, Hasło, „Zapamiętaj mnie na 30 dni" (steruje trwałością refresh), „Zaloguj się"; „Zapomniałeś hasła?"; „Nie masz konta? Zarejestruj się". Obsługa 401 (komunikat PL), throttling 429 (komunikat „spróbuj za chwilę").
- **Reset hasła**: ekran z e-mailem (wyślij link) + ekran ustawienia nowego hasła po `:token`.
**DoD:** pełny cykl rejestracja→logowanie→reset działa na żywym backendzie; walidacje i błędy API po polsku; testy render+walidacja formularzy.

### F2 — Strona główna: katalog + wyszukiwarka + mapa (`Home Page.html`)
**Cel:** publiczny katalog z filtrami i mapą split-view. **Zależności:** F0, B3.
**Zakres / sekcje strony:**
- **Hero**: nagłówek „Znajdź **idealny ogród** dla swojego psa" (akcent zielony), podtytuł, **SearchBar**: Miasto (autouzupełnianie z dostępnych miast), Kiedy (DatePicker), Godziny (TimeRangePicker), liczba psów (stepper), przycisk „Szukaj". Pasek statystyk (liczba ogrodów, średnia cena, średnia ocena) — z lekkiego endpointu agregatów lub policzone z listy.
- **FiltersBar** (sticky pod hero): chipy/dropdowny — Dostępność (data), zakres godzin, liczba psów, cena (slider min/max), powierzchnia, udogodnienia (multi), nawierzchnia, sort („Polecane/Najtańsze/Najwyżej oceniane"), toggle widoku lista/mapa. Stan filtrów w URL (query params) — udostępnialny link, działający wstecz/naprzód.
- **Split view**: lewa kolumna **siatka kart ogrodów** („Ogrody w Krakowie", licznik, sort), prawa **mapa Leaflet** z markerami (cena na pinezce jak w mockupie); hover karty ↔ podświetlenie markera; klik markera → popup mini-karta. Mapa reaguje na `in_bbox` (po przesunięciu mapy filtruje listę — debounce).
- **GardenCard**: okładka (lazy), tytuł, miasto, ocena+liczba recenzji, cena/h, badge „Zweryfikowany gospodarz", serce „zapisz" (lokalne ulubione w MVP — localStorage, bez backendu). Klik → `/ogrody/:id`.
- Stany: skeleton kart, empty („Brak ogrodów dla tych filtrów" + reset), error+retry. Paginacja/scroll (paginacja stronicowa zgodnie z API).
**DoD:** filtry+sort+mapa+paginacja działają z API, stan w URL; budżet renderu płynny; testy: FiltersBar (zmiana filtra → query), GardenCard, mapowanie listy.

### F3 — Szczegóły ogrodu + widget rezerwacji (`Garden Detail.html`)
**Cel:** strona oferty z bookingiem. **Zależności:** F0, B3 (B4 dla dostępności realnej, B8 dla „napisz do gospodarza").
**Zakres / sekcje:**
- **Galeria** (mozaika zdjęć, lightbox „Pokaż wszystkie zdjęcia"), breadcrumb, tytuł, ocena+liczba recenzji, lokalizacja, akcje „Udostępnij/Zapisz".
- **Lewa kolumna**: „Ogród prowadzony przez {host}" (avatar, od kiedy, liczba rezerwacji), parametry (powierzchnia, nawierzchnia, max psów, ogrodzenie — ikonki jak w mockupie), „O tym ogrodzie" (opis), **„Co oferuje ten ogród"** (siatka udogodnień z ikonami, „Pokaż wszystkie N udogodnień"), **„Zasady gospodarza"** (lista), **„Poznaj gospodarza"** (karta + „Napisz do Magdy" → otwiera/zakłada konwersację F7; „Zobacz profil"), **sekcja recenzji** („★ 4,8 · 23 recenzje", siatka recenzji z avatarami, „Pokaż wszystkie recenzje" → paginacja).
- **Prawa kolumna — BookingWidget (sticky)**: „45 zł za godzinę", **kalendarz** (react-day-picker, dni z dostępnością), **sloty godzinowe** (z `availability` endpoint; zajęte wyszarzone), liczba psów (≤ max), wyliczenie: „45 zł × N godzin", prowizja platformy, **Razem**, przycisk **„Zarezerwuj"** → `/rezerwacja/:gardenId` z przekazaniem wybranych dat/godzin/psa (state). Gość → redirect na logowanie z `next`.
- Stany loading/error; SEO-friendly tytuł.
**DoD:** dostępność i ceny zgadzają się z API; przejście do wizardu z poprawnym kontekstem; „napisz do gospodarza" tworzy konwersację; testy: kalkulacja ceny, blokada zajętych slotów, gość→login.

### F4 — Wizard rezerwacji + płatność Stripe (`Booking Form.html` + `Payment.html`)
**Cel:** dwukrokowy checkout. **Zależności:** F3, B4, B5, B6.
**Zakres:**
- **Stepper**: 1 „Szczegóły rezerwacji" · 2 „Płatność" · 3 „Potwierdzenie".
- **Krok 1** (`/rezerwacja/:gardenId`): „Kiedy przyjedziesz?" (edycja daty/godzin z F3), „Z którym psem przyjedziesz?" (lista psów klienta z F5/B2, radio + „Dodaj kolejnego psa" → szybki modal dodania psa), „Wiadomość dla gospodarza" (textarea), „Akceptacja regulaminu" (checkboxy wymagane). **Sidebar podsumowania** (sticky): miniatura+tytuł ogrodu, data, godziny, pies, rozbicie kwot, Razem. Przycisk „Przejdź do płatności" → `POST /reservations/` (tworzy `pending_payment`) → `POST /reservations/:id/payment-intent/`.
- **Krok 2** „Płatność" (`Payment.html`): **Stripe `<Elements>`+`<PaymentElement>` skonfigurowany wyłącznie na karty** (bez BLIK/P24/Apple/Google Pay — świadoma decyzja, sek. 16.1.1); pasek „Akceptujemy VISA/Mastercard/AMEX", fokus pola w fiolecie `--color-stripe`, opcja „Zapisz kartę"; sekcja „Dane do rozliczenia" (imię/nazwisko, e-mail, adres, kod, miasto, kraj, rozwijane „chcę fakturę na firmę" → NIP/nazwa). Przycisk „Zapłać {kwota}" z kłódką + trust bar (3-D Secure · PCI DSS · Stripe). `confirmPayment({redirect:'if_required'})`. Po sukcesie → polling `GET /reservations/:id` aż `awaiting_host` (webhook) → krok 3. Obsługa błędu karty (komunikat PL), karty testowe w hint pod formularzem (dev).
- **Krok 3** (`/rezerwacja/:id/sukces`): potwierdzenie „Rezerwacja oczekuje na akceptację gospodarza", podsumowanie, linki: „Moje rezerwacje", „Pobierz fakturę" (gdy gotowa), „Wróć do katalogu".
- Guardy: tylko właściciel rezerwacji; wygasła/opłacona → odpowiedni komunikat i redirect.
**DoD:** pełna płatność testową kartą Stripe kończy się rezerwacją `awaiting_host` i fakturą; stany błędów obsłużone; testy: walidacja kroku 1, kalkulacja, mock potwierdzenia płatności, polling statusu.

### F5 — Panel klienta: rezerwacje, pupile, recenzje, ustawienia (`Client Panel.html`)
**Cel:** dashboard klienta. **Zależności:** F0, B4, B2, B7, B6.
**Zakres / strony (DashboardClient layout — sidebar wg `Client Panel.html`: avatar+„Klient", Moje rezerwacje, Moi pupile, Recenzje, Wiadomości[F7], Ustawienia konta, Centrum pomocy, „Wyloguj się"):**
- **Moje rezerwacje** (`/panel`): nagłówek „Witaj z powrotem, {imię}", 4 **StatCard** (Wszystkich rezerwacji, Spędzonego w ogrodach (h), Wystawionych recenzji, Wydane zł), przyciski „Eksport CSV", „Znajdź ogród". **Tabs**: Nadchodzące / Zakończone / Anulowane (liczniki). **Karta rezerwacji**: miniatura, tytuł ogrodu, badge statusu („POTWIERDZONA" itd.), miasto+gospodarz, data, godziny, liczba godzin, pies, kwota; akcje wg statusu: „Szczegóły", „Faktura" (download), „Anuluj" (modal z polityką 24h → pokazuje czy refund), dla zakończonych „Wystaw recenzję" (modal Rating+komentarz → B7).
- **Moi pupile** (`/panel/pupile`): nagłówek + „Dodaj psa". **Karta psa**: avatar/inicjał, imię, badge „AKTYWNY", rasa/wiek/waga/płeć/sterylizacja, „w PsiPark od…", statystyki (Rezerwacje, Łącznie h, Ulubiony ogród), **statusy zdrowia** z kolorowymi kropkami (Szczepienia „Ważne do…", Odrobaczanie, Książeczka zdrowia — `success/warning/danger` z `health_status`), akcje „Edytuj profil", „Dodaj zdjęcia", „Dokumenty". Kafelek „+ Dodaj kolejnego psa". Formularz psa (modal/strona) z polami z 7.2 + upload.
- **Recenzje** (`/panel/recenzje`): zakładki „Do wystawienia" (z `reviews/eligible`) i „Wystawione" (edycja/usuń).
- **Ustawienia konta** (`/panel/ustawienia`, wspólne też dla hosta): dane osobowe (PATCH /me), zmiana hasła, zgody marketingowe, **usunięcie konta** (RODO, modal potwierdzenia), wylogowanie ze wszystkich urządzeń (blacklist).
**DoD:** wszystkie akcje (anuluj/refund, recenzja, CRUD psa, faktura, edycja profilu) działają z API; statusy zdrowia poprawne; testy: karty rezerwacji per status, health status, formularz psa.

### F6 — Panel gospodarza: ogrody, rezerwacje, harmonogram, zarobki (`Host Panel.html`)
**Cel:** dashboard hosta. **Zależności:** F0, B3, B4, (B5 dla zarobków).
**Zakres / strony (DashboardHost layout — sidebar wg `Host Panel.html`: „Gospodarz", Moje ogrody, Rezerwacje, Harmonogram, Wiadomości[F7], Zarobki, Ustawienia; widget salda „1 847 zł"):**
- **Moje ogrody** (`/gospodarz`): siatka **kart ogrodu** z badge statusu („AKTYWNY"/„OCZEKUJE WERYFIKACJI"/„ODRZUCONY" z powodem), miniatura, tytuł, lokalizacja, statystyki (rezerwacje, ocena, przychód), cena/h, akcje „Edytuj", „Statystyki", przełącznik aktywności; kafelek „+ Dodaj nowy ogród".
- **Formularz ogrodu** (`/gospodarz/ogrody/nowy` i `/:id/edycja`): pola z 7.3 (tytuł, opis, miasto, adres, powierzchnia, nawierzchnia, ogrodzenie+wysokość, max psów, cena/h, godziny otwarcia, min. godziny), **udogodnienia** (multi-checkbox z `Amenity`), **zasady** (lista edytowalna), **LocationPicker** (Leaflet — klik ustawia lat/lng, marker przeciągalny), **upload zdjęć** (FileDropzone, sortowanie, okładka, max 12). Walidacja zod. Po zapisie info „ogród oczekuje na weryfikację".
- **Rezerwacje** (`/gospodarz/rezerwacje`): StatCard (Czeka na decyzję, Potwierdzonych w mies., śr. czas odpowiedzi, śr. ocena), **Tabs** Wszystkie/Oczekujące/Zaakceptowane/Odrzucone (liczniki), **Tabela** (klient+avatar, pies, ogród, data+godziny, kwota, status) z akcjami **Akceptuj/Odrzuć** (modal odrzucenia z powodem → refund), „Szczegóły"; paginacja; „Eksport CSV", „Otwórz harmonogram".
- **Harmonogram** (`/gospodarz/harmonogram`): widok kalendarza (miesiąc/tydzień) z rezerwacjami jako wydarzenia (z `host/schedule`), filtr po ogrodzie; klik → szczegóły. (Kalendarz złożony własnoręcznie na bazie date-fns + siatka; bez ciężkiej biblioteki.)
- **Zarobki** (`/gospodarz/zarobki`): saldo, lista transakcji (rezerwacje opłacone, prowizje), suma miesięczna; (wykresy proste słupkowe własne SVG — bez biblioteki, opcjonalne).
**DoD:** host tworzy/edytuje ogród z mapą i zdjęciami, akceptuje/odrzuca rezerwacje (z refundem), widzi harmonogram i zarobki; testy: formularz ogrodu (walidacja, location picker), tabela rezerwacji (akcje per status), reorder zdjęć.

### F7 — Czat (mockup 7 z projekt.pdf — poza handoffem Claude Design; trzymaj design system)
**Cel:** wiadomości na żywo dla klienta i hosta. **Zależności:** F0, B8.
**Zakres:** dwupanelowy widok (lista konwersacji + wątek), wspólny komponent osadzony w obu dashboardach (`/panel/wiadomosci`, `/gospodarz/wiadomosci`).
- **Lista konwersacji**: avatar rozmówcy, nazwa, podgląd ostatniej wiadomości, czas, **badge nieprzeczytanych**, filtr „Wszystkie/Nieprzeczytane/Archiwum", szukajka. Sort po `last_message_at`.
- **Wątek**: nagłówek (rozmówca + kontekst ogrodu/rezerwacji + „Zobacz rezerwację"), lista wiadomości (bąbelki: swoje zielone po prawej, cudze po lewej — jak w mockupie), separatory dat, **wskaźnik pisania**, „przeczytano", lazy-load historii w górę (kursor), **input** z wysyłaniem (Enter), auto-scroll na nową.
- **Realtime**: hook `useChatSocket(conversationId)` (WS z sekcji 9) — connect z access tokenem, obsługa `message.new/typing/read`, auto-reconnect + refetch historii po reconnect; aktualizacja badge'a na liście (kanał `user_{id}`). Fallback: jeśli WS padnie, REST polling co X s.
**DoD:** dwóch użytkowników rozmawia na żywo (manual + test z mock socketem), nieprzeczytane i „przeczytano" działają; historia doładowuje; testy: render wątku, wysyłka (mock ws), unread badge.

### F8 — Panel admina + strony statyczne
**Cel:** narzędzia admina i treści prawne. **Zależności:** F0, B9.
**Zakres:**
- **DashboardAdmin** (`/admin`): **Kolejka weryfikacji ogrodów** (lista pending z podglądem: zdjęcia, dane, mapa; akcje Zatwierdź / Odrzuć+powód → B9), **Użytkownicy** (tabela, filtr rola/status, akcje Zweryfikuj hosta / Zablokuj / Odblokuj), **Moderacja recenzji** (lista, usuń). Proste, funkcjonalne (mockupy nie definiują UI admina — trzymać estetykę systemu, bez fantazji). Guard `RequireRole admin`.
- **Strony statyczne** (Public layout): Regulamin, Polityka prywatności, Centrum pomocy/FAQ, „Świadczenie usług drogą elektroniczną" — treść z plików MD/HTML (placeholder prawniczy + disclaimer o braku odpowiedzialności za szkody pupila). Linki w stopce i przy rejestracji.
- **Stopka** globalna (logo, linki prawne, kontakt, „© PsiPark").
**DoD:** admin przechodzi kolejkę weryfikacji i zarządza userami z UI; strony prawne dostępne i linkowane; testy: akcje kolejki (mock API), guard roli.

---

## 17. Kolejność realizacji

### 17.1. Graf zależności (DAG)

```
B0 ──┬── B1 ──┬── B10 (maile; przed B4/B5/B9)
     │        ├── B2 ──┐
     │        ├── B3 ──┼── B4 ── B5 ── B6
     │        │        │         └── (B4.reject/cancel używa B5.refund)
     │        │        └── B8 (czat; potrzebuje B3+B1)
     │        └── B9 (admin; potrzebuje B3+B1)
     │
     └── B7 (recenzje; potrzebuje B4)

FRONTEND:
F0 (po B0) ── F1 (po B1) ── F2 (po B3) ── F3 (po B3) ── F4 (po B4,B5,B6)
                          ── F5 (po B4,B2,B7,B6)
                          ── F6 (po B3,B4,B5)
                          ── F7 (po B8)
                          ── F8 (po B9)
```

### 17.2. Zalecana sekwencja (z oknami równoległości)

| Faza | Backend | Frontend (równolegle, gdy API gotowe) |
|---|---|---|
| 1 | **B0** | — |
| 2 | **B1**, potem **B10** | **F0** (po B0) |
| 3 | **B2** ∥ **B3** | **F1** (po B1) |
| 4 | **B4** | **F2** ∥ **F3** (po B3) |
| 5 | **B5** → **B6**; ∥ **B7**; ∥ **B8**; ∥ **B9** | **F6** (po B4) |
| 6 | — | **F4** (po B5/B6) ∥ **F5** (po B7) ∥ **F7** (po B8) ∥ **F8** (po B9) |

Reguła kontraktu między częściami: ponieważ wszystkie części trzymają się sekcji 7 i 8, agenci FE mogą startować na podstawie `schema.yaml` zaraz po zmergowaniu odpowiedniej części BE. Gdy część BE jeszcze trwa, FE może pracować na zamockowanych hookach React Query i przełączyć na realne po dostarczeniu schematu.

### 17.3. Punkty styku wymagające uwagi (potencjalne cykle)
- **gardens.availability ↔ reservations.collision**: właścicielem reguły kolizji jest `reservations.selectors.busy_intervals`; `gardens` ją woła (import wewnątrz funkcji, nie na top-level — unika cyklu). B3 dostarcza availability na pustym zbiorze do czasu B4; B4 podpina realne interwały. Test integracyjny w B4.
- **reservations ↔ payments ↔ invoices ↔ notifications**: kierunek wywołań tylko „w dół" przez fasady (`payments.gateway`, `notifications.services`, `invoices.services`). Żaden z tych modułów nie importuje `reservations` na top-level (ewentualnie lazy). 
- **notifications.send musi istnieć, zanim zawołają go B4/B5/B9**: stub no-op (logger) w B0 pod finalnym interfejsem; B10 podmienia implementację bez zmiany sygnatury.

---

## 18. Świadomie poza zakresem MVP

Aby uniknąć rozjazdu — te rzeczy **nie** są implementowane (chyba że osobne zlecenie):
- Logowanie społ. (Google/Apple) — przyciski tylko wizualne, nieaktywne.
- Aplikacja mobilna / pełny RWD telefonowy (mockupy są desktopowe; zapewniamy jedynie nierozpadanie się układu).
- Wieloosobowe role na jednym koncie, role-switching.
- Płatności produkcyjne, wypłaty do gospodarzy (payout), rozliczenia podatkowe inne niż faktura PDF.
- Powiadomienia push/SMS (Twilio z analizy — pominięte; tylko e-mail przez Mailpit, zgodnie z listą technologii projekt.pdf).
- Pełnotekstowe wyszukiwanie, rekomendacje, kalendarz iCal, eksport do księgowości.
- Kolejki zadań (Celery), wyszukiwanie geokodowane (adres→współrzędne), CDN/S3.
- i18n (tylko polski).

Każdy agent, który „chciałby dodać" coś z tej listy — **nie dodaje**, ewentualnie zostawia punkt zaczepienia (interfejs) i notkę w README.

---

## 19. Ryzyka i pułapki

| Ryzyko | Mitygacja (obowiązkowa) |
|---|---|
| WeasyPrint nie działa lokalnie (brak Pango) | backend **tylko** w Dockerze; pakiety systemowe w Dockerfile (13.2); nigdy nie zakładać uruchomienia na hoście Windows |
| Wyścig podwójnej rezerwacji slotu | dwuwarstwowo: `select_for_update` + `ExclusionConstraint` (btree_gist); test równoległości w B4 |
| Webhook Stripe jako jedyne źródło prawdy, front „myśli" że zapłacono | nie ufać frontowi; status zmienia wyłącznie webhook; front pollinguje `GET /reservations/:id` |
| Numeracja faktur — duplikaty | `InvoiceSequence` + `select_for_update`; unikalny `number`; test współbieżny |
| React Router v7 — import z `react-router-dom` | używać `react-router` (4.2 uwaga); nie instalować `react-router-dom` |
| Tailwind v4 — szukanie `tailwind.config.js` | konfiguracja w CSS `@theme`; brak pliku config (4.2) |
| react-leaflet v5 wymaga React 19 | wersje przypięte (4.2); ikony markerów — fix ścieżek w Vite (10.4) |
| Strefy czasowe i sloty | `USE_TZ=True`, `Europe/Warsaw`; API z offsetem; testy na granicy DST |
| Float w pieniądzach | wyłącznie `Decimal`; do Stripe ×100 int; helper `money_round` (HALF_UP) |
| N+1 na listach | selektory z `select_related/prefetch/annotate`; testy budżetu zapytań (12) |
| Cykl importów między aplikacjami | reguły 17.3; importy lazy w punktach styku |
| JWT w localStorage (XSS) | access w pamięci, tylko refresh w storage; rotacja+blacklist; udokumentować kompromis |
| Dryf kontraktu FE↔BE | jedno źródło: `schema.yaml` → `schema.d.ts`; regeneracja po każdej zmianie API |
| Rozjazd nazewnictwa enumów | enumy EN w API, tłumaczenie wyłącznie w warstwie prezentacji FE (mapy etykiet) |

---

## 20. Końcowy smoke test (scenariusz E2E)

Po zmergowaniu wszystkich części — ręczny scenariusz potwierdzający spójność (do skryptu w README):

1. `docker compose up --build`; `seed_demo`; otwórz `http://localhost:5173`.
2. **Gość**: przegląda katalog, filtruje po mieście „Kraków", używa mapy, wchodzi w szczegóły ogrodu, czyta recenzje.
3. **Rejestracja klienta** → dodaje psa (z datami szczepień) w „Moi pupile".
4. Wraca do ogrodu → wybiera dzień/godziny/psa → „Zarezerwuj" → wizard krok 1 (wiadomość, zgody) → krok 2 płatność **kartą testową** `4242 4242 4242 4242` → sukces → rezerwacja `awaiting_host`, **faktura PDF** do pobrania, **mail** w Mailpit (`reservation_paid`).
5. **Gospodarz** (osobne konto/seed): w „Rezerwacje" widzi oczekującą → **Akceptuje** → klient dostaje mail, status `confirmed`; widać ją w „Harmonogram" i „Zarobki".
6. **Czat**: klient pisze do gospodarza, gospodarz odpowiada — wiadomości na żywo, badge nieprzeczytanych.
7. (Po `end_time`, seed ma zakończoną) **klient** wystawia **recenzję** → widoczna w katalogu, podnosi ocenę ogrodu.
8. **Klient** anuluje inną nadchodzącą rezerwację → komunikat o polityce 24h i ewentualnym zwrocie; status `cancelled`, mail.
9. **Admin** (`/admin`): zatwierdza ogród z kolejki `pending` → staje się publiczny; weryfikuje gospodarza (badge); blokuje testowego usera → ten nie może się zalogować.
10. **Jakość**: `pytest` (cała sucha bateria) zielony, `ruff` czysty; `npm run lint/typecheck/test/build` zielone; `/api/v1/health/` = 200; brak błędów w konsoli przeglądarki.

Zaliczenie wszystkich 10 kroków = system zgodny z tym planem.

---

## Załącznik A — mapowanie przypadków użycia (projekt.pdf) na części

| Przypadek użycia (diagram) | Backend | Frontend |
|---|---|---|
| Rejestracja / Logowanie / Reset hasła / Wylogowanie | B1 | F1 |
| Edycja profilu / Usuwanie konta | B1 | F5 |
| Przeglądanie ofert / szczegółów ogrodu | B3 | F2/F3 |
| Wyszukiwanie z mapą i filtrami | B3 | F2 |
| Przeglądanie recenzji | B7/B3 | F2/F3 |
| Dodawanie/Edycja/Usuwanie profilu psa | B2 | F5 |
| Rezerwacja ogrodu / Anulowanie / Sprawdzanie harmonogramu | B4 | F3/F4/F5/F6 |
| Płatność online | B5 | F4 |
| Generowanie / Pobranie faktury PDF | B6 | F4/F5 |
| Wystawianie recenzji | B7 | F5 |
| Komunikacja na czacie | B8 | F7 |
| Wysłanie powiadomienia mailowego | B10 | — |
| Dodawanie/Edycja/Usuwanie/Przeglądanie ogrodu (host) | B3 | F6 |
| Zarządzanie rezerwacjami / Akceptacja / Odrzucenie | B4 | F6 |
| Weryfikacja kont gospodarzy / Moderowanie ogłoszeń / Zarządzanie użytkownikami | B9 | F8 |

## Załącznik B — checklista zgodności dla każdej części (wytnij do PR)

```
[ ] Zakres zgodny z sekcją 15.x/16.x — nic ponad
[ ] Model danych zgodny z sekcją 7 (bez samowolnych pól)
[ ] Endpointy/kształty zgodne z sekcją 8 (lub WS z 9)
[ ] services/selectors rozdzielone; views cienkie (6.2)
[ ] keyword-only args, type hints, docstrings z Raises
[ ] Wyjątki biznesowe + code (6.3)
[ ] Testy: happy/401/403/400/409 + budżet zapytań (gdy lista)
[ ] Brak nowych zależności spoza sekcji 4
[ ] ruff + pytest zielone; coverage progi (6.4)
[ ] schema.yaml zregenerowany (jeśli API)
[ ] FE: lint/typecheck/test/build zielone; typy z schema.d.ts; 4 stany widoku
[ ] Teksty PL, enumy EN; pieniądze Decimal/formatPLN
[ ] .env.example zaktualizowany; brak sekretów w repo
[ ] Notka decyzji w README (jeśli był wybór)
```

---

*Koniec planu. Wersja 1.0 — zgodna z analiza.pdf i projekt.pdf (technologie, diagram przypadków użycia, ERD z korektami K-1…K-10, projekt interfejsu). Wszelkie odstępstwa wymagają aktualizacji tego dokumentu, nie obejścia w kodzie.*
