# Vector Database

Vector now persists vehicle data in SQLite at `data/vector.sqlite`. The database is created automatically when the server starts, and seeded with the demo fleet on first run.

## Tables

| Table | Purpose |
| --- | --- |
| `vehicles` | Current vehicle identity, battery, range, odometer, and connection status |
| `signals` | Active vehicle health signals and severity |
| `telemetry` | Time-series snapshots from the simulated vehicle |
| `diagnostic_sessions` | Diagnostic sessions started by an operator |

## Persistence behavior

- `POST /api/simulator/tick` appends a telemetry row.
- Vehicle battery and range are updated from the latest telemetry snapshot.
- `POST /api/vehicles/:id/diagnose` saves a diagnostic session.
- `POST /api/simulator/thermal-event` updates the stored high-priority signal.
- `GET /api/telemetry/history` returns the latest 50 snapshots for V-042.
- Restarting the server preserves the SQLite file and telemetry history.

The SQLite file is ignored by Git so local runtime data is not committed to GitHub. For production, the same data-access boundary can move to a managed PostgreSQL or time-series database without changing the dashboard API contract.
