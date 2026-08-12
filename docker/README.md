# Running CertPrep with Docker (Local mode)

Run CertPrep on your own machine without installing Node.js. All data stays
local, in a SQLite database stored in a Docker volume.

_This is the minimal Docker documentation for now; it will be merged into the
main README._

## Requirements

- [Docker](https://docs.docker.com/get-docker/) with the Compose plugin
  (included in Docker Desktop).

## Start

```bash
cd docker
docker compose up -d --build
```

Then open <http://localhost:3000>. Database schema is applied automatically on
first start — no extra setup step.

## Stop / restart

```bash
docker compose stop      # stop, keep everything
docker compose start     # start again
docker compose down      # remove the container — your data is kept
docker compose up -d     # recreate; progress is still there
```

Your progress lives in the `certprep-data` named volume, so it survives
restarts, rebuilds and `docker compose down`.

## Update to a new version

```bash
git pull
docker compose up -d --build
```

New database migrations, if any, are applied automatically at startup.

## Reset all data

This permanently deletes your profile, selected certifications and progress:

```bash
docker compose down -v
```

## Change the port

Edit `ports` in `docker-compose.yml`, e.g. `"8080:3000"` to serve on
<http://localhost:8080>.
