"use strict";

// THOSFLUID MVP: simulació lògica pneumàtica, sense magnituds físiques.
const NS = "http://www.w3.org/2000/svg";
const FORMAT = "thosfluid-circuit";
const VERSION = 1;
const BACKUP_KEY = "thosfluid:last-circuit:v1";
const BACKUP_OPTION_KEY = "thosfluid:backup-enabled";
const MAX_COMPONENTS = 80;
const MAX_CONNECTIONS = 160;

const TYPES = {
  source: { label: "Font d'aire", short: "FONT", hint: "Equivalent al compressor", glyph: "◉", family: "supply", w: 105, h: 100, ports: { P: [105, 50] } },
  receiver: { label: "Acumulador", short: "ACUMULADOR", hint: "Pas d'aire; sense acumulació calculada", glyph: "▱", family: "supply", w: 200, h: 120, ports: { P: [0, 60], A: [200, 60] } },
  maintenance: { label: "Unitat de manteniment", short: "FILTRE · REGULADOR · LUBRICADOR", hint: "Passa l'aire; sense regulació física", glyph: "⚙", family: "supply", w: 260, h: 140, ports: { P: [0, 70], A: [260, 70] } },
  flowRegulator: { label: "Regulador de cabal", short: "REGULADOR", hint: "Pas qualitatiu: tancat, poc, mitjà o obert", glyph: "↗", family: "regulation", w: 220, h: 120, ports: { P: [0, 60], A: [220, 60] } },
  valve2: { label: "Vàlvula 2/2 NC", short: "2/2 NC", hint: "Accionament manual", glyph: "⇄", family: "valves", w: 250, h: 155, ports: { P: [115, 155], A: [125, 0] } },
  valve3: { label: "Vàlvula 3/2", short: "3/2", hint: "Accionament manual", glyph: "⇄", family: "valves", w: 250, h: 155, ports: { P: [115, 155], A: [125, 0], R: [145, 155] } },
  valve4: { label: "Vàlvula 4/2", short: "4/2", hint: "Palanca · enclavament", glyph: "⇅", family: "valves", w: 265, h: 155, ports: { P: [145, 155], A: [135, 0], B: [160, 0], R: [165, 155] } },
  valve5: { label: "Vàlvula 5/2", short: "5/2", hint: "Accionament manual", glyph: "⇅", family: "valves", w: 265, h: 155, ports: { P: [145, 155], A: [135, 0], B: [160, 0], R: [125, 155], S: [165, 155] } },
  single: { label: "Cilindre simple", short: "CILINDRE", hint: "Retorn per molla", glyph: "▣", family: "actuators", w: 215, h: 140, ports: { A: [40, 140] } },
  double: { label: "Cilindre doble", short: "CILINDRE", hint: "Doble efecte", glyph: "▤", family: "actuators", w: 215, h: 140, ports: { A: [40, 140], B: [130, 140] } }
};
const FAMILY_ORDER = ["supply", "valves", "actuators", "control", "regulation", "logic", "electrical"];
const FAMILIES = {
  supply: "Alimentació i preparació de l'aire",
  valves: "Vàlvules distribuïdores",
  actuators: "Actuadors",
  control: "Accionaments i sensors",
  regulation: "Regulació i pas",
  logic: "Lògica i temporització",
  electrical: "Electroneumàtica"
};
const collapsedFamilies = new Set();
const DISTRIBUTORS = new Set(["valve2", "valve3", "valve4", "valve5"]);
const DEFAULT_ACTUATOR = { valve2: "pushbutton", valve3: "pushbutton", valve4: "lever", valve5: "pushbutton" };
const defaultValveProperties = type => ({ actuator: DEFAULT_ACTUATOR[type], returnMode: type === "valve2" || type === "valve3" ? "spring" : "memory" });

const $ = id => document.getElementById(id);
const svg = (tag, attrs = {}, parent) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (parent) parent.appendChild(node);
  return node;
};
const svgText = (parent, x, y, value, cls, extra = {}) => {
  const node = svg("text", { x, y, class: cls, ...extra }, parent);
  node.textContent = value;
  return node;
};
const deepCopy = value => JSON.parse(JSON.stringify(value));
const makeId = prefix => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const key = (componentId, portId) => `${componentId}:${portId}`;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

let circuit = { format: FORMAT, version: VERSION, metadata: { name: "Circuit nou" }, components: [], connections: [], view: { zoom: 1, pan: { x: 0, y: 0 } } };
let selected = null;
let selectedType = null;
let pendingPort = null;
let running = false;
let runtime = { valves: {}, pressed: {}, cylinders: {} };
let simulation = null;
let history = [];
let future = [];
let dirty = false;
let pointerAction = null;
let activeMomentaryId = null;

function status(message) { $("statusText").textContent = message; }
function snapshot() { return deepCopy(circuit); }
function remember() {
  history.push(snapshot());
  if (history.length > 50) history.shift();
  future = [];
}
function storeBackup() {
  if (!$("backupToggle").checked) return;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(circuit));
    $("restorePanel").hidden = true;
  } catch (_) { status("No s'ha pogut actualitzar la còpia local. Descarrega el JSON."); }
}
function edit(action) {
  if (running) return;
  remember();
  action();
  dirty = true;
  storeBackup();
  render();
}
function resetRuntime() {
  runtime = { valves: {}, pressed: {}, cylinders: {} };
  for (const component of circuit.components) {
    if (DISTRIBUTORS.has(component.type)) runtime.valves[component.id] = false;
    if (component.type === "single" || component.type === "double") runtime.cylinders[component.id] = "retracted";
  }
  simulation = null;
}
function setRunning(next) {
  running = next;
  activeMomentaryId = null;
  pendingPort = null;
  selectedType = null;
  resetRuntime();
  status(next ? "Simulació activa. Acciona una vàlvula i observa els conductes." : "Mode edició. Clica dos ports per connectar-los.");
  render();
}

function makeComponent(type, x, y) {
  const properties = DISTRIBUTORS.has(type) ? defaultValveProperties(type) : type === "flowRegulator" ? { opening: "open" } : {};
  return { id: makeId("c"), type, x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10, properties };
}
function addComponent(type, x, y) {
  if (!TYPES[type] || circuit.components.length >= MAX_COMPONENTS) return status("No es poden afegir més components.");
  edit(() => {
    const def = TYPES[type];
    const comp = makeComponent(type, clamp(x, 5, 1200 - def.w - 5), clamp(y, 5, 700 - def.h - 5));
    circuit.components.push(comp);
    selected = { kind: "component", id: comp.id };
  });
  status(`${TYPES[type].label} afegit. Clica els ports per unir-los.`);
}
function deleteSelected() {
  if (!selected || running) return;
  edit(() => {
    if (selected.kind === "component") {
      circuit.components = circuit.components.filter(c => c.id !== selected.id);
      circuit.connections = circuit.connections.filter(w => w.from.componentId !== selected.id && w.to.componentId !== selected.id);
    } else circuit.connections = circuit.connections.filter(w => w.id !== selected.id);
    selected = null;
    pendingPort = null;
  });
  status("Element esborrat.");
}
function undo() {
  if (running || !history.length) return;
  future.push(snapshot()); circuit = history.pop(); selected = null; pendingPort = null; dirty = true; storeBackup(); render(); status("Acció desfeta.");
}
function redo() {
  if (running || !future.length) return;
  history.push(snapshot()); circuit = future.pop(); selected = null; pendingPort = null; dirty = true; storeBackup(); render(); status("Acció refeta.");
}
function portUsed(componentId, portId) {
  return circuit.connections.some(w => (w.from.componentId === componentId && w.from.portId === portId) || (w.to.componentId === componentId && w.to.portId === portId));
}
function clickPort(componentId, portId) {
  if (running) return;
  const next = { componentId, portId };
  if (!pendingPort) { pendingPort = next; status(`Port ${portId} triat. Clica un segon port.`); render(); return; }
  if (pendingPort.componentId === componentId && pendingPort.portId === portId) { pendingPort = null; render(); return; }
  if (pendingPort.componentId === componentId) { status("Connecta components diferents."); return; }
  if (portUsed(pendingPort.componentId, pendingPort.portId) || portUsed(componentId, portId)) { status("Aquest port ja té una connexió."); return; }
  if (circuit.connections.length >= MAX_CONNECTIONS) { status("No es poden afegir més connexions."); return; }
  const from = pendingPort;
  edit(() => { circuit.connections.push({ id: makeId("w"), from, to: next }); pendingPort = null; });
  status("Conducte connectat.");
}

function validateCircuit(data) {
  if (!data || data.format !== FORMAT || data.version !== VERSION || !Array.isArray(data.components) || !Array.isArray(data.connections)) throw new Error("El fitxer no és un circuit THOSFLUID compatible.");
  if (data.components.length > MAX_COMPONENTS || data.connections.length > MAX_CONNECTIONS) throw new Error("El circuit supera el límit de components o connexions.");
  const ids = new Set();
  const used = new Set();
  for (const c of data.components) {
    if (!c || typeof c.id !== "string" || ids.has(c.id) || !TYPES[c.type] || !Number.isFinite(c.x) || !Number.isFinite(c.y) || Math.abs(c.x) > 10000 || Math.abs(c.y) > 10000) throw new Error("Hi ha un component desconegut o mal format.");
    ids.add(c.id);
  }
  const wireIds = new Set();
  for (const w of data.connections) {
    if (!w || typeof w.id !== "string" || wireIds.has(w.id) || !w.from || !w.to || w.from.componentId === w.to.componentId) throw new Error("Hi ha una connexió mal formada.");
    wireIds.add(w.id);
    for (const end of [w.from, w.to]) {
      const c = data.components.find(item => item.id === end.componentId);
      if (!c || !Object.hasOwn(TYPES[c.type].ports, end.portId)) throw new Error("Una connexió apunta a un port inexistent.");
      const portKey = key(end.componentId, end.portId);
      if (used.has(portKey)) throw new Error("Hi ha un port connectat més d'una vegada.");
      used.add(portKey);
    }
  }
  const name = String(data.metadata?.name || "Circuit nou").slice(0, 80);
  const zoom = Number.isFinite(data.view?.zoom) ? clamp(data.view.zoom, .55, 2.4) : 1;
  const pan = { x: Number.isFinite(data.view?.pan?.x) ? clamp(data.view.pan.x, -1500, 1500) : 0, y: Number.isFinite(data.view?.pan?.y) ? clamp(data.view.pan.y, -1000, 1000) : 0 };
  return { format: FORMAT, version: VERSION, metadata: { name }, components: data.components.map(c => ({ id: c.id, type: c.type, x: c.x, y: c.y, properties: DISTRIBUTORS.has(c.type) ? { actuator: ["pushbutton", "lever", "pedal"].includes(c.properties?.actuator) ? c.properties.actuator : DEFAULT_ACTUATOR[c.type], returnMode: c.properties?.returnMode === "spring" ? "spring" : c.properties?.returnMode === "memory" ? "memory" : defaultValveProperties(c.type).returnMode } : c.type === "flowRegulator" ? { opening: ["closed", "low", "medium", "open"].includes(c.properties?.opening) ? c.properties.opening : "open" } : {} })), connections: data.connections.map(w => ({ id: w.id, from: { componentId: w.from.componentId, portId: w.from.portId }, to: { componentId: w.to.componentId, portId: w.to.portId } })), view: { zoom, pan } };
}
function downloadCircuit() {
  const text = JSON.stringify(circuit, null, 2);
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stem = circuit.metadata.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "circuit";
  a.download = `${stem}.thosfluid.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  dirty = false;
  status("Circuit descarregat. Conserva el JSON per continuar més endavant.");
}
async function openCircuit(file) {
  if (!file) return;
  if (file.size > 1024 * 1024) return status("El fitxer és massa gran (màxim 1 MB).");
  if (dirty && !confirm("Hi ha canvis no descarregats. Vols obrir un altre circuit?")) return;
  try {
    const parsed = JSON.parse(await file.text());
    circuit = validateCircuit(parsed);
    selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
    status(`Circuit «${circuit.metadata.name}» obert des del dispositiu.`);
  } catch (error) { status(error.message || "No s'ha pogut obrir el circuit."); }
}
function newCircuit() {
  if (dirty && !confirm("Hi ha canvis no descarregats. Vols crear un circuit nou?")) return;
  circuit = { format: FORMAT, version: VERSION, metadata: { name: "Circuit nou" }, components: [], connections: [], view: { zoom: 1, pan: { x: 0, y: 0 } } };
  selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render(); status("Circuit nou creat.");
}

function buildSimulation() {
  const graph = new Map();
  const rates = new Map();
  const ensure = id => { if (!graph.has(id)) graph.set(id, new Set()); };
  const link = (a, b, rate = 3) => { ensure(a); ensure(b); graph.get(a).add(b); graph.get(b).add(a); rates.set(`${a}\u0000${b}`, rate); rates.set(`${b}\u0000${a}`, rate); };
  const pressureSeeds = [];
  const exhaustSeeds = [];
  for (const c of circuit.components) {
    for (const portId of Object.keys(TYPES[c.type].ports)) ensure(key(c.id, portId));
    if (c.type === "source") pressureSeeds.push(key(c.id, "P"));
    if (c.type === "receiver" || c.type === "maintenance") link(key(c.id, "P"), key(c.id, "A"));
    if (c.type === "flowRegulator") {
      const level = { closed: 0, low: 1, medium: 2, open: 3 }[c.properties?.opening] ?? 3;
      if (level > 0) link(key(c.id, "P"), key(c.id, "A"), level);
    }
    if (c.type === "valve3" || c.type === "valve4" || c.type === "valve5") {
      exhaustSeeds.push(key(c.id, "R"));
      if (c.type === "valve5") exhaustSeeds.push(key(c.id, "S"));
    }
    const properties = { ...defaultValveProperties(c.type), ...c.properties };
    const active = properties.returnMode === "spring" ? !!runtime.pressed[c.id] : !!runtime.valves[c.id];
    if (c.type === "valve2" && active) link(key(c.id, "P"), key(c.id, "A"));
    if (c.type === "valve3") {
      if (active) link(key(c.id, "P"), key(c.id, "A"));
      else link(key(c.id, "A"), key(c.id, "R"));
    }
    if (c.type === "valve4") {
      if (active) { link(key(c.id, "P"), key(c.id, "A")); link(key(c.id, "B"), key(c.id, "R")); }
      else { link(key(c.id, "P"), key(c.id, "B")); link(key(c.id, "A"), key(c.id, "R")); }
    }
    if (c.type === "valve5") {
      if (active) { link(key(c.id, "P"), key(c.id, "A")); link(key(c.id, "B"), key(c.id, "S")); }
      else { link(key(c.id, "P"), key(c.id, "B")); link(key(c.id, "A"), key(c.id, "R")); }
    }
  }
  for (const w of circuit.connections) link(key(w.from.componentId, w.from.portId), key(w.to.componentId, w.to.portId));
  const flood = seeds => {
    const found = new Set(seeds);
    const queue = [...seeds];
    for (let i = 0; i < queue.length; i++) for (const next of graph.get(queue[i]) || []) if (!found.has(next)) { found.add(next); queue.push(next); }
    return found;
  };
  const pressure = flood(pressureSeeds);
  const exhaust = flood(exhaustSeeds);
  const distancesFrom = seeds => {
    const distances = new Map(seeds.map(node => [node, 0]));
    const queue = [...seeds];
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      for (const next of graph.get(node) || []) if (!distances.has(next)) { distances.set(next, distances.get(node) + 1); queue.push(next); }
    }
    return distances;
  };
  const pressureDistances = distancesFrom(pressureSeeds);
  const exhaustDistances = distancesFrom(exhaustSeeds);
  const speedFlood = seeds => {
    const levels = new Map(seeds.map(node => [node, 3]));
    const queue = [...seeds];
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i], level = levels.get(node);
      for (const next of graph.get(node) || []) {
        const nextLevel = Math.min(level, rates.get(`${node}\u0000${next}`) ?? 3);
        if (nextLevel > (levels.get(next) || 0)) { levels.set(next, nextLevel); queue.push(next); }
      }
    }
    return levels;
  };
  const pressureSpeed = speedFlood(pressureSeeds), exhaustSpeed = speedFlood(exhaustSeeds);
  const conflicts = new Set([...pressure].filter(node => exhaust.has(node)));
  const flowDirections = {};
  for (const w of circuit.connections) {
    const from = key(w.from.componentId, w.from.portId), to = key(w.to.componentId, w.to.portId);
    if (conflicts.has(from) || conflicts.has(to)) continue;
    if (pressure.has(from) && pressure.has(to)) {
      const a = pressureDistances.get(from), b = pressureDistances.get(to);
      if (a < b) flowDirections[w.id] = "forward";
      else if (b < a) flowDirections[w.id] = "reverse";
    } else if (exhaust.has(from) && exhaust.has(to)) {
      const a = exhaustDistances.get(from), b = exhaustDistances.get(to);
      if (a > b) flowDirections[w.id] = "forward";
      else if (b > a) flowDirections[w.id] = "reverse";
    }
  }
  const cylinderSpeeds = {};
  for (const c of circuit.components) {
    if (c.type === "single") {
      const a = key(c.id, "A");
      if (pressure.has(a) && !conflicts.has(a)) { runtime.cylinders[c.id] = "extended"; cylinderSpeeds[c.id] = pressureSpeed.get(a) || 3; }
      else if (exhaust.has(a) && !conflicts.has(a)) { runtime.cylinders[c.id] = "retracted"; cylinderSpeeds[c.id] = exhaustSpeed.get(a) || 3; }
    }
    if (c.type === "double") {
      const a = key(c.id, "A"), b = key(c.id, "B");
      if (pressure.has(a) && exhaust.has(b) && !conflicts.has(a) && !conflicts.has(b)) { runtime.cylinders[c.id] = "extended"; cylinderSpeeds[c.id] = Math.min(pressureSpeed.get(a) || 3, exhaustSpeed.get(b) || 3); }
      else if (pressure.has(b) && exhaust.has(a) && !conflicts.has(a) && !conflicts.has(b)) { runtime.cylinders[c.id] = "retracted"; cylinderSpeeds[c.id] = Math.min(pressureSpeed.get(b) || 3, exhaustSpeed.get(a) || 3); }
    }
  }
  return { pressure, exhaust, conflicts, cylinderSpeeds, flowDirections };
}
function portState(componentId, portId) {
  if (!running || !simulation) return "idle";
  const id = key(componentId, portId);
  if (simulation.conflicts.has(id)) return "conflict";
  if (simulation.pressure.has(id)) return "pressure";
  if (simulation.exhaust.has(id)) return "exhaust";
  return "idle";
}
function releaseMomentary() {
  if (!activeMomentaryId) return;
  runtime.pressed[activeMomentaryId] = false;
  activeMomentaryId = null;
  if (running) render();
}

function pointOnComponent(c, portId) {
  const [dx, dy] = TYPES[c.type].ports[portId];
  return { x: c.x + dx, y: c.y + dy };
}
function renderWire(world, w) {
  const a = circuit.components.find(c => c.id === w.from.componentId);
  const b = circuit.components.find(c => c.id === w.to.componentId);
  if (!a || !b) return;
  const start = pointOnComponent(a, w.from.portId), end = pointOnComponent(b, w.to.portId);
  const mid = (start.x + end.x) / 2;
  const state = portState(a.id, w.from.portId);
  const direction = simulation?.flowDirections?.[w.id];
  const pathData = `M ${start.x} ${start.y} H ${mid} V ${end.y} H ${end.x}`;
  const flowClass = direction === "reverse" ? " flow-reverse" : direction === "forward" ? " flow-forward" : "";
  const path = svg("path", { d: pathData, class: `wire ${state}${flowClass}${selected?.kind === "wire" && selected.id === w.id ? " selected" : ""}`, tabindex: running ? "-1" : "0", role: "button", "aria-label": `Conducte ${w.from.portId} a ${w.to.portId}: ${state === "pressure" ? "amb pressió" : state === "exhaust" ? "escapament" : "sense pressió"}${direction ? direction === "forward" ? "; flux cap al segon port" : "; flux cap al primer port" : ""}` }, world);
  path.addEventListener("click", e => { e.stopPropagation(); if (!running) { selected = { kind: "wire", id: w.id }; render(); } });
  path.addEventListener("keydown", e => { if (e.key === "Enter" && !running) { selected = { kind: "wire", id: w.id }; render(); } });
}
function symbolArrow(group, x1, y1, x2, y2) {
  svg("line", { x1, y1, x2, y2, class: "symbol" }, group);
  const angle = Math.atan2(y2 - y1, x2 - x1), length = 9;
  const a = `${x2 - length * Math.cos(angle - .5)},${y2 - length * Math.sin(angle - .5)}`;
  const b = `${x2 - length * Math.cos(angle + .5)},${y2 - length * Math.sin(angle + .5)}`;
  svg("polyline", { points: `${a} ${x2},${y2} ${b}`, class: "symbol" }, group);
}
function symbolCap(group, x, y) {
  svg("path", { d: `M${x - 7} ${y}h14 M${x} ${y}v12`, class: "symbol" }, group);
}
function symbolSpring(group, x, y, width = 27) {
  const step = width / 6;
  svg("polyline", { points: `${x},${y} ${x + step},${y - 7} ${x + step * 2},${y + 7} ${x + step * 3},${y - 7} ${x + step * 4},${y + 7} ${x + step * 5},${y - 7} ${x + width},${y}`, class: "symbol" }, group);
}
function drawSymbol(group, c, previousCylinderState) {
  const def = TYPES[c.type];
  if (c.type === "source") {
    svg("circle", { cx: 48, cy: 50, r: 13, class: "symbol" }, group);
    svg("circle", { cx: 48, cy: 50, r: 3, class: "symbol-fill" }, group);
    svg("line", { x1: 61, y1: 50, x2: 105, y2: 50, class: "norm-port-line" }, group);
  } else if (c.type === "receiver") {
    svg("line", { x1: 0, y1: 60, x2: 38, y2: 60, class: "norm-port-line" }, group);
    svg("line", { x1: 162, y1: 60, x2: 200, y2: 60, class: "norm-port-line" }, group);
    svg("rect", { x: 38, y: 40, width: 124, height: 40, rx: 20, class: "symbol" }, group);
    svg("line", { x1: 100, y1: 80, x2: 100, y2: 96, class: "symbol" }, group);
    svg("path", { d: "M92 96h16l-8 9z", class: "symbol" }, group);
    svgText(group, 100, 115, "acumulador", "sub", { "text-anchor": "middle" });
  } else if (c.type === "maintenance") {
    svg("line", { x1: 0, y1: 70, x2: 26, y2: 70, class: "norm-port-line" }, group);
    svg("line", { x1: 234, y1: 70, x2: 260, y2: 70, class: "norm-port-line" }, group);
    svg("line", { x1: 26, y1: 70, x2: 234, y2: 70, class: "symbol" }, group);
    svg("path", { d: "M64 48l22 22-22 22-22-22z M42 70h44 M64 92v12", class: "symbol" }, group);
    svg("rect", { x: 86, y: 48, width: 64, height: 44, class: "symbol" }, group);
    svg("path", { d: "M98 82l26-24 M118 70h25 M118 70v-20", class: "symbol" }, group);
    svg("circle", { cx: 126, cy: 34, r: 10, class: "symbol" }, group);
    svg("line", { x1: 126, y1: 34, x2: 130, y2: 29, class: "symbol" }, group);
    svg("path", { d: "M172 48l22 22-22 22-22-22z M150 70h44", class: "symbol" }, group);
    svgText(group, 64, 116, "filtre", "sub", { "text-anchor": "middle" });
    svgText(group, 118, 116, "regulador", "sub", { "text-anchor": "middle" });
    svgText(group, 172, 116, "lubricador", "sub", { "text-anchor": "middle" });
  } else if (c.type === "flowRegulator") {
    svg("line", { x1: 0, y1: 60, x2: 220, y2: 60, class: "norm-port-line" }, group);
    svg("path", { d: "M78 48l22 12-22 12z M142 48l-22 12 22 12z", class: "symbol" }, group);
    symbolArrow(group, 104, 91, 135, 29);
    const opening = c.properties?.opening || "open";
    const label = { closed: "tancat", low: "poc", medium: "mitjà", open: "obert" }[opening] || "obert";
    svgText(group, 110, 108, label, "sub", { "text-anchor": "middle" });
  } else if (["valve2", "valve3", "valve4", "valve5"].includes(c.type)) {
    const is2 = c.type === "valve2", is3 = c.type === "valve3", is4 = c.type === "valve4";
    const properties = { ...defaultValveProperties(c.type), ...c.properties };
    const momentary = properties.returnMode === "spring";
    const active = momentary ? !!runtime.pressed[c.id] : !!runtime.valves[c.id];
    const offset = active ? 60 : 0;
    const left = is2 || is3 ? 40 : 50;
    const spool = svg("g", { transform: `translate(${offset} 0)` }, group);
    svg("rect", { x: left, y: 42, width: 60, height: 60, class: `norm-box${active ? " norm-active" : ""}` }, spool);
    svg("rect", { x: left + 60, y: 42, width: 60, height: 60, class: `norm-box${active ? "" : " norm-active"}` }, spool);
    if (is2) {
      symbolArrow(spool, 55, 91, 65, 53);
      symbolCap(spool, 125, 55); symbolCap(spool, 115, 84);
      svg("line", { x1: 125, y1: 0, x2: 125, y2: 42, class: "norm-port-line" }, group);
      svg("line", { x1: 115, y1: 102, x2: 115, y2: 155, class: "norm-port-line" }, group);
    } else if (is3) {
      symbolArrow(spool, 55, 91, 65, 53); symbolCap(spool, 84, 76);
      symbolArrow(spool, 125, 53, 145, 91); symbolCap(spool, 115, 76);
      for (const [x, top] of [[125, true], [115, false], [145, false]]) {
        svg("line", { x1: x, y1: top ? 0 : 102, x2: x, y2: top ? 42 : 155, class: "norm-port-line" }, group);
      }
    } else if (is4) {
      symbolArrow(spool, 85, 91, 75, 53); symbolArrow(spool, 100, 53, 105, 91);
      symbolArrow(spool, 145, 91, 160, 53); symbolArrow(spool, 135, 53, 165, 91);
      for (const x of [135, 160]) svg("line", { x1: x, y1: 0, x2: x, y2: 42, class: "norm-port-line" }, group);
      for (const x of [145, 165]) svg("line", { x1: x, y1: 102, x2: x, y2: 155, class: "norm-port-line" }, group);
    } else {
      symbolArrow(spool, 85, 91, 75, 53); symbolArrow(spool, 100, 53, 105, 91);
      symbolArrow(spool, 145, 91, 160, 53); symbolArrow(spool, 135, 53, 125, 91);
      for (const x of [135, 160]) svg("line", { x1: x, y1: 0, x2: x, y2: 42, class: "norm-port-line" }, group);
      for (const x of [125, 145, 165]) svg("line", { x1: x, y1: 102, x2: x, y2: 155, class: "norm-port-line" }, group);
    }
    // El triangle indica el port d'escapament, independentment del seu estat.
    for (const x of is3 ? [145] : is4 ? [165] : c.type === "valve5" ? [125, 165] : []) svg("path", { d: `M${x - 6} 134h12l-6 9z`, class: "symbol" }, group);
    if (momentary) symbolSpring(group, (is2 || is3 ? 164 : 174) + offset, 72, 27);
    let button;
    const actuator = properties.actuator || DEFAULT_ACTUATOR[c.type];
    const actuatorLabel = actuator === "lever" ? "palanca" : actuator === "pedal" ? "pedal" : "polsador";
    const article = actuator === "lever" ? "la" : "el";
    const ariaLabel = momentary ? `Mantén premut ${article} ${actuatorLabel} de la vàlvula ${def.short}` : `Commuta la vàlvula ${def.short} amb ${article} ${actuatorLabel}`;
    if (actuator === "lever") {
      button = svg("circle", { cx: 15, cy: 54, r: 6, class: `actuator${active ? " on" : ""}`, role: "button", tabindex: running ? "0" : "-1", "aria-label": ariaLabel }, group);
      svg("path", { d: `M15 54l15 -18 M29 72H${left + offset}`, class: "symbol" }, group);
    } else if (actuator === "pedal") {
      button = svg("path", { d: "M5 62h9l12 10-12 10H5z", class: `actuator${active ? " on" : ""}`, role: "button", tabindex: running ? "0" : "-1", "aria-label": ariaLabel }, group);
      svg("path", { d: `M26 72H${left + offset} M10 84l12 -7h8`, class: "symbol" }, group);
    } else {
      button = svg("rect", { x: 4, y: 56, width: 25, height: 32, rx: 2, class: `actuator${active ? " on" : ""}`, role: "button", tabindex: running ? "0" : "-1", "aria-label": ariaLabel }, group);
      svg("path", { d: `M29 72H${left + offset} M10 50h13 M16 50v6`, class: "symbol" }, group);
    }
    const trigger = e => { e.stopPropagation(); if (!running) return; if (!momentary) { runtime.valves[c.id] = !runtime.valves[c.id]; render(); } else if (activeMomentaryId !== c.id) { activeMomentaryId = c.id; runtime.pressed[c.id] = true; render(); } };
    const release = e => { e.stopPropagation(); releaseMomentary(); };
    button.addEventListener("pointerdown", trigger);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); trigger(e); } });
    button.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") release(e); });
  } else {
    svg("rect", { x: 20, y: 38, width: 130, height: 57, class: "norm-box" }, group);
    const extended = runtime.cylinders[c.id] === "extended";
    const pistonX = extended ? 112 : 56;
    const piston = svg("rect", { x: pistonX, y: 41, width: 5, height: 51, class: "piston" }, group);
    const rod = svg("line", { x1: pistonX + 5, y1: 65, x2: extended ? 208 : 172, y2: 65, class: "symbol" }, group);
    svg("path", { d: "M150 58v14", class: "symbol" }, group);
    svg("line", { x1: 40, y1: 95, x2: 40, y2: 140, class: "norm-port-line" }, group);
    if (c.type === "double") svg("line", { x1: 130, y1: 95, x2: 130, y2: 140, class: "norm-port-line" }, group);
    else symbolSpring(group, pistonX + 12, 82, Math.max(18, 140 - pistonX - 20));
    if (previousCylinderState && previousCylinderState !== runtime.cylinders[c.id] && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const oldX = previousCylinderState === "extended" ? 112 : 56;
      const oldEnd = previousCylinderState === "extended" ? 208 : 172;
      const speed = simulation?.cylinderSpeeds?.[c.id] || 3;
      const duration = speed === 1 ? "1.4s" : speed === 2 ? ".75s" : ".35s";
      svg("animate", { attributeName: "x", from: oldX, to: pistonX, dur: duration, fill: "freeze" }, piston);
      svg("animate", { attributeName: "x1", from: oldX + 5, to: pistonX + 5, dur: duration, fill: "freeze" }, rod);
      svg("animate", { attributeName: "x2", from: oldEnd, to: extended ? 208 : 172, dur: duration, fill: "freeze" }, rod);
    }
  }
}
function renderComponent(world, c, previousCylinderState) {
  const def = TYPES[c.type];
  const group = svg("g", { transform: `translate(${c.x} ${c.y})`, class: `component${selected?.kind === "component" && selected.id === c.id ? " selected" : ""}`, role: "button", tabindex: "0", "aria-label": `${def.label}: ${c.id}` }, world);
  svg("rect", { x: 0, y: 0, width: def.w, height: def.h, rx: 10, class: "body" }, group);
  svgText(group, c.type === "source" ? 8 : 20, c.type === "source" ? 88 : 20, def.short, "label");
  drawSymbol(group, c, previousCylinderState);
  group.addEventListener("pointerdown", e => {
    if (e.target.classList.contains("port") || e.target.classList.contains("actuator")) return;
    e.stopPropagation(); selected = { kind: "component", id: c.id };
    if (!running) { remember(); pointerAction = { kind: "move", id: c.id, start: screenPoint(e), x: c.x, y: c.y, moved: false }; $("circuitCanvas").setPointerCapture(e.pointerId); }
    renderInspector();
  });
  group.addEventListener("keydown", e => {
    if (e.target !== group || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault(); selected = { kind: "component", id: c.id }; renderInspector();
  });
  for (const [portId, [x, y]] of Object.entries(def.ports)) {
    const circle = svg("circle", { cx: x, cy: y, r: 7, class: `port${pendingPort?.componentId === c.id && pendingPort?.portId === portId ? " pending" : ""}`, role: "button", tabindex: running ? "-1" : "0", "aria-label": `Port ${portId} de ${def.label}` }, group);
    svgText(group, x >= def.w ? x - 12 : x, y < 20 ? 31 : y > def.h - 15 ? def.h - 24 : y - 13, portId, "port-label", { "text-anchor": x >= def.w ? "end" : "middle" });
    circle.addEventListener("pointerdown", e => { e.stopPropagation(); clickPort(c.id, portId); });
    circle.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); clickPort(c.id, portId); } });
  }
}
function screenPoint(e) {
  const canvas = $("circuitCanvas");
  const p = canvas.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  return p.matrixTransform(canvas.getScreenCTM().inverse());
}
function worldPoint(e) {
  const p = screenPoint(e), view = circuit.view;
  return { x: (p.x - view.pan.x) / view.zoom, y: (p.y - view.pan.y) / view.zoom };
}
function renderInspector() {
  const panel = $("selectionPanel"); panel.replaceChildren();
  $("circuitCount").textContent = `${circuit.components.length} ${circuit.components.length === 1 ? "component" : "components"} · ${circuit.connections.length} ${circuit.connections.length === 1 ? "conducte" : "conductes"}`;
  $("componentInspector").hidden = !selected;
  if (!selected) return;
  if (selected.kind === "wire") { $("inspectorTitle").textContent = "Conducte"; const p = document.createElement("p"); p.textContent = "Uneix dos ports pneumàtics."; panel.append(p); return; }
  const c = circuit.components.find(x => x.id === selected.id); if (!c) { $("componentInspector").hidden = true; return; }
  $("inspectorTitle").textContent = TYPES[c.type].label;
  for (const portId of Object.keys(TYPES[c.type].ports)) { const pill = document.createElement("span"); pill.className = "pill"; pill.textContent = `${portId}: ${portState(c.id, portId) === "pressure" ? "pressió" : portState(c.id, portId) === "exhaust" ? "escapament" : "sense pressió"}`; panel.append(pill); }
  if (c.type === "single" || c.type === "double") { const p = document.createElement("p"); p.textContent = `Èmbol: ${runtime.cylinders[c.id] === "extended" ? "estès" : "retret"}`; panel.append(p); }
  if (DISTRIBUTORS.has(c.type) && !running) {
    const actuatorLabel = document.createElement("label"); actuatorLabel.className = "field-label"; actuatorLabel.textContent = "Accionament"; actuatorLabel.htmlFor = "actuatorMode"; panel.append(actuatorLabel);
    const actuatorSelect = document.createElement("select"); actuatorSelect.id = "actuatorMode"; actuatorSelect.className = "text-field";
    for (const [value, text] of [["pushbutton", "Polsador"], ["lever", "Palanca"], ["pedal", "Pedal"]]) { const opt = document.createElement("option"); opt.value = value; opt.textContent = text; actuatorSelect.append(opt); }
    actuatorSelect.value = c.properties.actuator || DEFAULT_ACTUATOR[c.type];
    actuatorSelect.addEventListener("change", () => edit(() => { c.properties.actuator = actuatorSelect.value; })); panel.append(actuatorSelect);
    const label = document.createElement("label"); label.className = "field-label"; label.textContent = "Retorn"; label.htmlFor = "returnMode"; panel.append(label);
    const select = document.createElement("select"); select.id = "returnMode"; select.className = "text-field";
    for (const [value, text] of [["spring", "Molla de retorn"], ["memory", "Posició mantinguda"]]) { const opt = document.createElement("option"); opt.value = value; opt.textContent = text; select.append(opt); }
    select.value = c.properties.returnMode || defaultValveProperties(c.type).returnMode;
    select.addEventListener("change", () => edit(() => { c.properties.returnMode = select.value; })); panel.append(select);
  }
  if (c.type === "flowRegulator" && !running) {
    const label = document.createElement("label"); label.className = "field-label"; label.textContent = "Obertura qualitativa"; label.htmlFor = "flowOpening"; panel.append(label);
    const select = document.createElement("select"); select.id = "flowOpening"; select.className = "text-field";
    for (const [value, text] of [["closed", "Tancat"], ["low", "Poc"], ["medium", "Mitjà"], ["open", "Obert"]]) { const opt = document.createElement("option"); opt.value = value; opt.textContent = text; select.append(opt); }
    select.value = c.properties.opening || "open";
    select.addEventListener("change", () => edit(() => { c.properties.opening = select.value; })); panel.append(select);
  }
  if (running && DISTRIBUTORS.has(c.type)) {
    const button = document.createElement("button"); button.className = "secondary wide";
    const properties = { ...defaultValveProperties(c.type), ...c.properties };
    const momentary = properties.returnMode === "spring";
    const actuator = properties.actuator;
    const actuatorLabel = actuator === "lever" ? "palanca" : actuator === "pedal" ? "pedal" : "polsador";
    const article = actuator === "lever" ? "la" : "el";
    button.textContent = momentary ? `Mantén premut ${article} ${actuatorLabel}` : `Commuta amb ${article} ${actuatorLabel}`;
    const trigger = e => { e.preventDefault(); if (!momentary) runtime.valves[c.id] = !runtime.valves[c.id]; else if (activeMomentaryId !== c.id) { activeMomentaryId = c.id; runtime.pressed[c.id] = true; } render(); };
    const release = e => { e.preventDefault(); releaseMomentary(); };
    button.addEventListener("pointerdown", trigger); button.addEventListener("pointerup", release); button.addEventListener("pointercancel", release);
    button.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") trigger(e); });
    button.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") release(e); });
    panel.append(button);
  }
}
function render() {
  const previousCylinderStates = { ...runtime.cylinders };
  simulation = running ? buildSimulation() : null;
  const world = $("world"); world.replaceChildren();
  world.setAttribute("transform", `translate(${circuit.view.pan.x} ${circuit.view.pan.y}) scale(${circuit.view.zoom})`);
  for (const wire of circuit.connections) renderWire(world, wire);
  for (const comp of circuit.components) renderComponent(world, comp, previousCylinderStates[comp.id]);
  $("circuitName").value = circuit.metadata.name;
  $("circuitName").disabled = running;
  $("simulateBtn").textContent = running ? "■ Edita" : "▶ Simula";
  $("modeLabel").textContent = running ? "Mode simulació" : "Mode edició";
  $("canvasHint").textContent = running ? "Acciona una vàlvula i observa com es desplaça l'aire pels conductes." : "Clica dos ports per connectar-los.";
  $("resetBtn").disabled = !running;
  $("deleteBtn").disabled = running || !selected;
  $("undoBtn").disabled = running || !history.length;
  $("redoBtn").disabled = running || !future.length;
  $("zoomLabel").textContent = `${Math.round(circuit.view.zoom * 100)}%`;
  document.querySelectorAll(".library-item").forEach(node => node.classList.toggle("active", node.dataset.type === selectedType));
  if (simulation?.conflicts.size) status("Conflicte: una xarxa comunica pressió i escapament.");
  renderInspector();
}
function loadExample(kind) {
  if (dirty && !confirm("Hi ha canvis no descarregats. Vols obrir un exemple?")) return;
  if (kind === "supply") {
    const source = { id: "compressor", type: "source", x: 80, y: 195, properties: {} };
    const receiver = { id: "diposit", type: "receiver", x: 230, y: 175, properties: {} };
    const maintenance = { id: "manteniment", type: "maintenance", x: 500, y: 155, properties: {} };
    const valve = { id: "valvula", type: "valve3", x: 405, y: 400, properties: defaultValveProperties("valve3") };
    const cylinder = { id: "cilindre", type: "single", x: 780, y: 395, properties: {} };
    circuit = { format: FORMAT, version: VERSION, metadata: { name: "Exemple: alimentació i preparació de l'aire" }, components: [source, receiver, maintenance, valve, cylinder], connections: [
      { id: "aire_font", from: { componentId: source.id, portId: "P" }, to: { componentId: receiver.id, portId: "P" } },
      { id: "aire_diposit", from: { componentId: receiver.id, portId: "A" }, to: { componentId: maintenance.id, portId: "P" } },
      { id: "aire_unitat", from: { componentId: maintenance.id, portId: "A" }, to: { componentId: valve.id, portId: "P" } },
      { id: "aire_valvula", from: { componentId: valve.id, portId: "A" }, to: { componentId: cylinder.id, portId: "A" } }
    ], view: { zoom: .86, pan: { x: 40, y: 10 } } };
    selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
    status("Exemple d'alimentació carregat. Simula'l i acciona la vàlvula 3/2.");
    return;
  }
  if (kind === "flow") {
    const source = { id: "font", type: "source", x: 90, y: 255, properties: {} };
    const regulator = { id: "regulador", type: "flowRegulator", x: 260, y: 245, properties: { opening: "low" } };
    const valve = { id: "valvula", type: "valve3", x: 535, y: 230, properties: defaultValveProperties("valve3") };
    const cylinder = { id: "cilindre", type: "single", x: 860, y: 245, properties: {} };
    circuit = { format: FORMAT, version: VERSION, metadata: { name: "Exemple: regulació qualitativa de cabal" }, components: [source, regulator, valve, cylinder], connections: [
      { id: "aire_font", from: { componentId: source.id, portId: "P" }, to: { componentId: regulator.id, portId: "P" } },
      { id: "aire_regulador", from: { componentId: regulator.id, portId: "A" }, to: { componentId: valve.id, portId: "P" } },
      { id: "aire_valvula", from: { componentId: valve.id, portId: "A" }, to: { componentId: cylinder.id, portId: "A" } }
    ], view: { zoom: .86, pan: { x: 30, y: 10 } } };
    selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
    status("Exemple de regulador carregat en obertura «poc». Simula'l i acciona la vàlvula.");
    return;
  }
  const is2 = kind === "twoTwo", is3 = kind === "simple", is4 = kind === "fourTwo";
  const single = is2 || is3;
  const source = { id: "font", type: "source", x: 100, y: 270, properties: {} };
  const valveType = is2 ? "valve2" : is3 ? "valve3" : is4 ? "valve4" : "valve5";
  const valve = { id: "valvula", type: valveType, x: 395, y: 255, properties: defaultValveProperties(valveType) };
  const cylinder = { id: "cilindre", type: single ? "single" : "double", x: 800, y: 260, properties: {} };
  const connections = [
    { id: "conducte_p", from: { componentId: "font", portId: "P" }, to: { componentId: "valvula", portId: "P" } },
    { id: "conducte_a", from: { componentId: "valvula", portId: "A" }, to: { componentId: "cilindre", portId: "A" } }
  ];
  if (!single) connections.push({ id: "conducte_b", from: { componentId: "valvula", portId: "B" }, to: { componentId: "cilindre", portId: "B" } });
  const name = is2 ? "Exemple: cilindre simple i vàlvula 2/2 NC" : is3 ? "Exemple: cilindre simple i vàlvula 3/2" : is4 ? "Exemple: cilindre doble i vàlvula 4/2" : "Exemple: cilindre doble i vàlvula 5/2";
  circuit = { format: FORMAT, version: VERSION, metadata: { name }, components: [source, valve, cylinder], connections, view: { zoom: 1, pan: { x: 0, y: 0 } } };
  selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
  status(`Exemple ${is2 ? "2/2" : is3 ? "3/2" : is4 ? "4/2" : "5/2"} carregat. Prem Simula i acciona la vàlvula.`);
}
function setupLibrary() {
  const host = $("libraryItems"); host.replaceChildren();
  const typesByFamily = new Map();
  for (const [type, def] of Object.entries(TYPES)) {
    if (!typesByFamily.has(def.family)) typesByFamily.set(def.family, []);
    typesByFamily.get(def.family).push([type, def]);
  }
  const families = [...typesByFamily.keys()].sort((a, b) => FAMILY_ORDER.indexOf(a) - FAMILY_ORDER.indexOf(b));
  for (const family of families) {
    const entries = typesByFamily.get(family), familyId = `family-${family}`;
    const section = document.createElement("section"); section.className = "library-family";
    const heading = document.createElement("button"); heading.type = "button"; heading.className = "family-toggle";
    heading.setAttribute("aria-controls", familyId); heading.setAttribute("aria-expanded", String(!collapsedFamilies.has(family)));
    const title = document.createElement("span"); title.textContent = FAMILIES[family] || family;
    const count = document.createElement("small"); count.textContent = String(entries.length);
    const chevron = document.createElement("span"); chevron.className = "family-chevron"; chevron.textContent = collapsedFamilies.has(family) ? "›" : "⌄"; chevron.setAttribute("aria-hidden", "true");
    heading.append(title, count, chevron);
    const items = document.createElement("div"); items.className = "family-components"; items.id = familyId; items.hidden = collapsedFamilies.has(family);
    heading.addEventListener("click", () => {
      if (collapsedFamilies.has(family)) collapsedFamilies.delete(family); else collapsedFamilies.add(family);
      const expanded = !collapsedFamilies.has(family); heading.setAttribute("aria-expanded", String(expanded)); items.hidden = !expanded; chevron.textContent = expanded ? "⌄" : "›";
    });
    section.append(heading, items);
    for (const [type, def] of entries) {
      const button = document.createElement("button"); button.className = "library-item"; button.type = "button"; button.draggable = true; button.dataset.type = type;
      const glyph = document.createElement("span"); glyph.className = "glyph"; glyph.setAttribute("aria-hidden", "true");
      const preview = svg("svg", { viewBox: `0 0 ${def.w} ${def.h}`, width: 48, height: 34 }, glyph);
      const previewGroup = svg("g", { class: "component" }, preview);
      drawSymbol(previewGroup, { id: `preview-${type}`, type, properties: type === "valve5" ? { returnMode: "memory" } : {} });
      preview.querySelectorAll("[role], [tabindex]").forEach(node => { node.removeAttribute("role"); node.removeAttribute("tabindex"); });
      const labels = document.createElement("span"); const itemTitle = document.createElement("strong"); itemTitle.textContent = def.label; const hint = document.createElement("small"); hint.textContent = def.hint; labels.append(itemTitle, hint); button.append(glyph, labels);
      button.addEventListener("click", () => { if (running) return; selectedType = selectedType === type ? null : type; render(); status(selectedType ? `Fes clic al llenç per col·locar ${def.label}.` : "Eina cancel·lada."); });
      button.addEventListener("dragstart", e => { if (running) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", type); });
      items.append(button);
    }
    host.append(section);
  }
}
function setupCanvas() {
  const canvas = $("circuitCanvas");
  canvas.addEventListener("pointerdown", e => {
    if (!e.target.hasAttribute("data-background")) return;
    if (running) { selected = null; renderInspector(); return; }
    const p = worldPoint(e);
    if (selectedType) { addComponent(selectedType, p.x - TYPES[selectedType].w / 2, p.y - TYPES[selectedType].h / 2); return; }
    selected = null; renderInspector();
    pointerAction = { kind: "pan", start: screenPoint(e), x: circuit.view.pan.x, y: circuit.view.pan.y };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", e => {
    if (!pointerAction) return;
    const p = screenPoint(e), dx = p.x - pointerAction.start.x, dy = p.y - pointerAction.start.y;
    if (pointerAction.kind === "pan") { circuit.view.pan = { x: pointerAction.x + dx, y: pointerAction.y + dy }; render(); }
    if (pointerAction.kind === "move") {
      const c = circuit.components.find(x => x.id === pointerAction.id);
      if (!c) return;
      c.x = Math.round((pointerAction.x + dx / circuit.view.zoom) / 10) * 10;
      c.y = Math.round((pointerAction.y + dy / circuit.view.zoom) / 10) * 10;
      pointerAction.moved = true;
      render();
    }
  });
  const endPointer = () => {
    if (pointerAction?.kind === "move" && pointerAction.moved) { dirty = true; storeBackup(); }
    if (pointerAction?.kind === "move" && !pointerAction.moved) history.pop();
    pointerAction = null; canvas.classList.remove("dragging"); render();
  };
  canvas.addEventListener("pointerup", endPointer); canvas.addEventListener("pointercancel", endPointer);
  canvas.addEventListener("dragover", e => { if (!running) e.preventDefault(); });
  canvas.addEventListener("drop", e => { e.preventDefault(); if (running) return; const type = e.dataTransfer.getData("text/plain"); if (!TYPES[type]) return; const p = worldPoint(e); addComponent(type, p.x - TYPES[type].w / 2, p.y - TYPES[type].h / 2); });
  canvas.addEventListener("wheel", e => { if (!e.ctrlKey) return; e.preventDefault(); circuit.view.zoom = clamp(circuit.view.zoom * (e.deltaY < 0 ? 1.1 : 1 / 1.1), .55, 2.4); render(); }, { passive: false });
}
function setupControls() {
  window.addEventListener("pointerup", releaseMomentary);
  window.addEventListener("pointercancel", releaseMomentary);
  window.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") releaseMomentary(); });
  $("newBtn").addEventListener("click", newCircuit);
  $("openBtn").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", e => { openCircuit(e.target.files[0]); e.target.value = ""; });
  $("saveBtn").addEventListener("click", downloadCircuit);
  $("circuitOptionsBtn").addEventListener("click", () => {
    const open = $("circuitOptions").hidden;
    $("circuitOptions").hidden = !open;
    $("circuitOptionsBtn").setAttribute("aria-expanded", String(open));
  });
  $("closeCircuitOptionsBtn").addEventListener("click", () => { $("circuitOptions").hidden = true; $("circuitOptionsBtn").setAttribute("aria-expanded", "false"); });
  $("closeInspectorBtn").addEventListener("click", () => { selected = null; render(); });
  const handle = $("inspectorHandle"), inspector = $("componentInspector");
  let panelDrag = null;
  handle.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;
    const bounds = inspector.getBoundingClientRect(), parent = $("circuitCanvas").getBoundingClientRect();
    panelDrag = { x: e.clientX, y: e.clientY, left: bounds.left - parent.left, top: bounds.top - parent.top };
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", e => {
    if (!panelDrag) return;
    const parent = $("circuitCanvas").getBoundingClientRect();
    inspector.style.right = "auto";
    inspector.style.left = `${clamp(panelDrag.left + e.clientX - panelDrag.x, 0, Math.max(0, parent.width - inspector.offsetWidth))}px`;
    inspector.style.top = `${clamp(panelDrag.top + e.clientY - panelDrag.y, 0, Math.max(0, parent.height - inspector.offsetHeight))}px`;
  });
  handle.addEventListener("pointerup", () => { panelDrag = null; });
  handle.addEventListener("pointercancel", () => { panelDrag = null; });
  $("deleteBtn").addEventListener("click", deleteSelected);
  $("undoBtn").addEventListener("click", undo);
  $("redoBtn").addEventListener("click", redo);
  $("simulateBtn").addEventListener("click", () => setRunning(!running));
  $("resetBtn").addEventListener("click", () => { resetRuntime(); render(); status("Simulació reiniciada."); });
  $("zoomInBtn").addEventListener("click", () => { circuit.view.zoom = clamp(circuit.view.zoom * 1.2, .55, 2.4); render(); });
  $("zoomOutBtn").addEventListener("click", () => { circuit.view.zoom = clamp(circuit.view.zoom / 1.2, .55, 2.4); render(); });
  $("fitBtn").addEventListener("click", () => { circuit.view = { zoom: 1, pan: { x: 0, y: 0 } }; render(); });
  $("exampleSupplyBtn").addEventListener("click", () => loadExample("supply"));
  $("exampleFlowBtn").addEventListener("click", () => loadExample("flow"));
  $("exampleValve2Btn").addEventListener("click", () => loadExample("twoTwo"));
  $("exampleSimpleBtn").addEventListener("click", () => loadExample("simple"));
  $("exampleValve4Btn").addEventListener("click", () => loadExample("fourTwo"));
  $("exampleDoubleBtn").addEventListener("click", () => loadExample("double"));
  $("circuitName").addEventListener("change", e => { const value = e.target.value.trim().slice(0, 80) || "Circuit nou"; if (value !== circuit.metadata.name && !running) edit(() => { circuit.metadata.name = value; }); });
  $("backupToggle").addEventListener("change", e => {
    try {
      if (e.target.checked) { localStorage.setItem(BACKUP_OPTION_KEY, "1"); storeBackup(); status("Còpia de recuperació activada en aquest navegador."); }
      else { localStorage.removeItem(BACKUP_OPTION_KEY); localStorage.removeItem(BACKUP_KEY); $("restorePanel").hidden = true; status("Còpia de recuperació desactivada i esborrada."); }
    } catch (_) { e.target.checked = false; status("L'emmagatzematge local no està disponible."); }
  });
  $("clearBackupBtn").addEventListener("click", () => { try { localStorage.removeItem(BACKUP_KEY); $("restorePanel").hidden = true; status("Còpia de recuperació esborrada."); } catch (_) { status("No s'ha pogut esborrar la còpia."); } });
  $("restoreBtn").addEventListener("click", () => {
    try {
      const recovered = validateCircuit(JSON.parse(localStorage.getItem(BACKUP_KEY)));
      if (dirty && !confirm("Vols substituir el circuit actual per l'última còpia local?")) return;
      circuit = recovered; selected = null; pendingPort = null; history = []; future = []; running = false; dirty = true; resetRuntime(); $("restorePanel").hidden = true; render(); status("Últim circuit recuperat. Descarrega el JSON per conservar-lo.");
    } catch (_) { status("La còpia de recuperació no és vàlida."); }
  });
  document.addEventListener("keydown", e => {
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
    if (typing) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
    if (e.key === "Escape") { pendingPort = null; selectedType = null; render(); }
  });
  window.addEventListener("beforeunload", e => { if (!dirty) return; e.preventDefault(); e.returnValue = ""; });
}
function init() {
  setupLibrary(); setupCanvas(); setupControls();
  try {
    $("backupToggle").checked = localStorage.getItem(BACKUP_OPTION_KEY) === "1";
    $("restorePanel").hidden = !($("backupToggle").checked && localStorage.getItem(BACKUP_KEY));
    if (!$("restorePanel").hidden) { $("circuitOptions").hidden = false; $("circuitOptionsBtn").setAttribute("aria-expanded", "true"); }
  } catch (_) { $("backupToggle").checked = false; }
  resetRuntime(); render();
}
init();

