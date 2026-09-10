import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const dataDir = join(root, "data");
mkdirSync(dataDir, { recursive: true });
export const db = new DatabaseSync(join(dataDir, "vector.sqlite"));
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`CREATE TABLE IF NOT EXISTS vehicles (id TEXT PRIMARY KEY, model TEXT NOT NULL, battery REAL NOT NULL, range_miles INTEGER NOT NULL, odometer INTEGER NOT NULL, status TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS signals (id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL, title TEXT NOT NULL, priority TEXT NOT NULL, detail TEXT NOT NULL, age TEXT NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS telemetry (id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id TEXT NOT NULL, speed REAL NOT NULL, battery_temp REAL NOT NULL, ambient_temp REAL NOT NULL, state_of_charge REAL NOT NULL, range_miles INTEGER NOT NULL, mode TEXT NOT NULL, event TEXT NOT NULL, recorded_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS diagnostic_sessions (id TEXT PRIMARY KEY, vehicle_id TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL);`);
const now = () => new Date().toISOString();
if (db.prepare("SELECT COUNT(*) AS count FROM vehicles").get().count === 0) {
  const addVehicle = db.prepare("INSERT INTO vehicles VALUES (?, ?, ?, ?, ?, ?, ?)");
  [["V-042", "CHEVROLET SILVERADO EV", 82, 284, 18642, "Online"], ["V-017", "CADILLAC LYRIQ", 64, 191, 22308, "Online"], ["V-008", "GMC HUMMER EV", 71, 246, 14903, "Online"]].forEach((v) => addVehicle.run(...v, now()));
  const addSignal = db.prepare("INSERT INTO signals VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  addSignal.run("SIG-1042", "V-042", "Battery thermal variance", "HIGH", "HV battery pack · Cell group 04", "12 min ago", "open", now());
  addSignal.run("SIG-1017", "V-017", "Front radar calibration", "MEDIUM", "ADAS sensor array · Front fascia", "46 min ago", "open", now());
  addSignal.run("SIG-1008", "V-008", "Tire pressure imbalance", "MEDIUM", "Right rear · 31 PSI detected", "1 hr ago", "open", now());
  db.prepare("INSERT INTO telemetry (vehicle_id, speed, battery_temp, ambient_temp, state_of_charge, range_miles, mode, event, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("V-042", 0, 31.4, 22, 82, 284, "Parked", "Waiting for simulator", now());
}
export const getVehicles = () => db.prepare("SELECT id, model, battery, range_miles AS range, odometer, status FROM vehicles ORDER BY id").all();
export const getSignals = () => db.prepare("SELECT id, vehicle_id AS vehicleId, title, priority, detail, age, state FROM signals ORDER BY CASE priority WHEN 'HIGH' THEN 1 ELSE 2 END, created_at DESC").all();
export const getSimulator = () => { const row = db.prepare("SELECT speed, battery_temp AS batteryTemp, ambient_temp AS ambientTemp, state_of_charge AS stateOfCharge, range_miles AS range, mode, event AS lastEvent, recorded_at AS updatedAt FROM telemetry WHERE vehicle_id = 'V-042' ORDER BY id DESC LIMIT 1").get(); const tick = db.prepare("SELECT COUNT(*) AS count FROM telemetry WHERE vehicle_id = 'V-042'").get().count - 1; return { running: row.mode === "Drive cycle" || row.mode === "Thermal event injected", tick, ...row }; };
export const recordTelemetry = (s) => { const t = now(); db.prepare("INSERT INTO telemetry (vehicle_id, speed, battery_temp, ambient_temp, state_of_charge, range_miles, mode, event, recorded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run("V-042", s.speed, s.batteryTemp, s.ambientTemp, s.stateOfCharge, s.range, s.mode, s.lastEvent, t); db.prepare("UPDATE vehicles SET battery = ?, range_miles = ?, updated_at = ? WHERE id = 'V-042'").run(s.stateOfCharge, s.range, t); return getSimulator(); };
export const startDiagnostic = (vehicleId) => { const session = { id: `DX-${Date.now()}`, vehicleId, startedAt: now(), status: "running" }; db.prepare("INSERT INTO diagnostic_sessions VALUES (?, ?, ?, ?)").run(session.id, session.vehicleId, session.status, session.startedAt); return session; };
export const markThermalSignal = () => db.prepare("UPDATE signals SET age = 'just now' WHERE id = 'SIG-1042'").run();
export const getDashboard = () => { const vehicles = getVehicles(); const signals = getSignals(); const simulator = getSimulator(); return { fleet: { health: 98.4, efficiency: 3.8, openSignals: signals.filter((s) => s.state === "open").length, online: vehicles.length + 9, lastSync: new Date(simulator.updatedAt).toLocaleTimeString("en-US", { hour12: false }) }, vehicles, signals, simulator, validation: { model: { label: "Battery thermal model", status: "PASS", detail: "Executable requirement · 142 checks" }, virtual: { label: "Virtual integration", status: "PASS", detail: "HPC + zone controller · 38 scenarios" }, release: { label: "Release gate", status: "READY", detail: "Traceability 96% · CI build #1842" } } }; };
