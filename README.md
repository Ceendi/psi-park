# PsiPark

Marketplace wynajmu prywatnych, ogrodzonych ogrodów dla psów na godziny (Polska, PLN).
Backend: Django 5.2 + DRF + Channels. Frontend: React 19 + Vite (osobna aplikacja).

## Wymagania

- Docker + Docker Compose (backend uruchamiany **wyłącznie** w Dockerze — WeasyPrint wymaga bibliotek systemowych).

## Quickstart

```bash
cp .env.example .env
docker compose up --build
docker compose exec backend python manage.py seed_demo   # tworzy konto admina
```

Po starcie:

| Co                      | Adres                                |
| ----------------------- | ------------------------------------ |
| API (health)            | http://localhost:8000/api/v1/health/ |
| Swagger UI (DEBUG)      | http://localhost:8000/api/v1/docs/   |
| Django Admin            | http://localhost:8000/admin/         |
| Mailpit (podgląd maili) | http://localhost:8025                |
| Frontend (po F0)        | http://localhost:5173                |

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
