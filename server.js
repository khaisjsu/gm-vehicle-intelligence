import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);

const state = {
  fleet: {
    health: 98.4,
    efficiency: 3.8,
    openSignals: 3,
    online: 12,
    lastSync: "08:42:16",
  },
  vehicles: [
    { id: "V-042", model: "CHEVROLET SILVERADO EV", battery: 82, range: 284, odometer: 18642, status: "Online" },
    { id: "V-017", model: "CADILLAC LYRIQ", battery: 64, range: 191, odometer: 22308, status: "Online" },
    { id: "V-008", model: "GMC HUMMER EV", battery: 71, range: 246, odometer: 14903, status: "Online" },
  ],
  signals: [
    { id: "SIG-1042", vehicleId: "V-042", title: "Battery thermal variance", priority: "HIGH", detail: "HV battery pack · Cell group 04", age: "12 min ago", state: "open" },
    { id: "SIG-1017", vehicleId: "V-017", title: "Front radar calibration", priority: "MEDIUM", detail: "ADAS sensor array · Front fascia", age: "46 min ago", state: "open" },
    { id: "SIG-1008", vehicleId: "V-008", title: "Tire pressure imbalance", priority: "MEDIUM", detail: "Right rear · 31 PSI detected", age: "1 hr ago", state: "open" },
  ],
  diagnosticSessions: [],
  validation: {
    model: { label: "Battery thermal model", status: "PASS", detail: "Executable requirement · 142 checks" },
    virtual: { label: "Virtual integration", status: "PASS", detail: "HPC + zone controller · 38 scenarios" },
    release: { label: "Release gate", status: "READY", detail: "Traceability 96% · CI build #1842" },
  },
};

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(body));
};

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    return json(res, 200, { fleet: state.fleet, vehicles: state.vehicles, signals: state.signals, validation: state.validation });
  }

  if (req.method === "GET" && url.pathname.startsWith("/api/vehicles/")) {
    const vehicle = state.vehicles.find((item) => item.id === url.pathname.split("/").pop());
    return vehicle ? json(res, 200, vehicle) : json(res, 404, { error: "Vehicle not found" });
  }

  if (req.method === "POST" && url.pathname.endsWith("/diagnose")) {
    const vehicleId = url.pathname.split("/")[3];
    const vehicle = state.vehicles.find((item) => item.id === vehicleId);
    if (!vehicle) return json(res, 404, { error: "Vehicle not found" });
    const session = { id: `DX-${Date.now()}`, vehicleId, startedAt: new Date().toISOString(), status: "running" };
    state.diagnosticSessions.push(session);
    return json(res, 201, { session, message: `Diagnostic session started for ${vehicleId}` });
  }

  return json(res, 404, { error: "API route not found" });
}

async function serveStatic(req, res, url) {
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root)) return json(res, 403, { error: "Forbidden" });
  try {
    const content = await readFile(filePath);
    const types = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
    res.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    json(res, 404, { error: "Not found" });
  }
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  return serveStatic(req, res, url);
}).listen(port, () => console.log(`Vector is running at http://localhost:${port}`));
