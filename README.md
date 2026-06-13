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
- **B4:** **Antykolizja dwuwarstwowa (PLAN 7.4.2), ale warstwa DB obejmuje tylko statusy „zatwierdzone"** `{awaiting_host, confirmed}`. Warunek `ExclusionConstraint` (btree_gist, `tstzrange(start,end,'[)')`) musi być funkcją samego wiersza — `expires_at > now()` jest zależne od czasu i nie da się go w nim wyrazić; objęcie `pending_payment` bezwarunkowo blokowałoby slot przez wygasłe-niesprzątnięte rezerwacje, łamiąc leniwe wygasanie (AD-11). Dlatego holdy `pending_payment` egzekwuje **warstwa serwisowa**: `create_reservation` bierze `select_for_update` na ogrodzie (serializuje równoległe rezerwacje tego ogrodu), a `has_collision`/`busy_intervals` liczą pending tylko z `expires_at > now`. Slot zwalnia się więc o TTL bez sprzątania, a constraint DB to twardy backstop dla rezerwacji już opłaconych/zaakceptowanych (gdzie kolizja byłaby katastrofą). Test dowodzi obu warstw (serwis → 409 `slot_unavailable`, DB → `IntegrityError`).
- **B4:** **`busy_intervals(*, garden, date_range)` to kontrakt seam-u z B3** (PLAN 15-B3): `reservations` jest właścicielem reguły kolizji, a `gardens.availability` woła go leniwie. Zwraca okna `(start, end)` aktywnych rezerwacji (`awaiting_host`/`confirmed` + `pending_payment` z `expires_at > now`). Test integracyjny w B4 potwierdza, że realna rezerwacja zaciemnia slot w `gardens.availability`.
- **B4:** **Migracja `0001` instaluje `btree_gist`** (`BtreeGistExtension`) przed dodaniem constraintu; dodano `django.contrib.postgres` do `INSTALLED_APPS` (jedyna część używająca constraintów/typów zakresowych Postgresa) — zmiana **wyłącznie addytywna** (CLAUDE.md §3). FK `Reservation.{client,garden,dog}` są `PROTECT`, co **automatycznie aktywuje** odłożone ścieżki `ProtectedError` w `dogs.services.delete_dog` (→ `DogHasReservations` 409) i `gardens.services.delete_garden` (→ miękka dezaktywacja) — bez dotykania kodu B2/B3.
- **B4:** **Maszyna stanów (PLAN 7.4.1) w jednej bramce** `services.transition(*, reservation, target)` — pilnuje dozwolonych krawędzi (inaczej `InvalidStateTransition` 409 `reservation_state_invalid`) i stempluje znaczniki (`paid_at`+czyści `expires_at` przy `awaiting_host`; `decided_at`; `cancelled_at`). `accept`/`reject`/`cancel` obudowują ją o efekty uboczne. Decyzje hosta i anulowanie ładują rezerwację z `select_for_update` zawężoną do właściciela (obcy zasób → 404, prywatność PLAN 11).
- **B4:** **Polityka zwrotów (AD-5):** `pending_payment` → bez zwrotu (nic nie pobrano); `awaiting_host` → zwrot; `confirmed` → zwrot tylko, gdy `now ≤ start − FREE_CANCELLATION_HOURS` (inaczej host zachowuje przychód). `POST /reservations/{id}/cancel/` zwraca `{refunded: bool, reservation: {...}}`. **Refund idzie przez leniwą fasadę `payments.services.refund_if_paid`** — do czasu B5 import się nie udaje i jest to no-op (w B4 nic nie jest realnie pobierane); `reject`/`cancel` działają mimo to.
- **B4:** **Hooki maili** (kontekst wg B10: odbiorca jako `user`, domena jako `reservation`/`garden`): create → `reservation_created` do hosta; accept → `reservation_accepted` do klienta; reject → `reservation_rejected` (+`reason`) do klienta; cancel klienta → `reservation_cancelled` (+flaga `refunded`) **do hosta** (szablon „do drugiej strony"). Wysyłka synchronicznie w serwisie (jak B1), w `@transaction.atomic`.
- **B4:** **Widoczność i taby:** host (`/host/reservations/`) widzi **tylko opłacone** rezerwacje swoich ogrodów (`paid_at` ustawione) — nie widzi porzuconych, nieopłaconych prób klienta. `status_group` klienta = `upcoming`/`completed`/`cancelled`; hosta = `pending`/`accepted`/`completed`/`cancelled` (rozłączne, oparte o status + `end_time` vs teraz). Nieznany `status_group` → 400.
- **B4:** **`GET /host/stats/`**: `total_earnings` = suma `subtotal` (część gospodarza, bez prowizji) po `confirmed`; liczniki pending/upcoming/completed; `rating_avg` anotowane z recenzji ogrodów hosta, **degraduje do `None` do czasu B7** (ta sama reguła co agregaty w `gardens`). `GET /host/schedule/?from=&to=&garden=` zwraca tylko rezerwacje zajmujące kalendarz (`awaiting_host`/`confirmed`) w oknie dni włącznie.
- **B4:** **Walidacja okna** (pełne godziny zegarowe, jeden dzień, przyszłość, w godzinach otwarcia, ≥ `min_booking_hours`, `dogs_count` ≤ `max_dogs`) liczona **strefowo** (`localtime`, DST-safe, AD-15) → 400 z kluczem pola. Szczepienia psa muszą być ważne **na dzień wizyty** → `DogVaccinationRequired` (400 `dog_vaccination_required`). `expires_at = now + RESERVATION_PAYMENT_TTL_MINUTES`; komenda `cleanup_expired_reservations` (AD-11) kasuje wygasłe holdy — poprawność slotów od niej nie zależy. Eksport `GET /reservations/export.csv` z BOM-em UTF-8 (polskie znaki w Excelu).
- **B4 — świadomie poza zakresem (15-B4):** (1) kolizyjne filtrowanie `date` na **liście** ogrodów pozostaje pass-through B3 — wymaga zmiany w `gardens/filters.py` (cudza część) i nie ma go w zakresie 15-B4; dokładną dostępność daje endpoint `availability` zasilany moim `busy_intervals`. (2) Zaostrzona reguła „blokuj usunięcie ogrodu/psa, gdy istnieją **przyszłe** rezerwacje" — `PROTECT` już zachowuje historię (miękka dezaktywacja / 409), a wariant „tylko przyszłe" dotykałby plików B2/B3. (3) `reservation_paid` (mail + faktura przy `payment_intent.succeeded`) należy do B5/B6.
- **Frontend / Design (przed F0):** zaimportowano **handoff Claude Design** do `docs/design/` (9 prototypów HTML + `chats/` z intencjami) — to **wizualne źródło prawdy** dla części FE. `docs/PLAN.md` §16 zsynchronizowany z handoffem: tokeny §16.1 są **1:1 z designem** (primary zieleń `#2E7D32`/green-700, ciepła biel tła `#FAFFFA`, tekst `#1B1B1B`, Inter + **JetBrains Mono**, skala promieni 6–28 px + pill, 3 poziomy cieni, akcenty clay/sun, fokus Stripe `#635BFF`) — wcześniejsze wartości były placeholderami. Dodano mapowanie ekran→część (§16.1.1), buttony **pill** 4×3, oraz ustalono **płatność tylko kartą** (Stripe PaymentElement; pierwotny wybór BLIK/P24/Apple/Google Pay świadomie usunięty — decyzja właściciela z transkryptu). Do `package.json` (PLAN §4.2) dopisano `@fontsource-variable/jetbrains-mono` (addytywna zależność FE — **zaakceptowana przez właściciela**; cel: UI w 100% zgodne z Claude Design). **Bez zmian w kontrakcie API/modelu (§7/§8)** — to wyłącznie aktualizacja warstwy prezentacji FE.
