import { createServer } from "node:http";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { db, getDashboard, getSimulator, getVehicles, markThermalSignal, recordTelemetry, startDiagnostic } from "./db.js";
import { currentUser, handleAuth, requireUser } from "./auth.js";
import { answerQuestion } from "./ai-chat.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);
let simulator = getSimulator();
const json = (res, status, body) => { res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }); res.end(JSON.stringify(body)); };
async function bodyJson(req) { let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 10_000) throw new Error("Payload too large"); } try { return raw ? JSON.parse(raw) : {}; } catch { throw new Error("Invalid JSON"); } }

async function handleApi(req, res, url) {
  let body = {};
  if (req.method === "POST") { try { body = await bodyJson(req); } catch { return json(res, 400, { error: "Invalid request body." }); } }
  const authResponse = handleAuth(req, res, url, body);
  if (authResponse) return json(res, authResponse.status, authResponse.body);
  if (url.pathname === "/api/health" && req.method === "GET") return json(res, 200, { status: "ok", service: "vector", database: "sqlite", timestamp: new Date().toISOString() });
  if (!currentUser(req)) return json(res, 401, { error: "Authentication required." });
  if (req.method === "POST" && url.pathname === "/api/native/thermal-check") {
    const temperature = Number(body.temperature);
    if (!Number.isFinite(temperature) || temperature < -100 || temperature > 200) return json(res, 400, { error: "Temperature must be a valid Celsius value." });
    const native = spawnSync(join(root, "native", "thermal_guard"), [String(temperature)], { encoding: "utf8" });
    if (native.status === 0) return json(res, 200, { ...JSON.parse(native.stdout), implementation: "C++ native module" });
    const state = temperature > 55 ? "CRITICAL" : temperature > 45 ? "WARNING" : "NOMINAL";
    const action = state === "CRITICAL" ? "Controlled shutdown required immediately." : state === "WARNING" ? "Reduce charge current and schedule inspection." : "Continue operation and monitor telemetry.";
    return json(res, 200, { temperature_c: temperature, state, severity: state === "CRITICAL" ? 2 : state === "WARNING" ? 1 : 0, action, engine: "javascript-fallback", implementation: "Fallback boundary" });
  }
  if (req.method === "POST" && url.pathname === "/api/ai/chat") {
    const query = String(body.query || "").trim().slice(0, 500);
    if (!query) return json(res, 400, { error: "Ask a question first." });
    const started = Date.now();
    return json(res, 200, { ...answerQuestion(query), latency_ms: Date.now() - started, model: "vector-grounded-local" });
  }
  if (req.method === "GET" && url.pathname === "/api/dashboard") return json(res, 200, getDashboard());
  if (req.method === "GET" && url.pathname === "/api/simulator") return json(res, 200, getSimulator());
  if (req.method === "GET" && url.pathname.startsWith("/api/vehicles/")) { const vehicle = getVehicles().find((item) => item.id === url.pathname.split("/").pop()); return vehicle ? json(res, 200, vehicle) : json(res, 404, { error: "Vehicle not found" }); }
  if (req.method === "POST" && url.pathname.endsWith("/diagnose")) { const vehicleId = url.pathname.split("/")[3]; if (!getVehicles().some((item) => item.id === vehicleId)) return json(res, 404, { error: "Vehicle not found" }); const session = startDiagnostic(vehicleId); return json(res, 201, { session, message: `Diagnostic session started for ${vehicleId}` }); }
  if (req.method === "POST" && url.pathname === "/api/simulator/start") { simulator = { ...getSimulator(), running: true, mode: "Drive cycle", lastEvent: "Drive cycle started" }; return json(res, 200, recordTelemetry(simulator)); }
  if (req.method === "POST" && url.pathname === "/api/simulator/stop") { simulator = { ...getSimulator(), running: false, speed: 0, mode: "Parked", lastEvent: "Drive cycle paused" }; return json(res, 200, recordTelemetry(simulator)); }
  if (req.method === "POST" && url.pathname === "/api/simulator/thermal-event") { simulator = { ...getSimulator(), running: true, mode: "Thermal event injected", batteryTemp: 47.8, lastEvent: "Thermal variance injected into cell group 04" }; markThermalSignal(); return json(res, 200, recordTelemetry(simulator)); }
  if (req.method === "POST" && url.pathname === "/api/simulator/tick") { simulator = getSimulator(); simulator.tick += 1; if (simulator.running) { simulator.speed = Math.round(38 + Math.sin(simulator.tick / 2) * 12); simulator.batteryTemp = Math.max(29, Math.min(48, simulator.batteryTemp + (Math.random() - 0.52) * 1.8)); simulator.stateOfCharge = Math.max(12, simulator.stateOfCharge - 0.03); simulator.range = Math.round(simulator.stateOfCharge * 3.45); simulator.lastEvent = simulator.batteryTemp > 42 ? "Thermal threshold exceeded" : "Telemetry heartbeat received"; simulator.mode = simulator.batteryTemp > 42 ? "Thermal event injected" : "Drive cycle"; recordTelemetry(simulator); } return json(res, 200, getSimulator()); }
  if (req.method === "GET" && url.pathname === "/api/telemetry/history") { const history = db.prepare("SELECT speed, battery_temp AS batteryTemp, state_of_charge AS stateOfCharge, range_miles AS range, mode, event, recorded_at AS recordedAt FROM telemetry WHERE vehicle_id = 'V-042' ORDER BY id DESC LIMIT 50").all(); return json(res, 200, history.reverse()); }
  return json(res, 404, { error: "API route not found" });
}

async function serveStatic(req, res, url) { if (url.pathname === "/" && !requireUser(req, res)) return; const requested = url.pathname === "/" ? "/index.html" : url.pathname === "/login" || url.pathname === "/register" ? "/auth.html" : url.pathname; if (requested === "/index.html" && !currentUser(req)) return requireUser(req, res); const filePath = normalize(join(root, requested)); if (!filePath.startsWith(root)) return json(res, 403, { error: "Forbidden" }); try { const content = await readFile(filePath); const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }; res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" }); res.end(content); } catch { json(res, 404, { error: "Not found" }); } }
createServer(async (req, res) => { const url = new URL(req.url, `http://${req.headers.host}`); if (url.pathname.startsWith("/api/")) return handleApi(req, res, url); return serveStatic(req, res, url); }).listen(port, "0.0.0.0", () => console.log(`Vector is running at http://localhost:${port}`));
