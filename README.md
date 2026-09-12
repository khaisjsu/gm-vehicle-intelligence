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

GitHub Actions runs the database tests on pushes and pull requests. Render is configured to deploy after CI checks pass.

The dashboard is protected by registration, salted scrypt password hashing, server-side sessions, generic login errors, logout, and login rate limiting. See `docs/AUTHENTICATION.md` for the security design.

## AI engineering project

This repository also includes `apps/trace-rag-lab/`, a standalone RAG workbench demonstrating hybrid retrieval, deterministic embeddings, document ingestion, grounded answers, evaluation metrics, feedback, observability, and access-controlled knowledge. Run it independently with `cd apps/trace-rag-lab && npm start`, then open `http://localhost:4175`.

Render deploys the RAG workbench as a second web service named `trace-rag-lab`, using `ai-rag-eval-lab` as its root directory and `/api/health` for health checks. The free plan filesystem is ephemeral, so use a persistent disk or managed database before treating uploaded documents and feedback as durable production data.

The main dashboard also includes `native/thermal_guard.cpp`, a deterministic C++17 safety boundary for battery temperature decisions. Render and CI compile it with `npm run build:native`; the dashboard calls it through `/api/native/thermal-check` and falls back to equivalent JavaScript logic if the native binary is unavailable. Use the **Safety boundary running in C++** panel to try a temperature reading in the live demo.
