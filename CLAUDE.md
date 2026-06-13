# CLAUDE.md — zasady pracy w repozytorium PsiPark

Ten plik czyta każdy agent i każda osoba pracująca w repo. To **reguły współpracy**, które mają nie dopuścić do rozjechania się projektu, gdy pracuje nad nim kilka osób i wielu agentów równolegle. **Pełna specyfikacja jest w [`docs/PLAN.md`](docs/PLAN.md)** — ten plik jej nie powtarza, tylko egzekwuje.

> **Status repo:** faza budowy. Kod powstaje częściami (backend `B0–B10`, frontend `F0–F8`) wg `docs/PLAN.md`. `B0` zakłada szkielet (Django, Docker, `core`, `config/`) — dopóki go nie ma, nie zakładaj, że pliki backendu istnieją.

---

## 0. TL;DR — przeczytaj, zanim cokolwiek zmienisz

1. **Źródło prawdy = `docs/PLAN.md`.** Kontrakt API (sek. 8), model danych (sek. 7) i protokół WS (sek. 9) są **wiążące**. Jeśli kod ≠ PLAN → kod jest błędny (albo trzeba świadomie zmienić PLAN, patrz §6).
2. **Pracujesz nad JEDNĄ częścią** (np. `B4`). Modyfikujesz **tylko swoje** katalogi (§2). Cudze — tylko czytasz.
3. **Gałąź per część.** Nigdy nie commituj bezpośrednio na `main`. Nigdy nie rób `git push --force` na gałąź współdzieloną.
4. **Nie dodawaj bibliotek spoza sek. 4 PLAN-u.** Nie podnoś wersji major (React 19, Router 7, Tailwind 4, react-leaflet 5, zod 3, Django 5.2, DRF 3.16).
5. **Po każdej zmianie API:** regeneruj `backend/schema.yaml`, potem `frontend` `npm run gen:api`. Plików generowanych **nie edytuj ręcznie**.
6. **Przed PR:** testy + lint zielone, `docker compose up` działa (§11).
7. **Musisz zmienić kontrakt/model/zależności?** → **STOP**, nie rób tego po cichu w swojej części. Protokół w §6.
8. **Niejasność?** Wybierz prostsze rozwiązanie zgodne z PLAN-em i zapisz decyzję w `README.md` → „Decyzje implementacyjne". Nie zgaduj przy kontrakcie.

---

## 1. Hierarchia dokumentów

| Plik | Rola |
|---|---|
| `docs/PLAN.md` | pełna specyfikacja: architektura, model danych, API, części B/F, DoD |
| `CLAUDE.md` (ten plik) | reguły współpracy i zasady anty-rozjazdowe |
| `README.md` | quickstart + log decyzji implementacyjnych |
| `docs/analiza.pdf`, `docs/projekt.pdf` | dokumenty źródłowe (tylko do wglądu) |

Konflikt treści: **PLAN.md > kod**. Reguły procesu: **CLAUDE.md** obowiązuje wszystkich.

---

## 2. Mapa własności — kto czego dotyka

Każda część **tworzy i posiada** swoje katalogi. Inne części te katalogi tylko **czytają** (przez publiczne API: serializery, `services`, `selectors`, hooki). Nie modyfikuj cudzego kodu „przy okazji".

**Backend** (`backend/apps/`):

| Część | Posiada katalog |
|---|---|
| B0 | `core/`, `config/` (szkielet), Docker, `requirements*.txt` |
| B1 | `accounts/` |
| B2 | `dogs/` |
| B3 | `gardens/` |
| B4 | `reservations/` |
| B5 | `payments/` |
| B6 | `invoices/` |
| B7 | `reviews/` |
| B8 | `chat/` |
| B9 | `adminpanel/` |
| B10 | `notifications/` |

**Frontend** (`frontend/src/`):

| Część | Posiada katalog |
|---|---|
| F0 | `shared/`, `app/`, `shared/ui/` (design system) |
| F1 | `features/auth/` |
| F2 | `features/gardens/` (strona główna/katalog) |
| F3 | `features/gardens/` (szczegóły) — koordynuj z F2 |
| F4 | `features/booking/` |
| F5 | `features/reservations/`, `dogs/`, `reviews/`, `account/` |
| F6 | `features/host/` |
| F7 | `features/chat/` |
| F8 | `features/admin/`, `features/static/` |

Jeśli Twoja część potrzebuje zmiany w cudzym katalogu lub w `shared/` — to sygnał, że dotykasz kontraktu współdzielonego → §6.

---

## 3. Pliki współdzielone — najczęstsze źródło konfliktów

Te pliki dotyka **wiele części**. Zasada: **tylko DODAWAJ swoje wpisy, nie usuwaj i nie zmieniaj cudzych**, trzymaj istniejący porządek (alfabetyczny/grupowany), rób minimalne diffy.

- Backend: `config/settings/*.py` (rejestracja appki w `INSTALLED_APPS`), `config/urls.py` (dołączenie swoich `urls`), `config/asgi.py` (routing WS — B8), `requirements*.txt`, `.env.example`.
- Frontend: `package.json`, `app/router.tsx` (dodanie swoich tras), `app/providers.tsx`, `shared/api/schema.d.ts` (generowany!).
- Root: `docker-compose.yml`, `.env.example`.

Przed PR zrób `git pull --rebase origin main` i rozwiąż konflikty w tych plikach lokalnie, świadomie.

---

## 4. Git — workflow

- **Gałąź per część:** `feat/b3-gardens`, `feat/f2-home-search`. Jedna część = jedna gałąź = jeden PR.
- **Commity:** Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`).
- **`main` jest chroniony w praktyce:** żadnych bezpośrednich commitów (poza bootstrapem repo przez właściciela). Zmiany wchodzą przez **PR z min. 1 review** i zielonym CI.
- **Aktualizacja:** `git pull --rebase origin main` przed otwarciem/aktualizacją PR; rozwiązuj konflikty u siebie, nie na `main`.
- **Nigdy** nie commituj: `.env`, `node_modules/`, `media/`, artefaktów build, plików IDE — chroni je `.gitignore` (nie obchodź go `git add -f`).
- **Nigdy** `push --force` na `main` ani na cudzą gałąź. Na własnej gałędzi PR dozwolony `--force-with-lease`.
- Commit message kończ stopką, gdy commit współtworzył agent:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

## 5. Kontrakt FE↔BE jest święty (anty-drift)

Najgroźniejszy rozjazd przy wielu agentach to rozejście się backendu i frontendu. Reguły:

- API: **snake_case**, enumy po angielsku (`confirmed`, `pending_payment`), daty **ISO-8601 z offsetem**. Tłumaczenie na PL robi wyłącznie frontend (mapy etykiet).
- **Po każdej zmianie serializera/endpointu** (backend): wygeneruj schemat i zacommituj go w tym samym PR:
  `python manage.py spectacular --file schema.yaml`
- **Frontend bierze typy tylko z `schema.d.ts`**, generowanego z backendu:
  `npm run gen:api`  (uruchom po aktualizacji `backend/schema.yaml`)
- Pliki **generowane-ale-commitowane** (`backend/schema.yaml`, `frontend/src/shared/api/schema.d.ts`): **nie edytuj ręcznie** — zawsze regeneruj.
- Frontend nie wymyśla pól ani endpointów. Jeśli czegoś brakuje w schemacie → to zmiana kontraktu (§6), nie obejście po stronie FE.

---

## 6. Zmiana kontraktu / modelu / zależności — protokół (KRYTYCZNE)

Sekcje 4 (zależności), 7 (model), 8 (API), 9 (WS) PLAN-u są **współdzielone**. Cicha zmiana w jednej części psuje wszystkich pozostałych.

Jeśli uważasz, że trzeba je zmienić:
1. **STOP** — nie zmieniaj po cichu w ramach swojej części B/F.
2. Otwórz **osobny PR** typu `contract: …`, który aktualizuje `docs/PLAN.md` (+ `schema.yaml`, ewentualnie migrację bazowego modelu).
3. Opisz powód i wpływ; oznacz zespół do review.
4. Po zaakceptowaniu i zmergowaniu — **wszyscy** robią rebase i synchronizują się z nową wersją kontraktu.

To samo dotyczy: zmiany `core.TimeStampedModel`, modelu `accounts.User`, formatu błędów (`code`), stałych biznesowych (`PLATFORM_FEE_PERCENT`, TTL, polityka 24h), nazw enumów.

---

## 7. Migracje bazy danych — anty-konflikt

- Twórz migracje **tylko dla swojej aplikacji**.
- **Jedna spójna migracja na część** — przed PR zsquashuj robocze migracje (usuń je i `makemigrations` od zera dla nowych modeli).
- **Nazywaj migracje:** `python manage.py makemigrations <app> --name <opis>` — żadnych `0002_auto_2026...`.
- **Nigdy nie edytuj już zmergowanej migracji** — twórz nową, korygującą.
- Konflikt numerów po merge (`0003_x` na dwóch gałęziach): rozwiąż **świadomie** przez `makemigrations --merge`, nie ślepo.
- Zmiana `User` lub modeli z `core` = zmiana współdzielona → §6 (bo migracja dotyka wszystkich).
- Rozszerzenia Postgres (`btree_gist` dla antykolizji rezerwacji, sek. 7.4.2) instaluje migracja, nie ręczny SQL na bazie.

---

## 8. Zależności i wersje

- **Backend:** instaluj wyłącznie wersje z `requirements.txt` (PLAN sek. 4.1). Nowa biblioteka = decyzja zespołu (§6). Nie podnoś Django/DRF/Channels samodzielnie.
- **Frontend:** pary wersji są skoordynowane pod React 19 (react-leaflet 5, @stripe/react-stripe-js 3, zod 3 + resolvers 3, Router 7 z importem z `react-router` — **nie** `react-router-dom`, Tailwind 4 z `@theme` — **bez** `tailwind.config.js`). Nie ruszaj majorów.
- `npm ci` musi przechodzić — nie commituj `package-lock.json` rozjechanego z `package.json`.

---

## 9. Architektura i clean code (skrót — pełne w PLAN sek. 6)

- **Backend warstwy:** `views` cienkie → `services.py` (zapisy/logika/transakcje) + `selectors.py` (odczyty z `select_related/prefetch/annotate`). Widoki nie wołają `.filter()` po modelach.
- Funkcje serwisowe: **keyword-only args**, type hints, docstring z sekcją `Raises`. Mutacje wielokrokowe w `@transaction.atomic`.
- Błędy biznesowe: wyjątki z polem `code` (PLAN sek. 6.3). Bez logiki w sygnałach — side effects jawnie w `services`.
- **Cykle importów:** punkty styku z PLAN sek. 17.3 (`gardens.availability` ↔ `reservations`, oraz fasady `payments.gateway` / `notifications.services` / `invoices.services`) — importuj **lazy** (wewnątrz funkcji), nie na top-level.
- **Frontend:** komponenty **nie wołają axiosa** — dane przez hooki React Query w `features/<x>/api.ts`. Każdy widok obsługuje 4 stany: loading / error / empty / success. Komponenty z `shared/ui`, nie ad-hoc.

---

## 10. Konwencje (trzymaj sztywno — inaczej rozjazd)

- **Język:** kod, identyfikatory, komentarze, commity → **angielski**. UI, e-maile, treść błędu `detail` → **polski**. Enumy w API → angielski.
- **Pieniądze:** `Decimal`, **nigdy float**; do Stripe kwoty w groszach (`int(total*100)`); FE formatuje przez `lib/money.ts` (`89,50 zł`).
- **Czas:** `USE_TZ=True`, `Europe/Warsaw`; API przyjmuje/zwraca ISO z offsetem; nie licz slotów na naiwnych datach.
- **Nazewnictwo:** Python/API `snake_case`; komponenty React `PascalCase`; pliki cech FE `kebab`/zgodnie z F0; trasy i ścieżki API po polsku tam, gdzie user-facing (`/ogrody/:id`), API techniczne po angielsku (`/api/v1/gardens/`).

---

## 11. Bramki jakości — must pass przed PR

**Backend (uruchamiaj w Dockerze):**
- `ruff check .` i `ruff format --check .` — czyste
- `pytest` — zielony; progi coverage z PLAN sek. 6.4
- `backend/schema.yaml` zregenerowany, jeśli dotknięto API
- testy obejmują: happy path, 401, 403, 400 walidacja, właściwe 409/410, budżet zapytań dla list

**Frontend:**
- `npm run lint`, `npm run typecheck` (`tsc --noEmit`), `npm run test`, `npm run build` — wszystko zielone
- `npm run gen:api` wykonany, jeśli zmienił się `schema.yaml`; brak `any`

**Wspólne:**
- `docker compose up` wstaje, `GET /api/v1/health/` = 200
- brak `print()` / `console.log` debugowych; brak `TODO` bez numeru części; brak martwego kodu
- `.env.example` zaktualizowany, gdy doszła zmienna; **żadnych sekretów w repo**

---

## 12. Uruchamianie projektu (dev)

- **Backend wyłącznie w Dockerze.** WeasyPrint (faktury PDF) wymaga pakietów systemowych (Pango) — na gołym Windows/macOS bez Dockera nie ruszy. Nie „naprawiaj" tego instalując rzeczy na hoście.
- Start: `cp .env.example .env` → `docker compose up --build` → `docker compose exec backend python manage.py seed_demo`.
- Adresy dev: front `http://localhost:5173`, API docs `http://localhost:8000/api/v1/docs/`, podgląd maili (Mailpit) `http://localhost:8025`.
- Płatności Stripe: tryb testowy, webhook forwardowany przez kontener `stripe-cli`. **Źródłem prawdy o opłaceniu jest webhook**, nie odpowiedź z frontu.

---

## 13. Czego NIE robić

- Nie implementuj funkcji **poza MVP** (PLAN sek. 18): logowanie społ., SMS/Twilio, AWS S3, Celery, i18n, push, geokodowanie. Przyciski „Google/Apple" są tylko wizualne.
- Nie zmieniaj **struktury katalogów** (PLAN sek. 5) ani nie przenoś cudzych plików.
- Nie „refaktoryzuj przy okazji" cudzych części — zgłoś to jako osobne zadanie.
- Nie obchodź kontraktu po stronie frontendu hardkodowaniem pól, których nie ma w schemacie.
- Nie commituj danych testowych z prawdziwymi sekretami/kluczami.

---

## 14. Gdy coś jest niejasne

1. Sprawdź `docs/PLAN.md` (sekcja Twojej części + sekcje wspólne 1–6).
2. Jeśli to wybór implementacyjny bez wpływu na kontrakt — wybierz prostszą opcję zgodną z duchem PLAN-u i **dopisz decyzję do `README.md`** („Decyzje implementacyjne").
3. Jeśli to dotyka kontraktu/modelu/zależności → **§6**, nie zgaduj.
4. Po skończeniu części raportuj: co zrobione, wynik testów/lintu, ewentualne odstępstwa i decyzje.
