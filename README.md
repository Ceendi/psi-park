# PsiPark

Marketplace wynajmu prywatnych, ogrodzonych ogrodów dla psów na godziny (Polska, PLN).
Backend: Django 5.2 + DRF + Channels. Frontend: React 19 + Vite (osobna aplikacja).

- **Pełna specyfikacja:** [`docs/PLAN.md`](docs/PLAN.md)
- **Zasady pracy zespołowej / agentowej:** [`CLAUDE.md`](CLAUDE.md)

## Wymagania

- Docker + Docker Compose (backend uruchamiany **wyłącznie** w Dockerze — WeasyPrint wymaga bibliotek systemowych).

## Quickstart

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend python manage.py seed_demo   # tworzy konto admina
```

Po starcie:

| Co | Adres |
|---|---|
| API (health) | http://localhost:8000/api/v1/health/ |
| Swagger UI (DEBUG) | http://localhost:8000/api/v1/docs/ |
| Django Admin | http://localhost:8000/admin/ |
| Mailpit (podgląd maili) | http://localhost:8025 |
| Frontend (po F0) | http://localhost:5173 |

## Usługi Compose

`db` (Postgres 17), `redis` (7), `mailpit`, `backend`. Dwie usługi są za profilami i startują dopiero, gdy będą potrzebne:

```bash
docker compose --profile frontend up   # gdy powstanie frontend/ (część F0)
docker compose --profile stripe up      # forwarder webhooków Stripe (część B5)
```

## Częste komendy

```bash
docker compose exec backend pytest                       # testy + coverage
docker compose exec backend ruff check .                 # lint
docker compose exec backend ruff format .                # formatowanie
docker compose exec backend python manage.py makemigrations
docker compose exec backend python manage.py spectacular --file schema.yaml   # regeneracja schematu OpenAPI
```

## Decyzje implementacyjne

Log świadomych wyborów wykraczających poza literalny zapis PLAN-u (uzupełniany przez kolejne części):

- **B0:** usługi `frontend` i `stripe-cli` zdefiniowane w `docker-compose.yml`, ale za profilami (`frontend`, `stripe`) — dzięki temu `docker compose up` w fazie szkieletu podnosi sam stos backendu bez błędów (brak jeszcze `frontend/` i kluczy Stripe).
- **B0:** `accounts.User` utworzony od razu w docelowym kształcie (PLAN 7.1), aby uniknąć bolesnej migracji modelu użytkownika w B1; API uwierzytelniania dostarcza B1.
- **B0:** próg pokrycia testами ustawiony na 70% jako baza szkieletu; docelowo rośnie ku 75%+ wraz z logiką w kolejnych częściach (PLAN 6.4).
- **B1:** minimalna fasada `apps/notifications/services.send(template_key, *, to, context)` utworzona już w B1 (sygnatura wg PLAN 10.2/17.3), bo B1 musi wysyłać maile `welcome` i `password_reset`, a DoD wymaga maili w Mailpit. Rejestr `TEMPLATES` zawiera tylko te dwa klucze; **część B10 rozbudowuje go o pozostałe szablony bez zmiany sygnatury** (PLAN 17.3 zakładał stub z B0 — B1 dostarcza jego minimalną, działającą wersję, by nie wysyłać maili z pominięciem fasady, PLAN 6.1).
- **B1:** link resetu hasła prowadzi na trasę frontu `${FRONTEND_BASE_URL}/reset-hasla?uid=<uid>&token=<token>` (uid = base64 PK, token = `default_token_generator`). Ostateczną ścieżkę/ekran dostarcza część F1; backend przyjmuje `uid`+`token` w `POST /auth/password/reset/confirm/`.
- **B1:** `DELETE /me/` realizuje RODO przez **anonimizację w miejscu** (scrub PII + `is_active=False` + unusable password + blacklista refresh tokenów), nie fizyczne usunięcie wiersza — bo rezerwacje/faktury (dokumenty księgowe) muszą zostać zachowane (PLAN 11).
- **B1:** w `config/settings/test.py` stawki throttlingu nie są pustym słownikiem, lecz bardzo wysokie (`100000/min`) — `ScopedRateThrottle` rzuca `ImproperlyConfigured` przy nieznanym scope, więc scope `auth` musi istnieć; test throttlingu obniża `auth` lokalnie przez `override_settings`.
- **B10:** `send()` zyskał opcjonalny argument `attachments` (dodatek wstecznie zgodny — istniejące wywołania `send(key, to=…, context=…)` działają bez zmian) wyłącznie po to, by zrealizować wymóg „faktura PDF w `reservation_paid`" (PLAN 10.2). Helper `invoice_pdf_attachment(*, number, pdf)` buduje krotkę `(filename, content, mimetype)` i jest **odsprzężony od `invoices.Invoice`** (B10 zależy tylko od B0) — B5/B6 przekazują gotowy PDF (bajty lub `FieldFile`) i numer; slashe w numerze zamieniane na `_` w nazwie pliku.
- **B10:** kontrakt kontekstu nowych szablonów: odbiorcę przekazujemy jako `user`, a dane domenowe jako `reservation` / `garden`. Pola czytane są **kaczo** (`{{ reservation.garden.title }}`), więc działają zarówno z instancjami modeli (B4/B5/B9), jak i ze słownikami (testy B10). Kwoty i daty formatuje szablon (wbudowana lokalizacja PL Django + filtr `|date`), nie każdy wołający — mniej powielania.
- **B10:** wspólna, brandowana stopka (`emails/_footer.html|txt`, dołączana przez nowe szablony) niesie dane platformy i disclaimer „platforma nie odpowiada za szkody wyrządzone pupilowi" (PLAN 11). Dwa szablony z B1 (`welcome`, `password_reset`) pozostawione bez zmian, by nie ryzykować regresji ich testów.
- **B10:** `reservation_cancelled` to jeden szablon „do drugiej strony" (przy anulowaniu przez klienta trafia do gospodarza), z opcjonalną flagą `refunded`; `reservation_rejected` i `garden_rejected` przyjmują opcjonalny `reason`. `notifications` nie dodaje endpointów ani modeli — `backend/schema.yaml` bez zmian.
