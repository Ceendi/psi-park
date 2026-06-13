<!-- Tytuł PR wg Conventional Commits, np. "feat(b3): gardens catalog API" -->

## Część
<!-- Którą część z docs/PLAN.md realizuje ten PR? np. B3 / F2. Zasada: jedna część = jeden PR. -->
Część:

## Co zmienia
<!-- Zwięzły opis zakresu. Ma być zgodny z sekcją 15.x / 16.x PLAN-u — nic ponad zakres części. -->


## Jak przetestowano
<!-- Komendy i wynik. Backend uruchamiany w Dockerze. -->


---

## Checklista zgodności (CLAUDE.md + PLAN Załącznik B)

**Zakres i kontrakt**
- [ ] Zakres zgodny z sekcją 15.x / 16.x PLAN-u — nic ponad zakres części
- [ ] Model danych zgodny z sekcją 7 (bez samowolnych pól / tabel)
- [ ] Endpointy i kształty zgodne z sekcją 8 (lub protokół WS z sekcji 9)
- [ ] Nie zmieniam współdzielonego kontraktu po cichu — jeśli trzeba, osobny PR `contract:` (CLAUDE.md §6)
- [ ] Dotykam tylko katalogów swojej części (CLAUDE.md §2); w plikach współdzielonych tylko dodaję wpisy (§3)

**Architektura / clean code**
- [ ] `views` cienkie → `services` (zapisy) + `selectors` (odczyty) (PLAN 6.2)
- [ ] Funkcje serwisowe: argumenty keyword-only, type hints, docstring z sekcją `Raises`
- [ ] Błędy biznesowe jako wyjątki z polem `code` (PLAN 6.3)
- [ ] Frontend: dane przez hooki React Query (komponenty nie wołają axiosa); obsłużone 4 stany widoku

**Zależności / konwencje**
- [ ] Brak nowych zależności spoza sekcji 4; brak podbijania wersji major
- [ ] Teksty PL, enumy EN; pieniądze `Decimal` / `formatPLN`; czas z offsetem (CLAUDE.md §10)
- [ ] Migracje: jedna nazwana migracja dla mojej aplikacji (CLAUDE.md §7)

**Jakość (bramki CI)**
- [ ] Backend: `ruff check` + `ruff format --check` + `pytest` zielone; progi coverage (PLAN 6.4)
- [ ] `backend/schema.yaml` zregenerowany, jeśli zmieniono API
- [ ] Frontend: `lint` + `typecheck` + `test` + `build` zielone; `gen:api` jeśli zmienił się schemat; typy z `schema.d.ts`
- [ ] `.env.example` zaktualizowany; brak sekretów w repo; brak `print` / `console.log` / `TODO` bez numeru części
- [ ] Notka decyzji w `README.md` (jeśli był wybór implementacyjny)
