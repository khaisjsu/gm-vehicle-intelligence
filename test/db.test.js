import test from "node:test";
import assert from "node:assert/strict";
import { getDashboard, getSignals, getSimulator, getVehicles } from "../db.js";

test("database returns the seeded vehicle fleet", () => {
  const vehicles = getVehicles();
  assert.equal(vehicles.length, 3);
  assert.ok(vehicles.some((vehicle) => vehicle.id === "V-042"));
});

test("dashboard combines persisted records with simulator state", () => {
  const dashboard = getDashboard();
  assert.equal(dashboard.fleet.trackedVehicles, 3);
  assert.equal(dashboard.signals.length, getSignals().length);
  assert.equal(typeof dashboard.simulator.batteryTemp, "number");
});

test("simulator state is readable after a server restart", () => {
  const simulator = getSimulator();
  assert.equal(typeof simulator.updatedAt, "string");
  assert.equal(typeof simulator.mode, "string");
  assert.ok(simulator.range > 0);
});
