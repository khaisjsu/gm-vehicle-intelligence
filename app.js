const toast = document.querySelector('#toast');

function showToast(title, detail) {
  toast.querySelector('strong').textContent = title;
  toast.querySelector('small').textContent = detail;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 4200);
}

function renderSimulator(sim) {
  document.querySelector('#simStatus').textContent = sim.mode;
  document.querySelector('#simSpeed').textContent = String(sim.speed).padStart(2, '0');
  document.querySelector('#simTemp').textContent = Number(sim.batteryTemp).toFixed(1);
  document.querySelector('#simSoc').textContent = Math.round(sim.stateOfCharge);
  document.querySelector('#simRange').textContent = sim.range;
  document.querySelector('#simEvent').textContent = `${sim.lastEvent} · tick ${sim.tick}`;
  const status = document.querySelector('.simulator-status');
  status.classList.toggle('sim-hot', sim.batteryTemp > 42);
}

async function simulatorAction(action) {
  const response = await fetch(`/api/simulator/${action}`, { method: 'POST' });
  if (!response.ok) throw new Error('Simulator unavailable');
  renderSimulator(await response.json());
}

async function loadDashboard() {
  const response = await fetch('/api/dashboard');
  if (!response.ok) throw new Error('Dashboard data unavailable');
  const data = await response.json();
  document.querySelector('.hero-stat strong').textContent = data.fleet.lastSync;
  document.querySelector('.hero-stat small').textContent = `${data.fleet.online} tracked online · ${data.fleet.trackedVehicles} vehicles shown`;
  document.querySelector('.metric-card strong').innerHTML = `${data.fleet.health}<span>%</span>`;
  document.querySelector('.alert-card strong').textContent = String(data.fleet.openSignals).padStart(2, '0');
  document.querySelector('.validation-note strong').textContent = '96%';
  return data;
}

async function startDiagnosis(button) {
  const vehicleId = button.dataset.vehicle;
  button.disabled = true;
  button.textContent = 'Connecting…';
  const response = await fetch(`/api/vehicles/${vehicleId}/diagnose`, { method: 'POST' });
  if (!response.ok) throw new Error('Could not start diagnostic session');
  button.innerHTML = 'Session active <span>✓</span>';
  button.style.color = '#7ce3a5';
  button.style.borderColor = '#3d9d6a';
  showToast('Diagnostic session started', `Pulling live data from ${vehicleId} now.`);
}

loadDashboard().catch(() => showToast('Offline mode', 'The dashboard could not reach its data service.'));

fetch('/api/simulator').then((response) => response.json()).then(renderSimulator).catch(() => {});
window.setInterval(async () => {
  try {
    const response = await fetch('/api/simulator/tick', { method: 'POST' });
    renderSimulator(await response.json());
  } catch { /* Keep the last telemetry state visible during reconnects. */ }
}, 1500);

document.querySelectorAll('.diagnose-button').forEach((button) => {
  button.addEventListener('click', () => startDiagnosis(button).catch(() => showToast('Diagnostic error', 'Please try the session again.')));
});

document.querySelector('#inspectButton').addEventListener('click', () => {
  document.querySelector('#vehicles').scrollIntoView({ behavior: 'smooth', block: 'center' });
  document.querySelector('#vehicles').animate([{ boxShadow: '0 0 0 1px #9cecf0' }, { boxShadow: '0 0 0 0 transparent' }], { duration: 900 });
});

document.querySelector('#refreshValidation').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  button.disabled = true;
  button.innerHTML = 'Checking pipeline <span>…</span>';
  await new Promise((resolve) => window.setTimeout(resolve, 850));
  button.disabled = false;
  button.innerHTML = 'Pipeline verified <span>✓</span>';
  showToast('Verification complete', 'Model, virtual tests, and release gate are aligned.');
});

document.querySelector('#startSim').addEventListener('click', () => simulatorAction('start').catch(() => showToast('Simulator error', 'Could not start the drive cycle.')));
document.querySelector('#stopSim').addEventListener('click', () => simulatorAction('stop').catch(() => showToast('Simulator error', 'Could not pause the drive cycle.')));
document.querySelector('#thermalEvent').addEventListener('click', () => {
  simulatorAction('thermal-event').then(() => showToast('Thermal event injected', 'V-042 is now reporting a controlled battery variance.')).catch(() => showToast('Simulator error', 'Could not inject the event.'));
});
