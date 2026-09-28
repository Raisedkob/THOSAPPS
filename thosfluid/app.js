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
  source: { label: "Font d'aire", short: "FONT", hint: "Pressió lògica", glyph: "◉", w: 105, h: 90, ports: { P: [105, 45] } },
  valve3: { label: "Vàlvula 3/2", short: "3/2", hint: "Polsador · molla", glyph: "⇄", w: 150, h: 100, ports: { P: [0, 48], A: [150, 48], R: [75, 100] } },
  valve5: { label: "Vàlvula 5/2", short: "5/2", hint: "Dues posicions", glyph: "⇅", w: 160, h: 120, ports: { P: [0, 60], A: [160, 30], B: [160, 90], R: [46, 120], S: [115, 120] } },
  single: { label: "Cilindre simple", short: "CILINDRE", hint: "Retorn per molla", glyph: "▣", w: 175, h: 95, ports: { A: [0, 47] } },
  double: { label: "Cilindre doble", short: "CILINDRE", hint: "Doble efecte", glyph: "▤", w: 175, h: 105, ports: { A: [0, 28], B: [0, 78] } }
};

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
    if (component.type === "valve5") runtime.valves[component.id] = false;
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
  status(next ? "Simulació activa. Mantén premuda la 3/2 o commuta la 5/2." : "Mode edició. Clica dos ports per connectar-los.");
  render();
}

function makeComponent(type, x, y) {
  return { id: makeId("c"), type, x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10, properties: type === "valve5" ? { returnMode: "memory" } : {} };
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
  return { format: FORMAT, version: VERSION, metadata: { name }, components: data.components.map(c => ({ id: c.id, type: c.type, x: c.x, y: c.y, properties: c.type === "valve5" ? { returnMode: c.properties?.returnMode === "spring" ? "spring" : "memory" } : {} })), connections: data.connections.map(w => ({ id: w.id, from: { componentId: w.from.componentId, portId: w.from.portId }, to: { componentId: w.to.componentId, portId: w.to.portId } })), view: { zoom, pan } };
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
  const ensure = id => { if (!graph.has(id)) graph.set(id, new Set()); };
  const link = (a, b) => { ensure(a); ensure(b); graph.get(a).add(b); graph.get(b).add(a); };
  const pressureSeeds = [];
  const exhaustSeeds = [];
  for (const c of circuit.components) {
    for (const portId of Object.keys(TYPES[c.type].ports)) ensure(key(c.id, portId));
    if (c.type === "source") pressureSeeds.push(key(c.id, "P"));
    if (c.type === "valve3" || c.type === "valve5") {
      exhaustSeeds.push(key(c.id, "R"));
      if (c.type === "valve5") exhaustSeeds.push(key(c.id, "S"));
    }
    if (c.type === "valve3") {
      if (runtime.pressed[c.id]) link(key(c.id, "P"), key(c.id, "A"));
      else link(key(c.id, "A"), key(c.id, "R"));
    }
    if (c.type === "valve5") {
      const active = !!runtime.valves[c.id] || !!runtime.pressed[c.id];
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
  const conflicts = new Set([...pressure].filter(node => exhaust.has(node)));
  for (const c of circuit.components) {
    if (c.type === "single") runtime.cylinders[c.id] = pressure.has(key(c.id, "A")) && !conflicts.has(key(c.id, "A")) ? "extended" : "retracted";
    if (c.type === "double") {
      const a = key(c.id, "A"), b = key(c.id, "B");
      if (pressure.has(a) && exhaust.has(b) && !conflicts.has(a) && !conflicts.has(b)) runtime.cylinders[c.id] = "extended";
      else if (pressure.has(b) && exhaust.has(a) && !conflicts.has(a) && !conflicts.has(b)) runtime.cylinders[c.id] = "retracted";
    }
  }
  return { pressure, exhaust, conflicts };
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
  const path = svg("path", { d: `M ${start.x} ${start.y} H ${mid} V ${end.y} H ${end.x}`, class: `wire ${state}${selected?.kind === "wire" && selected.id === w.id ? " selected" : ""}`, tabindex: running ? "-1" : "0", role: "button", "aria-label": `Conducte ${w.from.portId} a ${w.to.portId}: ${state === "pressure" ? "amb pressió" : state === "exhaust" ? "escapament" : "sense pressió"}` }, world);
  path.addEventListener("click", e => { e.stopPropagation(); if (!running) { selected = { kind: "wire", id: w.id }; render(); } });
  path.addEventListener("keydown", e => { if (e.key === "Enter" && !running) { selected = { kind: "wire", id: w.id }; render(); } });
}
function drawSymbol(group, c, previousCylinderState) {
  const def = TYPES[c.type];
  if (c.type === "source") {
    svg("circle", { cx: 50, cy: 51, r: 22, class: "symbol" }, group);
    svg("path", { d: "M39 61V46L50 38 61 46V61", class: "symbol" }, group);
  } else if (c.type === "valve3" || c.type === "valve5") {
    svg("line", { x1: def.w / 2, y1: 28, x2: def.w / 2, y2: def.h - 20, class: "symbol" }, group);
    svg("path", { d: `M25 ${def.h / 2 + 16} H${def.w - 25} m-13 -9 13 9 -13 9`, class: "symbol" }, group);
    svgText(group, def.w / 2, 19, c.type === "valve3" ? "3/2 · POLSADOR" : "5/2 · COMMUTACIÓ", "sub", { "text-anchor": "middle" });
    const active = c.type === "valve3" ? !!runtime.pressed[c.id] : !!runtime.valves[c.id] || !!runtime.pressed[c.id];
    const button = svg("circle", { cx: def.w / 2, cy: -12, r: 13, class: `actuator${active ? " on" : ""}`, role: "button", tabindex: running ? "0" : "-1", "aria-label": c.type === "valve3" ? "Mantén premut el polsador 3/2" : "Commuta la vàlvula 5/2" }, group);
    svgText(group, def.w / 2, -8, c.type === "valve3" ? "P" : "↕", "actuator-label", { "text-anchor": "middle" });
    const trigger = e => { e.stopPropagation(); if (!running) return; if (c.type === "valve5" && c.properties.returnMode !== "spring") { runtime.valves[c.id] = !runtime.valves[c.id]; render(); } else { activeMomentaryId = c.id; runtime.pressed[c.id] = true; render(); } };
    const release = e => { e.stopPropagation(); releaseMomentary(); };
    button.addEventListener("pointerdown", trigger);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("keydown", e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); trigger(e); } });
    button.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") release(e); });
  } else {
    svg("rect", { x: 20, y: 31, width: 105, height: 46, rx: 4, class: "symbol" }, group);
    const extended = runtime.cylinders[c.id] === "extended";
    const pistonX = extended ? 100 : 56;
    const piston = svg("rect", { x: pistonX, y: 34, width: 10, height: 40, class: "piston" }, group);
    const rod = svg("line", { x1: pistonX + 10, y1: 54, x2: extended ? 169 : 127, y2: 54, class: "symbol" }, group);
    if (previousCylinderState && previousCylinderState !== runtime.cylinders[c.id] && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const oldX = previousCylinderState === "extended" ? 100 : 56;
      const oldEnd = previousCylinderState === "extended" ? 169 : 127;
      svg("animate", { attributeName: "x", from: oldX, to: pistonX, dur: ".35s", fill: "freeze" }, piston);
      svg("animate", { attributeName: "x1", from: oldX + 10, to: pistonX + 10, dur: ".35s", fill: "freeze" }, rod);
      svg("animate", { attributeName: "x2", from: oldEnd, to: extended ? 169 : 127, dur: ".35s", fill: "freeze" }, rod);
    }
    if (c.type === "single") svgText(group, 17, 89, "↤ molla", "sub");
    else svgText(group, 17, 99, "A", "sub");
  }
}
function renderComponent(world, c, previousCylinderState) {
  const def = TYPES[c.type];
  const group = svg("g", { transform: `translate(${c.x} ${c.y})`, class: `component${selected?.kind === "component" && selected.id === c.id ? " selected" : ""}`, role: "button", tabindex: "0", "aria-label": `${def.label}: ${c.id}` }, world);
  svg("rect", { x: 0, y: 0, width: def.w, height: def.h, rx: 10, class: "body" }, group);
  svgText(group, 9, def.h - 10, def.short, "label");
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
    const anchor = x <= 0 ? "end" : x >= def.w ? "start" : "middle";
    svgText(group, x <= 0 ? x + 15 : x >= def.w ? x - 15 : x, y < 20 ? y + 23 : y > def.h - 15 ? y - 14 : y - 13, portId, "port-label", { "text-anchor": x <= 0 ? "start" : x >= def.w ? "end" : anchor });
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
  if (!selected) { const p = document.createElement("p"); p.textContent = "Selecciona un component per veure'n els ports i l'estat."; panel.append(p); return; }
  if (selected.kind === "wire") { const h = document.createElement("h3"); h.textContent = "Conducte seleccionat"; panel.append(h); const p = document.createElement("p"); p.textContent = "Uneix dos ports pneumàtics."; panel.append(p); return; }
  const c = circuit.components.find(x => x.id === selected.id); if (!c) return;
  const h = document.createElement("h3"); h.textContent = TYPES[c.type].label; panel.append(h);
  for (const portId of Object.keys(TYPES[c.type].ports)) { const pill = document.createElement("span"); pill.className = "pill"; pill.textContent = `${portId}: ${portState(c.id, portId) === "pressure" ? "pressió" : portState(c.id, portId) === "exhaust" ? "escapament" : "sense pressió"}`; panel.append(pill); }
  if (c.type === "single" || c.type === "double") { const p = document.createElement("p"); p.textContent = `Èmbol: ${runtime.cylinders[c.id] === "extended" ? "estès" : "retret"}`; panel.append(p); }
  if (c.type === "valve5" && !running) {
    const label = document.createElement("label"); label.className = "field-label"; label.textContent = "Retorn"; label.htmlFor = "returnMode"; panel.append(label);
    const select = document.createElement("select"); select.id = "returnMode"; select.className = "text-field";
    for (const [value, text] of [["memory", "Enclavament"], ["spring", "Molla"]]) { const opt = document.createElement("option"); opt.value = value; opt.textContent = text; select.append(opt); }
    select.value = c.properties.returnMode;
    select.addEventListener("change", () => edit(() => { c.properties.returnMode = select.value; })); panel.append(select);
  }
  if (running && (c.type === "valve3" || c.type === "valve5")) {
    const button = document.createElement("button"); button.className = "secondary wide";
    button.textContent = c.type === "valve5" && c.properties.returnMode !== "spring" ? "Commuta la vàlvula" : "Mantén premut";
    const trigger = e => { e.preventDefault(); if (c.type === "valve5" && c.properties.returnMode !== "spring") runtime.valves[c.id] = !runtime.valves[c.id]; else { activeMomentaryId = c.id; runtime.pressed[c.id] = true; } render(); };
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
  $("canvasHint").textContent = running ? "Acciona la vàlvula i observa els conductes." : "Clica dos ports per connectar-los.";
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
  const source = { id: "font", type: "source", x: 100, y: 270, properties: {} };
  const valve = { id: "valvula", type: kind === "simple" ? "valve3" : "valve5", x: 395, y: 255, properties: kind === "simple" ? {} : { returnMode: "memory" } };
  const cylinder = { id: "cilindre", type: kind === "simple" ? "single" : "double", x: 800, y: 260, properties: {} };
  const connections = [
    { id: "conducte_p", from: { componentId: "font", portId: "P" }, to: { componentId: "valvula", portId: "P" } },
    { id: "conducte_a", from: { componentId: "valvula", portId: "A" }, to: { componentId: "cilindre", portId: "A" } }
  ];
  if (kind === "double") connections.push({ id: "conducte_b", from: { componentId: "valvula", portId: "B" }, to: { componentId: "cilindre", portId: "B" } });
  circuit = { format: FORMAT, version: VERSION, metadata: { name: kind === "simple" ? "Exemple: cilindre simple i vàlvula 3/2" : "Exemple: cilindre doble i vàlvula 5/2" }, components: [source, valve, cylinder], connections, view: { zoom: 1, pan: { x: 0, y: 0 } } };
  selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
  status(kind === "simple" ? "Exemple 3/2 carregat. Prem Simula i mantén premut el polsador." : "Exemple 5/2 carregat. Prem Simula i commuta la vàlvula.");
}
function setupLibrary() {
  for (const [type, def] of Object.entries(TYPES)) {
    const button = document.createElement("button"); button.className = "library-item"; button.type = "button"; button.draggable = true; button.dataset.type = type;
    const glyph = document.createElement("span"); glyph.className = "glyph"; glyph.textContent = def.glyph;
    const labels = document.createElement("span"); const title = document.createElement("strong"); title.textContent = def.label; const hint = document.createElement("small"); hint.textContent = def.hint; labels.append(title, hint); button.append(glyph, labels);
    button.addEventListener("click", () => { if (running) return; selectedType = selectedType === type ? null : type; render(); status(selectedType ? `Fes clic al llenç per col·locar ${def.label}.` : "Eina cancel·lada."); });
    button.addEventListener("dragstart", e => { if (running) { e.preventDefault(); return; } e.dataTransfer.setData("text/plain", type); });
    $("libraryItems").append(button);
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
  $("deleteBtn").addEventListener("click", deleteSelected);
  $("undoBtn").addEventListener("click", undo);
  $("redoBtn").addEventListener("click", redo);
  $("simulateBtn").addEventListener("click", () => setRunning(!running));
  $("resetBtn").addEventListener("click", () => { resetRuntime(); render(); status("Simulació reiniciada."); });
  $("zoomInBtn").addEventListener("click", () => { circuit.view.zoom = clamp(circuit.view.zoom * 1.2, .55, 2.4); render(); });
  $("zoomOutBtn").addEventListener("click", () => { circuit.view.zoom = clamp(circuit.view.zoom / 1.2, .55, 2.4); render(); });
  $("fitBtn").addEventListener("click", () => { circuit.view = { zoom: 1, pan: { x: 0, y: 0 } }; render(); });
  $("exampleSimpleBtn").addEventListener("click", () => loadExample("simple"));
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
  } catch (_) { $("backupToggle").checked = false; }
  resetRuntime(); render();
}
init();
