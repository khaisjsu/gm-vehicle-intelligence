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

The frontend fetches dashboard data from `GET /api/dashboard` and starts a live diagnostic session through `POST /api/vehicles/:id/diagnose`. The backend persists vehicle state and telemetry in SQLite.

The dashboard also includes a model-based delivery lane inspired by the supplied MathWorks white paper. It represents the shift-left workflow from executable model, through virtual integration tests, to a traceable CI release gate. See `docs/MODEL_BASED_DESIGN.md` for the mapping.

The dashboard also includes a controllable simulated Silverado EV. Start and pause a drive cycle, watch telemetry change live, inject a battery thermal event, and start a diagnostic session. See `docs/SIMULATOR.md` for the complete architecture and API details.

Vehicle and telemetry data are persisted in SQLite. See `docs/DATABASE.md` for the schema and persistence behavior.

## Publish online

This repository includes `render.yaml` for deployment on Render. Create a new Web Service from the GitHub repository, or use Render Blueprint deployment to read the configuration automatically. The service uses `npm install` to build and `npm start` to run the frontend and backend together.

The `/api/health` endpoint can be used as a deployment health check. The local SQLite database is suitable for a portfolio prototype; use a managed database or persistent disk before relying on the app for production records.

The dashboard is protected by registration, salted scrypt password hashing, server-side sessions, generic login errors, logout, and login rate limiting. See `docs/AUTHENTICATION.md` for the security design.
