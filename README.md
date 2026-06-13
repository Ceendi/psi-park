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
- **B2:** `Dog.health_status` liczone w `dogs/services.py` (próg `HEALTH_EXPIRING_DAYS=30`), nie na modelu (PLAN 7.2). Status ogólny to „najgorszy" ze szczepień i odrobaczania (severity: `expired` > `expiring_soon` > `unknown` > `valid`). Serializer wystawia też `vaccinations_status` i `deworming_status`, by front pokolorował każdą pozycję osobno (mockup „Moi pupile") — logika progów zostaje po stronie BE, nie w szablonie.
- **B2:** `age_label` to property modelu zwracające polską etykietę wieku (np. „3 lata", „5 miesięcy"), zgodnie z PLAN 7.2; surowe `birth_date` jest również w API, więc front ma dane do własnego formatowania. Odmianę liczebników obsługuje helper `_pl_plural`.
- **B2:** Pies ma jedno pole `photo` (brak osobnej miniatury, inaczej niż `GardenPhoto`); upload przechodzi przez `core.images.process_upload` i zapisuje skompresowany obraz (≤1920 px). Błędy rozmiaru/MIME (Pillow) tłumaczone na 400 `{"photo": [...]}`.
- **B2:** Dostęp do cudzego psa zwraca **404** (nie 403) — prywatność/anty-enumeracja; własność egzekwuje selektor `owned_dogs` (zawężenie do właściciela), rolę — `IsClient`. Macierz testów: 401 (brak auth) / 403 (host) / 404 (obcy zasób).
- **B2:** Usunięcie psa z rezerwacjami blokuje **FK `Reservation.dog` PROTECT** (PLAN 7.4): `delete_dog` łapie `ProtectedError` → `DogHasReservations` (409, code `dog_has_reservations`). Rozwiązanie nie wymaga znajomości API B4 (martwe do czasu B4); kod błędu nie figuruje w tabeli 6.3 — do ewentualnego dodania do kontraktu w razie potrzeby (§6).
- **B2:** Listy/szczegóły psów używają generyków DRF (pierwszy endpoint listowy), ale zapisy idą przez `services`; `PUT` wyłączony (kontrakt zna tylko `PATCH`). Upload zdjęcia to osobny `APIView` (multipart) → poprawny, paginowany schemat (`PaginatedDogListList`).
- **B2:** `seed_demo` zyskał krok `_seed_dogs`: tworzy demo-klientkę „Katarzyna Nowak" (`katarzyna@psipark.local` / `klient12345`) jako właścicielkę psów (brak innego seeda klienta), idempotentnie (`get_or_create`), oraz Łatę i Borysa z datami zdrowia rozłożonymi na `valid/expiring_soon/expired` (pokaz badge'y). Kolejne części reużywają klientki po e-mailu.
- **B3:** Publiczny `GET /gardens/{id}/` jest **świadomy roli**: anonim/obcy widzą tylko `approved+active` (inaczej 404), właściciel widzi też własny ogród w każdym statusie (podgląd `pending`), admin — wszystko. Realizuje to selektor `visible_gardens(user)`. Publiczna **lista** pozostaje wyłącznie `approved+active`; swoje ogrody host ogląda przez `/host/gardens/`.
- **B3:** Reguła reweryfikacji (PLAN 8.2): edycja **lokalizacji** (`city/address/latitude/longitude`) na ogrodzie `approved` cofa go do `pending` i czyści `rejection_reason`; dodanie/usunięcie **zdjęcia** też (PLAN: „zmiana lokalizacji/zdjęć → pending"). Zmiana ceny/godzin/udogodnień oraz **zmiana kolejności zdjęć** (kosmetyczna) **nie** wymuszają reweryfikacji. Porównujemy realną zmianę wartości, więc PATCH tym samym miastem nie ruszy statusu.
- **B3:** Agregaty ocen (`rating_avg`/`rating_count`) są **anotowane** w selektorze (nigdy per-obiekt, PLAN 6.2). Model `reviews` powstaje w B7 — do tego czasu relacja `reviews` nie istnieje, więc selektor wykrywa to (`_reviews_relation_installed`) i degraduje do `rating_avg=None`, `rating_count=0` (sort `-rating_avg` nie wywala się). Endpoint `GET /gardens/{id}/reviews/` z tabeli 8.2 **świadomie odłożony do B7**: wymaga modelu i serializera recenzji (własność B7), a jego kształt JSON nie jest ustalony w 8.3 — wpisanie go tu oznaczałoby wymyślanie kontraktu (§6, PLAN 1.2.1).
- **B3:** `GET /gardens/{id}/availability/` liczy sloty pełnogodzinne z okna otwarcia minus kolizje. Właścicielem reguły kolizji jest `reservations` (B4, PLAN 7.4.2) — `availability` woła **leniwie** `reservations.selectors.busy_intervals(garden, date_range=(start, end))`; dopóki B4 nie istnieje, import się nie udaje i ogród jest w całości wolny. Daty liczone strefowo (`Europe/Warsaw`, `make_aware`) — poprawnie pod DST (PLAN AD-15).
- **B3:** Filtry listy (PLAN 8.2): `city` → `icontains` (działa i dla selektora miasta, i dla wpisywania); `max_dogs` → „ogród przyjmuje **co najmniej** N psów" (`max_dogs >= N`); `amenities` (CSV) → JSON `contains` (wszystkie wymagane); `in_bbox=minLng,minLat,maxLng,maxLat` → zakres współrzędnych (błędny bbox ignorowany). `time_from`/`time_to` filtrują po godzinach otwarcia; `date` jest **przyjmowana i walidowana**, ale filtrowanie kolizyjne per-ogród na liście rozsadziłoby budżet zapytań i należy do B4 — dokładną dostępność daje endpoint availability. Każdy filtr = jeden predykat SQL (budżet listy ≤6).
- **B3:** Enumy w API pozostają **angielskie** (PLAN 1.2.3): `amenities` to lista kodów (`["pool","water"]`), a w szczegółach dochodzi **read-only** `amenities_display` = `[{code,label}]` z polskimi etykietami z `Amenity.choices`. To nie łamie reguły „enum po angielsku" (wartością enuma jest kod), a daje frontowi kanoniczny katalog etykiet z backendu (anty-dryf), zamiast utrzymywać równoległą mapę.
- **B3:** `DELETE /host/gardens/{id}/` próbuje twardego usunięcia; gdy `PROTECT` (rezerwacje, B4) zablokuje — robi **miękką dezaktywację** (`is_active=False`), by zachować dokumenty księgowe (PLAN 8.2). Do czasu B4 zawsze usuwa twardo. Reguła „blokady przy przyszłych rezerwacjach" dopnie B4 (jest właścicielem rezerwacji).
- **B3:** `PATCH /host/gardens/{id}/photos/reorder/` przyjmuje `{"photo_ids":[...]}` (pełna lista id zdjęć ogrodu, pierwszy = okładka) — kształt prostszy i lepiej typowany w OpenAPI niż gołe `[...]` z 8.2; walidacja wymaga dokładnie identyfikatorów tego ogrodu.
- **B3:** `seed_demo` zyskał `_seed_gardens`: 3 gospodarzy (w tym zweryfikowana „Magda Krawczyk", hasło `gospodarz12345`) i 6 krakowskich ogrodów z realnymi współrzędnymi — 4 `approved`, 1 `pending` (kolejka admina), 1 `rejected`. **Bez zdjęć** — tak jak `_seed_dogs` (spójność + `seed_demo` nie zapisuje do realnego wolumenu media w testach seeda innych części, które nie przekierowują `MEDIA_ROOT`); zdjęcia wgrywa się przez API, a katalog/okładka obsługują ogrody bez zdjęć (`cover_image=null`).
