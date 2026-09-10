# Vector / Vehicle Intelligence

An automotive software portfolio concept for fleet health, live vehicle telemetry, and service operations.

## Why this project

Vector is designed to demonstrate product thinking relevant to connected vehicles:

- prioritizes safety-critical signals without overwhelming the operator
- makes vehicle health legible at a glance
- connects telemetry to a human service workflow
- uses a dark, high-contrast interface suited to technical operations

## Run locally

Run the full-stack prototype from this folder:

```bash
npm start
```

Then open `http://localhost:4173`.

The frontend fetches dashboard data from `GET /api/dashboard` and starts a live diagnostic session through `POST /api/vehicles/:id/diagnose`. The backend stores the in-memory prototype state and can later be replaced with PostgreSQL, SQLite, or a cloud vehicle-data service.

The dashboard also includes a model-based delivery lane inspired by the supplied MathWorks white paper. It represents the shift-left workflow from executable model, through virtual integration tests, to a traceable CI release gate. See `docs/MODEL_BASED_DESIGN.md` for the mapping.
