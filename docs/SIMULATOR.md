# Simulated Vehicle: Full Implementation Detail

Vector now includes a controllable virtual Chevrolet Silverado EV (`V-042`). It is deliberately small and transparent so it can demonstrate a connected-vehicle architecture without pretending to be production vehicle-control software.

## Architecture

```text
Browser UI
  │  GET /api/dashboard
  │  GET /api/simulator
  │  POST /api/simulator/{start|stop|tick|thermal-event}
  ▼
Node.js HTTP server
  │
  ▼
In-memory simulator state
  ├─ speed
  ├─ battery temperature
  ├─ state of charge
  ├─ estimated range
  ├─ drive mode
  └─ last telemetry event
```

## How the simulation works

1. The browser polls `POST /api/simulator/tick` every 1.5 seconds.
2. If the simulation is running, the server advances the drive cycle.
3. Vehicle speed follows a small sine-wave pattern to feel like a changing drive cycle.
4. Battery temperature changes with bounded random noise.
5. State of charge slowly decreases.
6. Estimated range is derived from state of charge.
7. The UI re-renders telemetry values without a page refresh.

## Interactive scenarios

- **Start drive cycle**: sets the simulated vehicle to `Drive cycle` and begins telemetry changes.
- **Pause**: returns the vehicle to `Parked` and holds its values.
- **Inject thermal event**: sets battery temperature to 47.8°C, changes the vehicle mode, and marks the event as a controlled thermal variance.
- **Diagnose now**: starts a diagnostic session through `POST /api/vehicles/V-042/diagnose`.

## API endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/dashboard` | Fleet, vehicle, signal, validation, and simulator snapshot |
| GET | `/api/simulator` | Current simulator state |
| POST | `/api/simulator/start` | Start a drive cycle |
| POST | `/api/simulator/stop` | Pause the drive cycle |
| POST | `/api/simulator/tick` | Advance and return one telemetry tick |
| POST | `/api/simulator/thermal-event` | Inject a deterministic high-temperature event |
| POST | `/api/vehicles/:id/diagnose` | Create a diagnostic session for a vehicle |

## Production path

For a production-quality implementation, replace the in-memory state with a vehicle-data adapter, persist telemetry in a time-series store, authenticate vehicle and operator identity, add signed commands, and connect the model and verification steps to real CI evidence. The simulator is intentionally isolated behind API boundaries so those changes can happen without redesigning the frontend.
