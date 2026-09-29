Warning: truncated output (original token count: 24818)
Total output lines: 1216

"use strict";

// THOSFLUID MVP: simulació lògica pneumàtica, sense magnituds físiques.
const NS = "http://www.w3.org/2000/svg";
const FORMAT = "thosfluid-circuit";
const VERSION = 2;
const BACKUP_KEY = "thosfluid:last-circuit:v1";
const BACKUP_OPTION_KEY = "thosfluid:backup-enabled";
const MAX_COMPONENTS = 80;
const MAX_CONNECTIONS = 160;

const TYPES = {
  source: { label: "Font d'aire", short: "FONT", hint: "Equivalent al compressor", glyph: "◉", family: "supply", w: 105, h: 100, ports: { P: [105, 50] } },
  note: { label: "Anotació", short: "TEXT", hint: "Afegeix una nota al circuit", glyph: "T", family: "connections", w: 190, h: 58, ports: {} },
  tee: { label: "Unió en T", short: "UNIÓ EN T", hint: "Deriva el conducte cap a una tercera branca", glyph: "┬", family: "connections", w: 100, h: 90, ports: { A: [0, 45], B: [100, 45], C: [50, 90] } },
  receiver: { label: "Acumulador", short: "ACUMULADOR", hint: "Pas d'aire; sense acumulació calculada", glyph: "▱", family: "supply", w: 200, h: 120, ports: { P: [0, 60], A: [200, 60] } },
  maintenance: { label: "Unitat de manteniment", short: "FILTRE · REGULADOR · LUBRICADOR", hint: "Passa l'aire; sense regulació física", glyph: "⚙", family: "supply", w: 260, h: 140, ports: { P: [0, 70], A: [260, 70] } },
  checkValve: { label: "Vàlvula antiretorn", short: "ANTIRETORN", hint: "Deixa passar l'aire en un sentit", glyph: "▷", family: "regulation", w: 220, h: 120, ports: { P: [0, 60], A: [220, 60] } },
  flowRegulator: { label: "Regulador de cabal", short: "REGULADOR", hint: "Pas qualitatiu: tancat, poc, mitjà o obert", glyph: "↗", family: "regulation", w: 220, h: 120, ports: { P: [0, 60], A: [220, 60] } },
  flowRegulatorOneWay: { label: "Regulador unidireccional", short: "REGULADOR + ANTIRETORN", hint: "Regula un sentit i deixa lliure el retorn", glyph: "↗", family: "regulation", w: 240, h: 130, ports: { P: [0, 65], A: [240, 65] } },
  valve2: { label: "Vàlvula 2/2 NC", short: "2/2 NC", hint: "Accionament manual", glyph: "⇄", family: "valves", w: 250, h: 155, ports: { P: [115, 155], A: [125, 0] } },
  valve3: { label: "Vàlvula 3/2", short: "3/2", hint: "Accionament manual", glyph: "⇄", family: "valves", w: 250, h: 155, ports: { P: [115, 155], A: [125, 0], R: [145, 155] } },
  valve4: { label: "Vàlvula 4/2", short: "4/2", hint: "Palanca · enclavament", glyph: "⇅", family: "valves", w: 265, h: 155, ports: { P: [145, 155], A: [135, 0], B: [160, 0], R: [165, 155] } },
  valve5: { label: "Vàlvula 5/2", short: "5/2", hint: "Accionament manual", glyph: "⇅", family: "valves", w: 265, h: 155, ports: { P: [145, 155], A: [135, 0], B: [160, 0], R: [125, 155], S: [165, 155] } },
  valve53: { label: "Vàlvula 5/3 centre tancat", short: "5/3", hint: "Tres posicions; centre tancat", glyph: "⇅", family: "valves", w: 300, h: 155, ports: { P: [165, 155], A: [155, 0], B: [180, 0], R: [145, 155], S: [185, 155] } },
  valve5Pilot: { label: "Vàlvula 5/2 de doble pilotatge", short: "5/2 PILOTADA", hint: "Canvia amb un senyal pneumàtic", glyph: "⇄", family: "valves", w: 290, h: 155, ports: { P: [155, 155], A: [145, 0], B: [170, 0], R: [135, 155], S: [175, 155], X: [0, 72], Y: [290, 72] } },
  limitValve3: { label: "Final de cursa mecànic 3/2", short: "FINAL 3/2", hint: "S'acciona en arribar al cilindre", glyph: "⚙", family: "control", w: 250, h: 155, ports: { P: [115, 155], A: [125, 0], R: [145, 155] } },
  logicOr: { label: "Vàlvula lògica OR", short: "OR", hint: "La sortida s'activa amb qualsevol entrada", glyph: "∨", family: "logic", w: 220, h: 120, ports: { X: [0, 35], Y: [0, 85], A: [220, 60] } },
  logicAnd: { label: "Vàlvula lògica AND", short: "AND", hint: "La sortida s'activa amb dues entrades", glyph: "∧", family: "logic", w: 220, h: 120, ports: { X: [0, 35], Y: [0, 85], A: [220, 60] } },
  timer3: { label: "Temporitzador pneumàtic 3/2", short: "TEMPORITZADOR", hint: "Retard qualitatiu a l'activació", glyph: "◷", family: "logic", w: 220, h: 140, ports: { P: [0, 70], A: [220, 70], R: [110, 140], X: [110, 0] } },
  single: { label: "Cilindre simple", short: "CILINDRE", hint: "Retorn per molla", glyph: "▣", family: "actuators", w: 215, h: 140, ports: { A: [40, 140] } },
  double: { label: "Cilindre doble", short: "CILINDRE", hint: "Doble efecte", glyph: "▤", family: "actuators", w: 215, h: 140, ports: { A: [40, 140], B: [130, 140] } },
  electricSource: { label: "Font elèctrica", short: "FONT ELÈCTRICA", hint: "Alimentació lògica, sense tensió calculada", glyph: "⏚", family: "electrical", w: 150, h: 100, ports: { plus: [150, 30], minus: [150, 70] } },
  electricPush: { label: "Polsador elèctric NO", short: "POLSADOR NO", hint: "Tanca el contacte mentre es prem", glyph: "○", family: "electrical", w: 155, h: 100, ports: { "1": [0, 50], "2": [155, 50] } },
  electricPushNC: { label: "Polsador elèctric NC", short: "POLSADOR NC", hint: "Obre el contacte mentre es prem", glyph: "○", family: "electrical", w: 155, h: 100, ports: { "1": [0, 50], "2": [155, 50] } },
  electricSwitch: { label: "Interruptor elèctric", short: "INTERRUPTOR", hint: "Canvia entre obert i tancat", glyph: "I", family: "electrical", w: 155, h: 100, ports: { "1": [0, 50], "2": [155, 50] } },
  electricLimit: { label: "Final de cursa elèctric", short: "FINAL ELÈCTRIC", hint: "Canvia amb la posició del cilindre", glyph: "FC", family: "electrical", w: 180, h: 100, ports: { "1": [0, 50], "2": [180, 50] } },
  relayCoil: { label: "Bobina de relé", short: "RELÉ", hint: "Activa els contactes amb la mateixa referència", glyph: "K", family: "electrical", w: 160, h: 100, ports: { A1: [0, 35], A2: [0, 70] } },
  relayContactNO: { label: "Contacte de relé NO", short: "RELÉ NO", hint: "Tanca quan s'activa el relé vinculat", glyph: "K", family: "electrical", w: 160, h: 100, ports: { "13": [0, 50], "14": [160, 50] } },
  relayContactNC: { label: "Contacte de relé NC", short: "RELÉ NC", hint: "Obre quan s'activa el relé vinculat", glyph: "K", family: "electrical", w: 160, h: 100, ports: { "21": [0, 50], "22": [160, 50] } },
  valve5Electric: { label: "Electrovàlvula 5/2 monoestable", short: "5/2 ELÈCTRICA", hint: "Bobina elèctrica i retorn per molla", glyph: "Y", family: "electrical", w: 290, h: 155, ports: { P: [155, 155], A: [145, 0], B: [170, 0], R: [135, 155], S: [175, 155], X1: [0, 55], X2: [0, 95] } }
};
const FAMILY_ORDER = ["supply", "connections", "valves", "actuators", "control", "regulation", "logic", "electrical"];
const FAMILIES = {
  supply: "Alimentació i preparació de l'aire",
  connections: "Unions i derivacions",
  valves: "Vàlvules distribuïdores",
  actuators: "Actuadors",
  control: "Accionaments i sensors",
  regulation: "Regulació i pas",
  logic: "Lògica i temporització",
  electrical: "Electroneumàtica"
};
const collapsedFamilies = new Set();
const DISTRIBUTORS = new Set(["valve2", "valve3", "valve4", "valve5"]);
const ELECTRICAL_TYPES = new Set(["electricSource", "electricPush", "electricPushNC", "electricSwitch", "electricLimit", "relayCoil", "relayContactNO", "relayContactNC"]);
function isElectricalPort(type, portId) { return ELECTRICAL_TYPES.has(type) || (type === "valve5Electric" && (portId === "X1" || portId === "X2")); }
const DEFAULT_ACTUATOR = { valve2: "pushbutton", valve3: "pushbutton", valve4: "lever", valve5: "pushbutton" };
const defaultValveProperties = type => ({ actuator: DEFAULT_ACTUATOR[type], returnMode: type === "valve2" || type === "valve3" ? "spring" : "memory" });
function defaultProperties(type) {
  if (DISTRIBUTORS.has(type)) return defaultValveProperties(type);
  if (type === "valve53") return { center: "closed" };
  if (type === "flowRegulator") return { opening: "open" };
  if (type === "flowRegulatorOneWay") return { opening: "medium", regulatedDirection: "PtoA" };
  if (type === "checkValve") return { direction: "PtoA" };
  if (type === "limitValve3") return { targetCylinder: "", targetEnd: "extended" };
  if (type === "timer3") return { delay: "medium" };
  if (type === "relayCoil" || type === "relayContactNO" || type === "relayContactNC") return { relay: "K1" };
  if (type === "note") return { text: "Escriu una nota" };
  if (type === "electricLimit") return { targetCylinder: "", targetEnd: "extended" };
  return {};
}
function normalizeProperties(type, properties = {}) {
  if (DISTRIBUTORS.has(type)) return { actuator: ["pushbutton", "lever", "pedal"].includes(properties.actuator) ? properties.actuator : DEFAULT_ACTUATOR[type], returnMode: ["spring", "memory"].includes(properties.returnMode) ? properties.returnMode : defaultValveProperties(type).returnMode };
  if (type === "flowRegulator") return { opening: ["closed", "low", "medium", "open"].includes(properties.opening) ? properties.opening : "open" };
  if (type === "flowRegulatorOneWay") return { opening: ["closed", "low", "medium", "open"].includes(properties.opening) ? properties.opening : "medium", regulatedDirection: properties.regulatedDirection === "AtoP" ? "AtoP" : "PtoA" };
  if (type === "checkValve") return { direction: properties.direction === "AtoP" ? "AtoP" : "PtoA" };
  if (type === "valve53") return { center: "closed" };
  if (type === "limitValve3") return { targetCylinder: typeof properties.targetCylinder === "string" ? properties.targetCylinder : "", targetEnd: properties.targetEnd === "retracted" ? "retracted" : "extended" };
  if (type === "timer3") return { delay: ["short", "medium", "long"].includes(properties.delay) ? properties.delay : "medium" };
  if (type === "relayCoil" || type === "relayContactNO" || type === "relayContactNC") return { relay: String(properties.relay || "K1").slice(0, 12) };
  if (type === "note") return { text: String(properties.text || "Escriu una nota").slice(0, 120) };
  if (type === "electricLimit") return { targetCylinder: typeof properties.targetCylinder === "string" ? properties.targetCylinder : "", targetEnd: properties.targetEnd === "retracted" ? "retracted" : "extended" };
  return {};
}

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
const isCylinder = component => component?.type === "single" || component?.type === "double";
function targetCylinderFor(component) {
  return circuit.components.find(item => isCylinder(item) && item.id === component.properties?.targetCylinder) || circuit.components.find(isCylinder);
}

let circuit = { format: FORMAT, version: VERSION, metadata: { name: "Circuit nou" }, components: [], connections: [], view: { zoom: 1, pan: { x: 0, y: 0 } } };
let selected = null;
let selectedType = null;
let pendingPort = null;
let running = false;
let runtime = { valves: {}, pressed: {}, cylinders: {}, timers: {} };
let simulation = null;
const timerHandles = new Map();
let simulationRefreshPending = false;
let history = [];
let future = [];
let dirty = false;
let pointerAction = null;
let activeMomentaryId = null;
let panMode = false;
let clipboardComponent = null;
let cursorWorldPoint = null;

function status(message) { $("statusText").textContent = message; }
function snapshot() { return deepCopy(circuit); }
function serializableCircuit() {
  const data = snapshot(); data.format = FORMAT; data.version = VERSION;
  data.connections = data.connections.map(w => ({ ...w, route: Array.isArray(w.route) ? w.route : [] }));
  return data;
}
function remember() {
  history.push(snapshot());
  if (history.length > 50) history.shift();
  future = [];
}
function storeBackup() {
  if (!$("backupToggle").checked) return;
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify(serializableCircuit()));
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
  for (const handle of timerHandles.values()) clearTimeout(handle);
  timerHandles.clear();
  runtime = { valves: {}, pressed: {}, cylinders: {}, timers: {}, relays: {}, electrical: {} };
  for (const component of circuit.components) {
    if (DISTRIBUTORS.has(component.type)) runtime.valves[component.id] = false;
    if (component.type === "valve53") runtime.valves[component.id] = "center";
    if (component.type === "valve5Pilot") runtime.valves[component.id] = false;
    if (component.type === "timer3") runtime.timers[component.id] = false;
    if (component.type === "valve5Electric") runtime.valves[component.id] = false;
    if (component.type === "electricSwitch") runtime.valves[component.id] = false;
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
  const properties = defaultProperties(type);
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
function copySelected() {
  if (running || selected?.kind !== "component") return;
  const component = circuit.components.find(c => c.id === selected.id);
  if (!component) return;
  clipboardComponent = deepCopy(component);
  $("pasteBtn").disabled = false;
  status("Component copiat. Enganxa'l per crear-ne una còpia al llenç.");
}
function pasteSelected() {
  if (running || !clipboardComponent || circuit.components.length >= MAX_COMPONENTS) return;
  edit(() => {
    const copy = deepCopy(clipboardComponent);
    copy.id = makeId("c"); copy.x += 30; copy.y += 30;
    clipboardComponent = deepCopy(copy);
    circuit.components.push(copy); selected = { kind: "component", id: copy.id };
  });
  status("Còpia del component enganxada. Les connexions s'han de tornar a dibuixar.");
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
  if (!pendingPort) { pendingPort = { ...next, route: [] }; if (!cursorWorldPoint) cursorWorldPoint = { x: 600, y: 350 }; status(`Port ${portId} triat. Clica punts del recorregut, o usa les fletxes i Retorn; acaba en un port compatible.`); render(); return; }
  if (pendingPort.componentId === componentId && pendingPort.portId === portId) { pendingPort = null; render(); return; }
  if (pendingPort.componentId === componentId) { status("Connecta components diferents."); return; }
  const fromType = circuit.components.find(c => c.id === pendingPort.componentId)?.type;
  const toType = circuit.components.find(c => c.id === componentId)?.type;
  if (isElectricalPort(fromType, pendingPort.portId) !== isElectricalPort(toType, portId)) { status("No es poden unir conductes pneumàtics i elèctrics."); return; }
  if (portUsed(pendingPort.componentId, pendingPort.portId) || portUsed(componentId, portId)) { status("Aquest port ja té una connexió."); return; }
  if (circuit.connections.length >= MAX_CONNECTIONS) { status("No es poden afegir més connexions."); return; }
  const from = { componentId: pendingPort.componentId, portId: pendingPort.portId }, route = deepCopy(pendingPort.route || []);
  edit(() => { circuit.connections.push({ id: makeId("w"), from, to: next, route }); pendingPort = null; });
  status(isElectricalPort(toType, portId) ? "Cable elèctric connectat." : "Conducte connectat.");
}
function addRoutePoint(point) {
  if (!pendingPort || running) return;
  pendingPort.route.push({ x: Math.round(point.x), y: Math.round(point.y) });
  status(`Punt de recorregut afegit (${pendingPort.route.length}). Acaba al port de destinació.`);
  render();
}

function validateCircuit(data) {
  if (!data || data.format !== FORMAT || ![1, VERSION].includes(data.version) || !Array.isArray(data.components) || !Array.isArray(data.connections)) throw new Error("El fitxer no és un circuit THOSFLUID compatible.");
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
      if (isElectricalPort(data.components.find(item => item.id === w.from.componentId)?.type, w.from.portId) !== isElectricalPort(data.components.find(item => item.id === w.to.componentId)?.type, w.to.portId)) throw new Error("Una connexió barreja ports pneumàtics i elèctrics.");
      const portKey = key(end.componentId, end.portId);
      if (used.has(portKey)) throw new Error("Hi ha un port connectat més d'una vegada.");
      used.add(portKey);
    }
  }
  const name = String(data.metadata?.name || "Circuit nou").slice(0, 80);
  const zoom = Number.isFinite(data.view?.zoom) ? clamp(data.view.zoom, .55, 2.4) : 1;
  const pan = { x: Number.isFinite(data.view?.pan?.x) ? clamp(data.view.pan.x, -1500, 1500) : 0, y: Number.isFinite(data.view?.pan?.y) ? clamp(data.view.pan.y, -1000, 1000) : 0 };
  return { format: FORMAT, version: VERSION, metadata: { name }, components: data.components.map(c => ({ id: c.id, type: c.type, x: c.x, y: c.y, properties: normalizeProperties(c.type, c.properties) })), connections: data.connections.map(w => ({ id: w.id, from: { componentId: w.from.componentId, portId: w.from.portId }, to: { componentId: w.to.componentId, portId: w.to.portId }, route: Array.isArray(w.route) ? w.route.filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y) && Math.abs(p.x) <= 10000 && Math.abs(p.y) <= 10000).slice(0, 100).map(p => ({ x: p.x, y: p.y })) : [] })), view: { zoom, pan } };
}
function downloadCircuit() {
  const text = JSON.stringify(serializableCircuit(), null, 2);
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

function queueSimulationRefresh() {
  if (simulationRefreshPending) return;
  simulationRefreshPending = true;
  requestAnimationFrame(() => { simulationRefreshPending = false; if (running) render(); });
}
function buildElectricalSimulation() {
  const relays = Object.create(null), energized = Object.create(null);
  const nodes = [];
  let plus = new Set(), minus = new Set(), graph = new Map();
  for (const c of circuit.components) if (ELECTRICAL_TYPES.has(c.type) || c.type === "valve5Electric") {
    for (const p of Object.keys(TYPES[c.type].ports).filter(portId => isElectricalPort(c.type, portId))) nodes.push(key(c.id, p));
    if (c.type === "relayCoil") relays[c.properties?.relay || "K1"] = false;
  }
  const sources = circuit.components.filter(c => c.type === "electricSource");
  const isPlus = id => sources.some(c => id === key(c.id, "plus"));
  const isMinus = id => sources.some(c => id === key(c.id, "minus"));
  let stable = false;
  for (let pass = 0; pass < 8 && !stable; pass++) {
    graph = new Map(nodes.map(node => [node, new Set()]));
    const link = (a, b) => { if (graph.has(a) && graph.has(b)) { graph.get(a).add(b); graph.get(b).add(a); } };
    for (const w of circuit.connections) {
      const a = circuit.components.find(c => c.id === w.from.componentId), b = circuit.components.find(c => c.id === w.to.componentId);
      if (a && b && isElectricalPort(a.type, w.from.portId) && isElectricalPort(b.type, w.to.portId)) link(key(a.id, w.from.portId), key(b.id, w.to.portId));
    }
    for (const c of circuit.components) {
      if (c.type === "electricPush" && runtime.pressed[c.id]) link(key(c.id, "1"), key(c.id, "2"));
      if (c.type === "electricPushNC" && !runtime.pressed[c.id]) link(key(c.id, "1"), key(c.id, "2"));
      if (c.type === "electricSwitch" && runtime.valves[c.id]) link(key(c.id, "1"), key(c.id, "2"));
      if (c.type === "electricLimit") { const target = targetCylinderFor(c); if (target && runtime.cylinders[target.id] === (c.properties?.targetEnd || "extended")) link(key(c.id, "1"), key(c.id, "2")); }
      if (c.type === "relayContactNO" && relays[c.properties?.relay || "K1"]) link(key(c.id, "13"), key(c.id, "14"));
      if (c.type === "relayContactNC" && !relays[c.properties?.relay || "K1"]) link(key(c.id, "21"), key(c.id, "22"));
    }
    const flood = seeds => { const seen = new Set(seeds), queue = [...seeds]; for (let i = 0; i < queue.length; i++) for (const next of graph.get(queue[i]) || []) if (!seen.has(next)) { seen.add(next); queue.push(next); } return seen; };
    plus = flood(nodes.filter(isPlus)); minus = flood(nodes.filter(isMinus));
    const nextRelays = Object.create(null);
    for (const c of circuit.components) if (c.type === "relayCoil") nextRelays[c.properties?.relay || "K1"] = plus.has(key(c.id, "A1")) && minus.has(key(c.id, "A2"));
    stable = Object.keys(nextRelays).every(name => nextRelays[name] === relays[name]);
    Object.assign(relays, nextRelays);
    for (const c of circuit.components) if (c.type === "valve5Electric") energized[c.id] = plus.has(key(c.id, "X1")) && minus.has(key(c.id, "X2"));
  }
  const activeWires = new Set();
  for (const w of circuit.connections) {
    const a = key(w.from.componentId, w.from.portId), b = key(w.to.componentId, w.to.portId);
    if (plus.has(a) || plus.has(b) || minus.has(a) || minus.has(b)) activeWires.add(w.id);
  }
  return { relays, energized, activeWires, activePorts: new Set([...plus, ...minus]) };
}
function buildSimulation() {
  const electrical = buildElectricalSimulation();
  runtime.relays = electrical.relays;
  runtime.electrical = electrical.energized;
  for (const c of circuit.components) if (c.type === "valve5Electric") {
    runtime.valves[c.id] = !!runtime.electrical[c.id];
  }
  const graph = new Map(), reverseGraph = new Map();
  const ensure = id => { if (!graph.has(id)) graph.set(id, new Map()); if (!reverseGraph.has(id)) reverseGraph.set(id, new Map()); };
  const direct = (a, b, rate = 3) => { if (rate <= 0) return; ensure(a); ensure(b); graph.get(a).set(b, rate); reverseGraph.get(b).set(a, rate); };
  const link = (a, b, rate = 3) => { direct(a, b, rate); direct(b, a, rate); };
  const linkRates = (a, b, ab, ba) => { direct(a, b, ab); direct(b, a, ba); };
  const pressureSeeds = [], exhaustSeeds = [];
  for (const c of circuit.components) {
    for (const portId of Object.keys(TYPES[c.type].ports)) if (!isElectricalPort(c.type, portId)) ensure(key(c.id, portId));
    const port = id => key(c.id, id);
    if (c.type === "source") pressureSeeds.push(port("P"));
    if (c.type === "tee") { link(port("A"), port("B")); link(port("B"), port("C")); }
    if (c.type === "receiver" || c.type === "maintenance") link(port("P"), port("A"));
    if (c.type === "flowRegulator") link(port("P"), port("A"), ({ closed: 0, low: 1, medium: 2, open: 3 })[c.properties?.opening] ?? 3);
    if (c.type === "checkValve") c.properties?.direction === "AtoP" ? direct(port("A"), port("P")) : direct(port("P"), port("A"));
    if (c.type === "flowRegulatorOneWay") {
      const rate = ({ closed: 0, low: 1, medium: 2, open: 3 })[c.properties?.opening] ?? 2;
      if (c.properties?.regulatedDirection === "AtoP") linkRates(port("P"), port("A"), 3, rate);
      else linkRates(port("P"), port("A"), rate, 3);
    }
    if (["valve3", "valve4", "valve5", "valve53", "valve5Pilot", "valve5Electric", "limitValve3", "timer3"].includes(c.type)) exhaustSeeds.push(port("R"));
    if (["valve5", "valve53", "valve5Pilot", "valve5Electric"].includes(c.type)) exhaustSeeds.push(port("S"));
    const active = c.properties?.returnMode === "spring" ? !!runtime.pressed[c.id] : !!runtime.valves[c.id];
    if (c.type === "valve2" && active) link(port("P"), port("A"));
    if (c.type === "valve3") active ? link(port("P"), port("A")) : link(port("A"), port("R"));
    if (c.type === "valve4") {
      if (active) { link(port("P"), port("A")); link(port("B"), port("R")); }
      else { link(port("P"), port("B")); link(port("A"), port("R")); }
    }
    if (c.type === "valve5" || c.type === "valve5Pilot" || c.type === "valve5Electric") {
      const pilotActive = c.type === "valve5Pilot" || c.type === "valve5Electric" ? !!runtime.valves[c.id] : active;
      if (pilotActive) { link(port("P"), port("A")); link(port("B"), port("S")); }
      else { link(port("P"), port("B")); link(port("A"), port("R")); }
    }
    if (c.type === "valve53") {
      if (runtime.valves[c.id] === "left") { link(port("P"), port("A")); link(port("B"), port("S")); }
      if (runtime.valves[c.id] === "right") { link(port("P"), port("B")); link(port("A"), port("R")); }
    }
    if (c.type === "limitValve3") {
      const targetId = targetCylinderFor(c)?.id;
      const triggered = !!targetId && runtime.cylinders[targetId] === (c.properties?.targetEnd || "extended");
      if (triggered) link(port("P"), port("A")); else link(port("A"), port("R"));
    }
    if (c.type === "timer3") {
      if (runtime.timers[c.id]) link(port("P"), port("A")); else link(port("A"), port("R"));
    }
  }
  for (const w of circuit.connections) {
    const a = circuit.components.find(c => c.id === w.from.componentId), b = circuit.components.find(c => c.id === w.to.componentId);
    if (a && b && !isElectricalPort(a.type, w.from.portId) && !isElectricalPort(b.type, w.to.portId)) link(key(w.from.componentId, w.from.portId), key(w.to.componentId, w.to.portId));
  }
  const flood = (seeds, reverse = false) => {
    const adjacency = reverse ? reverseGraph : graph;
    const found = new Set(seeds), queue = [...seeds];
    for (let i = 0; i < queue.length; i++) for (const next of (adjacency.get(queue[i]) || new Map()).keys()) if (!found.has(next)) { found.add(next); queue.push(next); }
    return found;
  };
  let pressure = flood(pressureSeeds);
  // Pneumatic logic gates pass pressure only after their input conditions are met.
  for (let pass = 0; pass < circuit.components.length; pass++) {
    let changed = false;
    for (const c of circuit.components) {
      if (c.type !== "logicOr" && c.type !== "logicAnd") continue;
      const x = key(c.id, "X"), y = key(c.id, "Y"), out = key(c.id, "A");
      const enabled = c.type === "logicOr" ? pressure.has(x) || pressure.has(y) : pressure.has(x) && pressure.has(y);
      if (!enabled) continue;
      const before = graph.get(x).has(out) || graph.get(y).has(out);
      if (c.type === "logicOr") { if (pressure.has(x)) direct(x, out); if (pressure.has(y)) direct(y, out); }
      else { direct(x, out); direct(y, out); }
      if (!before) changed = true;
    }
    if (!changed) break;
    pressure = flood(pressureSeeds);
  }
  const exhaust = flood(exhaustSeeds, true);
  const distancesFrom = (seeds, reverse = false) => {
    const adjacency = reverse ? reverseGraph : graph;
    const distances = new Map(seeds.map(node => [node, 0])), queue = [...seeds];
    for (let i = 0; i < queue.length; i++) for (const next of (adjacency.get(queue[i]) || new Map()).keys()) if (!distances.has(next)) { distances.set(next, distances.get(queue[i]) + 1); queue.push(next); }
    return distances;
  };
  const pressureDistances = distancesFrom(pressureSeeds), exhaustDistances = distancesFrom(exhaustSeeds, true);
  const speedFlood = (seeds, reverse = false) => {
    const adjacency = reverse ? reverseGraph : graph;
    const levels = new Map(seeds.map(node => [node, 3])), queue = [...seeds];
    for (let i = 0; i < queue.leng…8818 tokens truncated…ue; }));
  }
  if (running && c.type === "valve53") {
    const label = document.createElement("p"); label.textContent = "Tria la posició del distribuïdor."; panel.append(label);
    for (const [position, text] of [["left", "Posició A"], ["center", "Centre tancat"], ["right", "Posició B"]]) {
      const button = document.createElement("button"); button.className = "secondary wide"; button.textContent = text;
      button.addEventListener("click", () => { runtime.valves[c.id] = position; render(); }); panel.append(button);
    }
  }
  if (running && c.type === "limitValve3") { const target = targetCylinderFor(c); const p = document.createElement("p"); p.textContent = `Final mecànic ${target && runtime.cylinders[target.id] === (c.properties.targetEnd || "extended") ? "accionat" : "en repòs"}.`; panel.append(p); }
  if (running && c.type === "timer3") { const p = document.createElement("p"); p.textContent = runtime.timers[c.id] ? "Retard completat; sortida activa." : timerHandles.has(c.id) ? "Retard en curs." : "En espera de senyal a X."; panel.append(p); }
  if (running && c.type === "valve5Pilot") { const p = document.createElement("p"); p.textContent = `Posició ${runtime.valves[c.id] ? "P–A / B–S" : "P–B / A–R"}. X commuta cap a A; Y commuta cap a B.`; panel.append(p); }
  if (running && c.type === "valve5Electric") { const p = document.createElement("p"); p.textContent = runtime.electrical[c.id] ? "Bobina energitzada; posició P–A / B–S." : "Bobina desenergitzada; retorn per molla a P–B / A–R."; panel.append(p); }
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
  $("circuitCanvas").classList.toggle("pan", panMode);
  for (const wire of circuit.connections) renderWire(world, wire);
  for (const comp of circuit.components) renderComponent(world, comp, previousCylinderStates[comp.id]);
  if (pendingPort && cursorWorldPoint) {
    const source = circuit.components.find(c => c.id === pendingPort.componentId);
    if (source) { const points = [pointOnComponent(source, pendingPort.portId), ...(pendingPort.route || []), cursorWorldPoint]; svg("path", { d: points.map((p, i) => `${i ? "L" : "M"} ${p.x} ${p.y}`).join(" "), class: "wire preview-wire" }, world); }
  }
  $("circuitName").value = circuit.metadata.name;
  $("circuitName").disabled = running;
  $("simulateBtn").textContent = running ? "■ Edita" : "▶ Simula";
  $("modeLabel").textContent = running ? "Mode simulació" : "Mode edició";
  $("canvasHint").textContent = running ? "Acciona els comandaments i observa l'aire i els senyals elèctrics." : pendingPort ? "Clica per afegir girs; amb teclat usa fletxes i Retorn. Acaba en un port compatible." : panMode ? "Arrossega el llenç per moure la vista." : "Clica dos ports per connectar-los; afegeix girs amb clics al llenç.";
  $("resetBtn").disabled = !running;
  $("deleteBtn").disabled = running || !selected;
  $("copyBtn").disabled = running || selected?.kind !== "component";
  $("pasteBtn").disabled = running || !clipboardComponent;
  $("panBtn").setAttribute("aria-pressed", String(panMode));
  $("panBtn").classList.toggle("active-tool", panMode);
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
  if (kind === "branch") {
    const source = { id: "font", type: "source", x: 100, y: 300, properties: {} };
    const valve = { id: "valvula", type: "valve3", x: 365, y: 255, properties: defaultValveProperties("valve3") };
    const tee = { id: "derivacio", type: "tee", x: 700, y: 275, properties: {} };
    const cylinderA = { id: "cilindre_a", type: "single", x: 930, y: 125, properties: {} };
    const cylinderB = { id: "cilindre_b", type: "single", x: 930, y: 435, properties: {} };
    circuit = { format: FORMAT, version: VERSION, metadata: { name: "Exemple: derivació en T i dos cilindres" }, components: [source, valve, tee, cylinderA, cylinderB], connections: [
      { id: "aire_font", from: { componentId: source.id, portId: "P" }, to: { componentId: valve.id, portId: "P" } },
      { id: "aire_valvula", from: { componentId: valve.id, portId: "A" }, to: { componentId: tee.id, portId: "A" } },
      { id: "branca_a", from: { componentId: tee.id, portId: "B" }, to: { componentId: cylinderA.id, portId: "A" } },
      { id: "branca_b", from: { componentId: tee.id, portId: "C" }, to: { componentId: cylinderB.id, portId: "A" } }
    ], view: { zoom: .82, pan: { x: 55, y: 12 } } };
    selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
    status("Exemple de derivació carregat. En prémer la 3/2, l'aire arriba als dos cilindres.");
    return;
  }
  if (kind === "electric") {
    const air = { id: "font_aire", type: "source", x: 80, y: 390, properties: {} };
    const electrical = { id: "font_electrica", type: "electricSource", x: 80, y: 130, properties: {} };
    const push = { id: "polsador", type: "electricPush", x: 330, y: 130, properties: {} };
    const valve = { id: "electrovalvula", type: "valve5Electric", x: 600, y: 335, properties: defaultProperties("valve5Electric") };
    const cylinder = { id: "cilindre", type: "double", x: 940, y: 340, properties: {} };
    circuit = { format: FORMAT, version: VERSION, metadata: { name: "Exemple: polsador elèctric i electrovàlvula 5/2" }, components: [air, electrical, push, valve, cylinder], connections: [
      { id: "aire_p", from: { componentId: air.id, portId: "P" }, to: { componentId: valve.id, portId: "P" }, route: [] },
      { id: "aire_a", from: { componentId: valve.id, portId: "A" }, to: { componentId: cylinder.id, portId: "A" }, route: [] },
      { id: "aire_b", from: { componentId: valve.id, portId: "B" }, to: { componentId: cylinder.id, portId: "B" }, route: [] },
      { id: "el_plus", from: { componentId: electrical.id, portId: "plus" }, to: { componentId: push.id, portId: "1" }, route: [{ x: 270, y: 160 }] },
      { id: "el_ordre", from: { componentId: push.id, portId: "2" }, to: { componentId: valve.id, portId: "X1" }, route: [{ x: 525, y: 180 }, { x: 525, y: 390 }] },
      { id: "el_retor", from: { componentId: valve.id, portId: "X2" }, to: { componentId: electrical.id, portId: "minus" }, route: [{ x: 520, y: 430 }, { x: 260, y: 200 }] }
    ], view: { zoom: .86, pan: { x: 35, y: 15 } } };
    selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
    status("Exemple d'electroneumàtica carregat. Simula'l i mantén premut el polsador elèctric.");
    return;
  }
  if (kind === "limit") {
    const source = { id: "font", type: "source", x: 70, y: 310, properties: {} };
    const tee = { id: "derivacio", type: "tee", x: 270, y: 315, properties: {} };
    const start = { id: "ordre_inicial", type: "valve3", x: 440, y: 175, properties: defaultValveProperties("valve3") };
    const limit = { id: "final_cursa", type: "limitValve3", x: 440, y: 420, properties: { targetCylinder: "cilindre_a", targetEnd: "extended" } };
    const cylinderA = { id: "cilindre_a", type: "single", x: 760, y: 130, properties: {} };
    const cylinderB = { id: "cilindre_b", type: "single", x: 760, y: 430, properties: {} };
    circuit = { format: FORMAT, version: VERSION, metadata: { name: "Exemple: final de cursa mecànic" }, components: [source, tee, start, limit, cylinderA, cylinderB], connections: [
      { id: "font_derivacio", from: { componentId: source.id, portId: "P" }, to: { componentId: tee.id, portId: "A" }, route: [] },
      { id: "alimentacio_inicial", from: { componentId: tee.id, portId: "B" }, to: { componentId: start.id, portId: "P" }, route: [] },
      { id: "alimentacio_final", from: { componentId: tee.id, portId: "C" }, to: { componentId: limit.id, portId: "P" }, route: [] },
      { id: "cilindre_inicial", from: { componentId: start.id, portId: "A" }, to: { componentId: cylinderA.id, portId: "A" }, route: [] },
      { id: "sortida_final", from: { componentId: limit.id, portId: "A" }, to: { componentId: cylinderB.id, portId: "A" }, route: [] }
    ], view: { zoom: .82, pan: { x: 50, y: 25 } } };
    selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
    status("Exemple de final de cursa carregat. Acciona la 3/2; quan el primer cilindre arribi al final, s'activarà el segon."); return;
  }
  if (kind === "timer") {
    const source = { id: "font", type: "source", x: 70, y: 300, properties: {} };
    const tee = { id: "derivacio", type: "tee", x: 280, y: 315, properties: {} };
    const timer = { id: "temporitzador", type: "timer3", x: 510, y: 285, properties: { delay: "medium" } };
    const cylinder = { id: "cilindre", type: "single", x: 850, y: 290, properties: {} };
    circuit = { format: FORMAT, version: VERSION, metadata: { name: "Exemple: temporitzador pneumàtic" }, components: [source, tee, timer, cylinder], connections: [
      { id: "font_derivacio", from: { componentId: source.id, portId: "P" }, to: { componentId: tee.id, portId: "A" }, route: [] },
      { id: "pressio_temporitzador", from: { componentId: tee.id, portId: "B" }, to: { componentId: timer.id, portId: "P" }, route: [] },
      { id: "senyal_temporitzador", from: { componentId: tee.id, portId: "C" }, to: { componentId: timer.id, portId: "X" }, route: [] },
      { id: "sortida_cilindre", from: { componentId: timer.id, portId: "A" }, to: { componentId: cylinder.id, portId: "A" }, route: [] }
    ], view: { zoom: .86, pan: { x: 30, y: 10 } } };
    selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
    status("Exemple de temporitzador carregat. Simula'l i observa el retard qualitatiu."); return;
  }
  if (kind === "logic") {
    const source = { id: "font", type: "source", x: 50, y: 280, properties: {} };
    const input = { id: "derivacio_entrades", type: "tee", x: 230, y: 285, properties: {} };
    const logic = { id: "and", type: "logicAnd", x: 430, y: 250, properties: {} };
    const output = { id: "derivacio_sortides", type: "tee", x: 740, y: 270, properties: {} };
    const cylinderA = { id: "cilindre_a", type: "single", x: 970, y: 130, properties: {} };
    const cylinderB = { id: "cilindre_b", type: "single", x: 970, y: 430, properties: {} };
    circuit = { format: FORMAT, version: VERSION, metadata: { name: "Exemple: vàlvula lògica AND" }, components: [source, input, logic, output, cylinderA, cylinderB], connections: [
      { id: "font_entrades", from: { componentId: source.id, portId: "P" }, to: { componentId: input.id, portId: "A" }, route: [] },
      { id: "entrada_x", from: { componentId: input.id, portId: "B" }, to: { componentId: logic.id, portId: "X" }, route: [] },
      { id: "entrada_y", from: { componentId: input.id, portId: "C" }, to: { componentId: logic.id, portId: "Y" }, route: [] },
      { id: "sortida_logica", from: { componentId: logic.id, portId: "A" }, to: { componentId: output.id, portId: "A" }, route: [] },
      { id: "sortida_a", from: { componentId: output.id, portId: "B" }, to: { componentId: cylinderA.id, portId: "A" }, route: [] },
      { id: "sortida_b", from: { componentId: output.id, portId: "C" }, to: { componentId: cylinderB.id, portId: "A" }, route: [] }
    ], view: { zoom: .8, pan: { x: 30, y: 15 } } };
    selected = null; pendingPort = null; history = []; future = []; running = false; dirty = false; resetRuntime(); storeBackup(); render();
    status("Exemple de vàlvula AND carregat. Prova també d'obrir una entrada per comparar-ho amb OR."); return;
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
  canvas.addEventListener("keydown", e => {
    if (running || !pendingPort) return;
    const directions = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
    if (directions[e.key]) { e.preventDefault(); const [dx, dy] = directions[e.key]; cursorWorldPoint = { x: (cursorWorldPoint?.x ?? 600) + dx, y: (cursorWorldPoint?.y ?? 350) + dy }; render(); }
    else if (e.key === "Enter") { e.preventDefault(); addRoutePoint(cursorWorldPoint || { x: 600, y: 350 }); }
  });
  canvas.addEventListener("pointerdown", e => {
    if (running) { selected = null; renderInspector(); return; }
    const p = worldPoint(e);
    if (panMode) {
      pointerAction = { kind: "pan", start: screenPoint(e), x: circuit.view.pan.x, y: circuit.view.pan.y };
      canvas.setPointerCapture(e.pointerId); canvas.classList.add("dragging"); return;
    }
    if (!e.target.hasAttribute("data-background")) return;
    if (pendingPort) { addRoutePoint(p); return; }
    if (selectedType) { addComponent(selectedType, p.x - TYPES[selectedType].w / 2, p.y - TYPES[selectedType].h / 2); return; }
    selected = null; renderInspector();
    pointerAction = { kind: "pan", start: screenPoint(e), x: circuit.view.pan.x, y: circuit.view.pan.y };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add("dragging");
  });
  canvas.addEventListener("pointermove", e => {
    cursorWorldPoint = worldPoint(e);
    if (!pointerAction) { if (pendingPort) render(); return; }
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
  // Connect the core editor controls before optional file/panel controls. If
  // older cached markup is missing an optional element, editing and simulation
  // must remain available instead of being left with an inert canvas.
  $("deleteBtn").addEventListener("click", deleteSelected);
  $("panBtn").addEventListener("click", () => { panMode = !panMode; pendingPort = null; selectedType = null; render(); status(panMode ? "Eina PAN activada: arrossega el llenç." : "Eina PAN desactivada."); });
  $("textBtn").addEventListener("click", () => { panMode = false; selectedType = selectedType === "note" ? null : "note"; render(); status(selectedType ? "Clica al llenç per afegir una anotació; edita'n el text al panell." : "Eina de text cancel·lada."); });
  $("copyBtn").addEventListener("click", copySelected);
  $("pasteBtn").addEventListener("click", pasteSelected);
  $("undoBtn").addEventListener("click", undo);
  $("redoBtn").addEventListener("click", redo);
  $("simulateBtn").addEventListener("click", () => setRunning(!running));
  $("resetBtn").addEventListener("click", () => { resetRuntime(); render(); status("Simulació reiniciada."); });
  $("zoomInBtn").addEventListener("click", () => { circuit.view.zoom = clamp(circuit.view.zoom * 1.2, .55, 2.4); render(); });
  $("zoomOutBtn").addEventListener("click", () => { circuit.view.zoom = clamp(circuit.view.zoom / 1.2, .55, 2.4); render(); });
  $("fitBtn").addEventListener("click", () => { circuit.view = { zoom: 1, pan: { x: 0, y: 0 } }; render(); });
  $("exampleSupplyBtn").addEventListener("click", () => loadExample("supply"));
  $("exampleFlowBtn").addEventListener("click", () => loadExample("flow"));
  $("exampleBranchBtn").addEventListener("click", () => loadExample("branch"));
  $("exampleValve2Btn").addEventListener("click", () => loadExample("twoTwo"));
  $("exampleSimpleBtn").addEventListener("click", () => loadExample("simple"));
  $("exampleValve4Btn").addEventListener("click", () => loadExample("fourTwo"));
  $("exampleDoubleBtn").addEventListener("click", () => loadExample("double"));
  $("exampleLimitBtn").addEventListener("click", () => loadExample("limit"));
  $("exampleLogicBtn").addEventListener("click", () => loadExample("logic"));
  $("exampleTimerBtn").addEventListener("click", () => loadExample("timer"));
  $("exampleElectricBtn").addEventListener("click", () => loadExample("electric"));
  $("newBtn").addEventListener("click", newCircuit);
  $("openBtn").addEventListener("click", () => $("fileInput").click());
  $("fileInput").addEventListener("change", e => { openCircuit(e.target.files[0]); e.target.value = ""; });
  $("saveBtn").addEventListener("click", downloadCircuit);
  $("circuitOptionsBtn").addEventListener("click", () => {
    const open = $("circuitOptions").hidden;
    $("circuitOptions").hidden = !open;
    $("circuitOptionsBtn").setAttribute("aria-expanded", String(open));
  });
  const closeCircuitOptionsBtn = $("closeCircuitOptionsBtn");
  if (closeCircuitOptionsBtn) closeCircuitOptionsBtn.addEventListener("click", () => { $("circuitOptions").hidden = true; $("circuitOptionsBtn").setAttribute("aria-expanded", "false"); });
  const closeInspectorBtn = $("closeInspectorBtn");
  if (closeInspectorBtn) closeInspectorBtn.addEventListener("click", () => { selected = null; render(); });
  const handle = $("inspectorHandle"), inspector = $("componentInspector");
  let panelDrag = null;
  if (handle && inspector) {
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
  }
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
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") { e.preventDefault(); copySelected(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") { e.preventDefault(); pasteSelected(); }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); }
    if (e.key === "Escape") { pendingPort = null; selectedType = null; panMode = false; render(); }
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

