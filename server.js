import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { db, getDashboard, getSimulator, getVehicles, markThermalSignal, recordTelemetry, startDiagnostic } from "./db.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
let simulator = getSimulator();
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }); res.end(JSON.stringify(body)); };

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/dashboard") return json(res, 200, getDashboard());
  if (req.method === "GET" && url.pathname === "/api/simulator") return json(res, 200, getSimulator());
  if (req.method === "GET" && url.pathname.startsWith("/api/vehicles/")) { const vehicle = getVehicles().find((item) => item.id === url.pathname.split("/").pop()); return vehicle ? json(res, 200, vehicle) : json(res, 404, { error: "Vehicle not found" }); }
  if (req.method === "POST" && url.pathname.endsWith("/diagnose")) { const vehicleId = url.pathname.split("/")[3]; if (!getVehicles().some((item) => item.id === vehicleId)) return json(res, 404, { error: "Vehicle not found" }); const session = startDiagnostic(vehicleId); return json(res, 201, { session, message: `Diagnostic session started for ${vehicleId}` }); }
  if (req.method === "POST" && url.pathname === "/api/simulator/start") { simulator = { ...simulator, running: true, mode: "Drive cycle", lastEvent: "Drive cycle started" }; return json(res, 200, recordTelemetry(simulator)); }
  if (req.method === "POST" && url.pathname === "/api/simulator/stop") { simulator = { ...simulator, running: false, speed: 0, mode: "Parked", lastEvent: "Drive cycle paused" }; return json(res, 200, recordTelemetry(simulator)); }
  if (req.method === "POST" && url.pathname === "/api/simulator/thermal-event") { simulator = { ...simulator, running: true, mode: "Thermal event injected", batteryTemp: 47.8, lastEvent: "Thermal variance injected into cell group 04" }; markThermalSignal(); return json(res, 200, recordTelemetry(simulator)); }
  if (req.method === "POST" && url.pathname === "/api/simulator/tick") { simulator = getSimulator(); simulator.tick += 1; if (simulator.running) { simulator.speed = Math.round(38 + Math.sin(simulator.tick / 2) * 12); simulator.batteryTemp = Math.max(29, Math.min(48, simulator.batteryTemp + (Math.random() - 0.52) * 1.8)); simulator.stateOfCharge = Math.max(12, simulator.stateOfCharge - 0.03); simulator.range = Math.round(simulator.stateOfCharge * 3.45); simulator.lastEvent = simulator.batteryTemp > 42 ? "Thermal threshold exceeded" : "Telemetry heartbeat received"; simulator.mode = simulator.batteryTemp > 42 ? "Thermal event injected" : "Drive cycle"; recordTelemetry(simulator); } return json(res, 200, getSimulator()); }
  if (req.method === "GET" && url.pathname === "/api/telemetry/history") { const history = db.prepare("SELECT speed, battery_temp AS batteryTemp, state_of_charge AS stateOfCharge, range_miles AS range, mode, event, recorded_at AS recordedAt FROM telemetry WHERE vehicle_id = 'V-042' ORDER BY id DESC LIMIT 50").all(); return json(res, 200, history.reverse()); }
  return json(res, 404, { error: "API route not found" });
}

async function serveStatic(req, res, url) { const requested = url.pathname === "/" ? "/index.html" : url.pathname; const filePath = normalize(join(root, requested)); if (!filePath.startsWith(root)) return json(res, 403, { error: "Forbidden" }); try { const content = await readFile(filePath); const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }; res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" }); res.end(content); } catch { json(res, 404, { error: "Not found" }); } }
createServer(async (req, res) => { const url = new URL(req.url, `http://${req.headers.host}`); if (url.pathname.startsWith("/api/")) return handleApi(req, res, url); return serveStatic(req, res, url); }).listen(port, () => console.log(`Vector is running at http://localhost:${port}`));
