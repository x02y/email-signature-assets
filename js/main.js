import {
  advancePower,
  bearingNorth,
  clockFace,
  createPower,
  formatHours,
  gait,
  heartWord,
  loadWatts,
  m1,
  powerStatus,
  screenAlive,
  senseFloors,
  signedRelative,
} from "./geom.js";
import { deletePlan, downloadBank, emptyPlan, listPlans, savePlan, unpackBank, writeBankToFolder } from "./plans.js";
import { SCENARIOS } from "./scenarios.js";
import {
  createState,
  egoBearing,
  floorDef,
  nudge,
  scanAround,
  sensedContacts,
  setAllScan,
  standOn,
  step,
  switchScenario,
  toggleScan,
  trackedContact,
} from "./sim.js";
import { drawEcg, drawPlan, drawRadar, hitRadar, planTransform } from "./draw.js";

const SHORT = { block: "BLOCK", house: "HOUSE", office: "OFFICE", yard: "DOCK" };
const RANGES = [10, 15, 20, 25, 30, 40];

let state = createState("block");
let power = createPower();
let sheet = null;
let radarLayout = null;
let planTf = null;
let lastPings = state.pings;
let audioCtx = null;
let holdTimer = null;
let mapMode = "sense";
let activePlan = null;
let draftRect = null;
let drawAnchor = null;

const $ = (id) => document.getElementById(id);

function fit(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, rect.width);
  const h = Math.max(1, rect.height);
  const bw = Math.round(w * dpr);
  const bh = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  return { ctx, w, h };
}

function samples() {
  return sensedContacts(state);
}

function draw() {
  const radar = $("radar");
  const plan = $("plan");
  const ecg = $("ecg");
  const r = fit(radar);
  const list = samples();
  radarLayout = drawRadar(r.ctx, r.w, r.h, state, list);
  const p = fit(plan);
  planTf = drawPlan(p.ctx, p.w, p.h, state, list);
  const track = trackedContact(state, list);
  const e = fit(ecg);
  drawEcg(e.ctx, e.w, e.h, state.time, track ? track.bpm : 0);
  return { list, track };
}

function floorPhrase(sample) {
  const n = Math.round(sample.floors);
  const whole = Math.abs(sample.floors - n) < 0.12 && n !== 0;
  const metres = `${m1(Math.abs(sample.dz))} m`;
  if (sample.rel === "level") return `LEVEL · VERT ${metres}`;
  const word = sample.rel === "above" ? "ABOVE" : "BELOW";
  const floors = whole ? ` · ${Math.abs(n)} FLOOR${Math.abs(n) === 1 ? "" : "S"}` : "";
  return `${word} · ${metres}${floors}`;
}

function thruPhrase(thru) {
  if (thru === "wall") return "THRU WALL";
  if (thru === "floor") return "THRU FLOOR";
  return "CLEAR";
}

function ratePhrase(rate) {
  if (rate < -0.2) return `CLOSING ${m1(Math.abs(rate))} m/s`;
  if (rate > 0.2) return `OPENING ${m1(rate)} m/s`;
  return "RANGE STEADY";
}

function paint(list, track) {
  $("distance").textContent = track ? m1(track.slant) : "—.-";
  $("relation").textContent = track
    ? `${floorPhrase(track)} · ${thruPhrase(track.thru)}`
    : "NO CARDIAC RETURN";
  $("relation").dataset.rel = track ? track.rel : "";
  $("speedline").textContent = track
    ? `${m1(track.motion.speed)} m/s · ${gait(track.motion.speed)}`
    : "SELECT A FLOOR";
  $("pings").textContent = String(state.pings).padStart(5, "0");

  const scene = state.scenario;
  $("blurb").textContent = `${scene.name} — ${scene.blurb}`;
  for (const button of $("scenes").querySelectorAll("[data-scenario]")) {
    const on = button.dataset.scenario === scene.id;
    button.setAttribute("aria-pressed", on ? "true" : "false");
  }

  const floor = floorDef(state, state.op.floor);
  $("view-toggle").textContent = state.view === "arc" ? "ARC" : "360";
  $("view-toggle").setAttribute("aria-pressed", state.view === "arc" ? "true" : "false");
  $("range-btn").textContent = `${state.range} m`;
  $("audio-btn").setAttribute("aria-pressed", state.audio ? "true" : "false");
  $("nearest-btn").setAttribute("aria-pressed", state.trackNearest ? "true" : "false");

  paintStack(list);
  paintTracks(list, track);
  paintDetail(track, floor);
  paintPower();
  paintCensus(list);
  paintSense(list);
  for (const button of $("map-modes").querySelectorAll("[data-mapmode]")) {
    button.setAttribute("aria-pressed", button.dataset.mapmode === mapMode ? "true" : "false");
  }
  const name = $("plan-name");
  if (name && document.activeElement !== name) name.value = activePlan ? activePlan.name : "";

  const missed = list.filter((c) => !c.scanned);
  $("blind").textContent = missed.length
    ? `${missed.length} ON FLOORS YOU ARE NOT SCANNING`
    : "";

  $("clock").textContent = new Date().toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function paintSense(list) {
  const visible = list.filter((contact) => contact.visible);
  const sensed = senseFloors(
    visible.map((contact) => contact.z),
    state.op.floor * state.scenario.floorH,
    state.scenario.floorH
  );
  const pitch = `PITCH ${m1(state.scenario.floorH)} m`;
  if (!sensed.occupied) {
    $("sense-line").textContent = `SENSE · NO HEARTBEATS IN RANGE · JUST YOU · ${pitch}`;
    return;
  }
  $("sense-line").textContent =
    `SENSE · ${sensed.floors} STOREYS · ON ${sensed.occupied} · ${sensed.below} BELOW · ${sensed.above} ABOVE · ${pitch}`;
}

function paintDetail(track, floor) {
  if (!track) {
    $("track-name").textContent = "NO TRACK";
    $("track-room").textContent = floor.label;
    $("track-range").textContent = "Nobody in range on the floors you are scanning.";
    $("track-speed").textContent = "";
    $("track-meta").textContent = `YOU ARE ON ${floor.label} · HDG ${String(Math.round(state.op.heading)).padStart(3, "0")}°`;
    return;
  }
  const motion = track.motion;
  const rel = signedRelative(track.dx, track.dy, state.op.heading);
  const abs = bearingNorth(track.dx, track.dy);
  $("track-name").textContent = track.name;
  $("track-room").textContent = `${track.room} · ${floorDef(state, track.floorIndex).label}`;
  $("track-range").textContent =
    `SLANT ${m1(track.slant)} m · ACROSS ${m1(track.horiz)} m · VERT ${m1(Math.abs(track.dz))} m\n` +
    `√(${m1(track.horiz)}² + ${m1(Math.abs(track.dz))}²) = ${m1(track.slant)} m · ${thruPhrase(track.thru)}`;
  const timing =
    motion.window >= 0.45
      ? `${m1(motion.travelled)} m in ${m1(motion.window)} s`
      : "TIMING THE PACE";
  $("track-speed").textContent =
    `MOVE ${m1(motion.speed)} m/s · ${gait(motion.speed)} · ${m1(motion.speed * 3.6)} km/h\n` +
    `ACROSS ${m1(motion.horiz)} m/s · VERTICAL ${m1(motion.vert)} m/s · ${timing}`;
  $("track-meta").textContent =
    `${ratePhrase(motion.closure)} · ${Math.round(track.bpm)} bpm ${heartWord(track.bpm)}\n` +
    `BEARING ${String(Math.round(abs)).padStart(3, "0")}° · ${clockFace(rel)} · YOU ${floor.label} HDG ${String(Math.round(state.op.heading)).padStart(3, "0")}°`;
}

function paintCensus(list) {
  const vis = list.filter((c) => c.visible);
  const above = vis.filter((c) => c.rel === "above").length;
  const below = vis.filter((c) => c.rel === "below").length;
  const level = vis.filter((c) => c.rel === "level").length;
  $("census").textContent = `${vis.length} IN RANGE · ${above} ABOVE · ${level} LEVEL · ${below} BELOW`;
}

function paintStack(list) {
  const root = $("stack");
  if (root.dataset.scenario !== state.scenario.id) {
    root.dataset.scenario = state.scenario.id;
    root.replaceChildren();
    for (const floor of state.scenario.floors) {
      const row = document.createElement("div");
      row.className = "frow";
      const stand = document.createElement("button");
      stand.type = "button";
      stand.className = "stand";
      stand.dataset.stand = String(floor.id);
      stand.textContent = floor.name;
      stand.setAttribute("aria-label", `Stand on ${floor.label}`);
      const plate = document.createElement("button");
      plate.type = "button";
      plate.className = "plate";
      plate.dataset.scan = String(floor.id);
      plate.setAttribute("aria-label", `Scan ${floor.label}`);
      const pips = document.createElement("span");
      pips.className = "pips";
      plate.append(pips);
      row.append(stand, plate);
      root.append(row);
    }
  }
  const bounds = state.scenario.bounds;
  const span = Math.max(0.1, bounds.maxX - bounds.minX);
  for (const floor of state.scenario.floors) {
    const stand = root.querySelector(`[data-stand="${floor.id}"]`);
    const plate = root.querySelector(`[data-scan="${floor.id}"]`);
    const here = state.op.floor === floor.id;
    stand.classList.toggle("mine", here);
    stand.setAttribute("aria-pressed", here ? "true" : "false");
    plate.classList.toggle("off", !state.scan.has(floor.id));
    plate.classList.toggle("mine", here);
    plate.setAttribute("aria-pressed", state.scan.has(floor.id) ? "true" : "false");
    const pips = plate.querySelector(".pips");
    pips.replaceChildren();
    if (here) {
      const you = document.createElement("i");
      you.className = "you";
      you.style.left = `${((state.op.x - bounds.minX) / span) * 100}%`;
      pips.append(you);
    }
    for (const contact of list) {
      if (contact.floorIndex !== floor.id) continue;
      const dot = document.createElement("i");
      dot.className = `pip ${contact.rel}`;
      dot.style.left = `${((contact.x - bounds.minX) / span) * 100}%`;
      pips.append(dot);
    }
  }
}

function paintTracks(list, track) {
  const ul = $("tracks");
  const visible = list.filter((c) => c.visible);
  const key = visible.map((c) => c.id).join(",");
  if (ul.dataset.key !== key) {
    ul.dataset.key = key;
    ul.replaceChildren();
    for (const contact of visible) {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "track";
      button.dataset.id = contact.id;
      for (const cls of ["mark", "who", "far", "spd"]) {
        const span = document.createElement("span");
        span.className = cls;
        button.append(span);
      }
      li.append(button);
      ul.append(li);
    }
  }
  const buttons = [...ul.querySelectorAll("button")];
  visible.forEach((contact, index) => {
    const button = buttons[index];
    const bearing = egoBearing(state, contact);
    const rear = state.view === "arc" && (bearing < -Math.PI / 2 || bearing > Math.PI / 2);
    button.classList.toggle("on", !!track && track.id === contact.id);
    button.classList.toggle("rear", rear);
    const mark = button.querySelector(".mark");
    mark.dataset.rel = contact.rel;
    mark.textContent = contact.rel === "above" ? "▲" : contact.rel === "below" ? "▼" : "●";
    button.querySelector(".who").textContent = contact.name;
    button.querySelector(".far").textContent = `${m1(contact.slant)} m`;
    button.querySelector(".spd").textContent = `${m1(contact.motion.speed)} m/s`;
    const floor = floorDef(state, contact.floorIndex);
    button.setAttribute(
      "aria-label",
      `${contact.name}, ${floorPhrase(contact)}, ${m1(contact.slant)} metres, ${m1(contact.motion.speed)} metres per second, ${floor.label}`
    );
  });
}

function paintPower() {
  const load = loadWatts(state.audio);
  const status = powerStatus(power, load);
  const alive = screenAlive(power);
  const device = $("device");
  device.classList.toggle("alive", alive && !(power.plugged && power.negotiate <= 0));
  device.classList.toggle("charging", alive && power.plugged && power.negotiate <= 0);
  device.classList.toggle("low", alive && !power.plugged && status.pct < 15);
  device.classList.toggle("dead", !alive);
  $("dead").hidden = alive;
  if (!alive) {
    $("dead-copy").textContent = power.plugged
      ? "USB-C PD handshake. The Pi stays dark until the charger contract locks."
      : "The pack is flat and the Pi is off. Connect USB-C and it will boot from the charger.";
  }

  const pct = `${Math.round(status.pct)}%`;
  let battery = pct;
  if (power.plugged && power.negotiate > 0) battery = `${pct} PD…`;
  else if (status.mode === "FASTCHARGE") battery = `${pct} 45W`;
  else if (status.mode === "PASSTHROUGH") battery = `${pct} FULL`;
  $("battery-btn").textContent = battery;
  $("port").setAttribute("aria-pressed", power.plugged ? "true" : "false");
  $("plug-btn").textContent = power.plugged ? "UNPLUG USB-C" : "CONNECT USB-C";
  $("plug-btn").setAttribute("aria-pressed", power.plugged ? "true" : "false");

  if ($("sheet").hidden || sheet !== "power") return;
  $("power-pct").textContent = pct;
  const modeLine = {
    BATTERY: "ON BATTERY · wall unplugged",
    HANDSHAKE: "USB-C PD HANDSHAKE",
    FASTCHARGE: "USB-C FAST CHARGE · 15 V / 3.0 A",
    PASSTHROUGH: "PACK FULL · USB-C PASSTHROUGH",
  }[status.mode];
  $("power-mode").textContent = modeLine;
  $("power-wh").textContent = `${power.wh.toFixed(2)} / ${power.capacity.toFixed(0)} Wh`;
  $("power-runtime").textContent = alive ? `${formatHours(status.hoursLeft)} ON PACK` : "PI OFF";
  $("power-load").textContent = `DRAW ${status.loadW.toFixed(1)} W · PI 5.4 · GLASS 2.2 · LOGIC 0.4`;
  $("power-pd").textContent = status.volts
    ? `IN ${status.wattsIn.toFixed(1)} W OF ${45} W PD`
    : "PD SOURCE NOT CONNECTED";
  $("power-cells").textContent =
    status.mode === "FASTCHARGE"
      ? `INTO CELLS ${status.intoCells.toFixed(1)} W`
      : "INTO CELLS 0.0 W";
  $("power-eta").textContent =
    status.mode === "FASTCHARGE" ? `${formatHours(status.hoursToFull)} TO FULL` : "—";
}

function setPlug(on) {
  power.plugged = on;
  power.negotiate = on ? 0.85 : 0;
}

const SHEET_TITLE = { power: "POWER", rig: "RIG", plans: "PLANS" };

function openSheet(which) {
  sheet = which;
  $("sheet").hidden = false;
  $("sheet-title").textContent = SHEET_TITLE[which] || "PLANS";
  $("panel-power").hidden = which !== "power";
  $("panel-rig").hidden = which !== "rig";
  $("panel-plans").hidden = which !== "plans";
  if (which === "plans") refreshBank();
}

function thump(when, freq, dur, level) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, when);
  osc.frequency.exponentialRampToValueAtTime(Math.max(28, freq * 0.45), when + dur);
  gain.gain.setValueAtTime(level, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(when);
  osc.stop(when + dur + 0.02);
}

function heartbeat(when) {
  thump(when, 90, 0.09, 0.08);
  thump(when + 0.12, 58, 0.12, 0.05);
}

function pingIfNeeded() {
  if (!state.audio) {
    lastPings = state.pings;
    return;
  }
  const fresh = state.pings - lastPings;
  lastPings = state.pings;
  if (fresh <= 0) return;
  try {
    if (!audioCtx || audioCtx.state === "suspended") return;
    const count = Math.min(4, fresh);
    const now = audioCtx.currentTime;
    for (let i = 0; i < count; i++) heartbeat(now + i * 0.26);
  } catch {
    /* audio is optional */
  }
}

function worldFromPlan(event) {
  const rect = $("plan").getBoundingClientRect();
  const tf = planTf || planTransform(rect.width, rect.height, state.scenario.bounds);
  return tf.toWorld(event.clientX - rect.left, event.clientY - rect.top);
}

function ensureDraft() {
  if (!activePlan) activePlan = emptyPlan(`${state.scenario.name} SKETCH`);
  return activePlan;
}

function applyMap() {
  state.plan = mapMode === "sense" ? null : activePlan;
  state.draftRect = draftRect;
}

function planStatus(text) {
  $("plan-status").textContent = text;
}

async function refreshBank() {
  const list = $("bank-list");
  let rows = [];
  try {
    rows = await listPlans();
  } catch {
    planStatus("THE BANK ON THIS DEVICE COULD NOT BE READ");
    return;
  }
  list.replaceChildren();
  if (!rows.length) {
    const empty = document.createElement("li");
    empty.className = "fine";
    empty.textContent = "BANK EMPTY";
    list.append(empty);
    return;
  }
  for (const plan of rows) {
    const item = document.createElement("li");
    item.className = "bank-row";
    const label = document.createElement("span");
    label.className = "who";
    label.textContent = `${plan.name} · ${plan.rooms.length} ROOMS`;
    const load = document.createElement("button");
    load.type = "button";
    load.className = "key";
    load.textContent = "LOAD";
    load.addEventListener("click", () => {
      activePlan = structuredClone(plan);
      mapMode = "draw";
      planStatus(`LOADED ${plan.name}. DRAW OR SENSE TO GO BACK TO THE BUILDING WALLS.`);
    });
    const drop = document.createElement("button");
    drop.type = "button";
    drop.className = "key";
    drop.textContent = "DELETE";
    drop.addEventListener("click", async () => {
      await deletePlan(plan.id);
      if (activePlan && activePlan.id === plan.id) activePlan = null;
      refreshBank();
    });
    item.append(label, load, drop);
    list.append(item);
  }
}

async function exportBank(toUsb) {
  let plans = [];
  try {
    plans = await listPlans();
  } catch {
    plans = [];
  }
  if (activePlan && !plans.some((plan) => plan.id === activePlan.id)) plans.unshift(activePlan);
  if (!plans.length) {
    planStatus("NOTHING TO EXPORT. DRAW A ROOM AND SAVE IT FIRST.");
    return;
  }
  try {
    if (toUsb) {
      const how = await writeBankToFolder(plans);
      planStatus(how === "usb" ? "WROTE pulsegrid-plans.json TO THE FOLDER YOU PICKED" : "BROWSER SAVED pulsegrid-plans.json INSTEAD");
    } else {
      downloadBank(plans);
      planStatus("DOWNLOAD STARTED: pulsegrid-plans.json");
    }
  } catch (error) {
    if (error && error.name === "AbortError") return;
    planStatus("EXPORT DID NOT FINISH");
  }
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function onImportFile(file) {
  if (!file) return;
  if (file.type.startsWith("image/")) {
    if (file.size > 1_200_000) {
      planStatus("THAT PICTURE IS OVER 1.2 MB. USE A SMALLER BLUEPRINT IMAGE.");
      return;
    }
    const plan = ensureDraft();
    plan.blueprint = { floor: state.op.floor, dataUrl: await readFile(file), name: file.name };
    mapMode = "draw";
    planStatus(`BLUEPRINT UNDER THE FLOOR YOU ARE ON. SAVE TO KEEP IT IN THE BANK.`);
    return;
  }
  try {
    const plans = unpackBank(await file.text());
    for (const plan of plans) await savePlan(plan);
    await refreshBank();
    planStatus(`IMPORTED ${plans.length} PLAN${plans.length === 1 ? "" : "S"} INTO THE BANK`);
  } catch {
    planStatus("THAT FILE IS NOT A PULSEGRID PLAN BANK");
  }
}

function placeOperator(world) {
  const b = state.scenario.bounds;
  state.op.x = Math.max(b.minX, Math.min(b.maxX, world.x));
  state.op.y = Math.max(b.minY, Math.min(b.maxY, world.y));
}

function bind() {
  const scenes = $("scenes");
  for (const scenario of SCENARIOS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key";
    button.dataset.scenario = scenario.id;
    button.textContent = SHORT[scenario.id];
    button.setAttribute("aria-label", scenario.name);
    scenes.append(button);
  }
  scenes.addEventListener("click", (event) => {
    const button = event.target.closest("[data-scenario]");
    if (!button) return;
    state = switchScenario(state, button.dataset.scenario);
    mapMode = "sense";
    draftRect = null;
    $("stack").dataset.scenario = "";
    $("tracks").dataset.key = "";
  });

  $("map-modes").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mapmode]");
    if (!button) return;
    mapMode = button.dataset.mapmode;
    if (mapMode === "draw") ensureDraft();
    if (mapMode === "plans") openSheet("plans");
  });

  $("stack").addEventListener("click", (event) => {
    const stand = event.target.closest("[data-stand]");
    const scan = event.target.closest("[data-scan]");
    if (stand) standOn(state, Number(stand.dataset.stand));
    else if (scan) toggleScan(state, Number(scan.dataset.scan));
  });

  $("presets").addEventListener("click", (event) => {
    const button = event.target.closest("[data-scanmode]");
    if (!button) return;
    if (button.dataset.scanmode === "all") setAllScan(state, true);
    if (button.dataset.scanmode === "here") setAllScan(state, false);
    if (button.dataset.scanmode === "near") scanAround(state);
  });

  $("nearest-btn").addEventListener("click", () => {
    state.pin = null;
    state.trackNearest = true;
  });

  $("tracks").addEventListener("click", (event) => {
    const button = event.target.closest("[data-id]");
    if (!button) return;
    state.pin = button.dataset.id;
    state.trackNearest = false;
  });

  $("view-toggle").addEventListener("click", () => {
    state.view = state.view === "arc" ? "omni" : "arc";
  });
  $("range-btn").addEventListener("click", () => {
    const index = RANGES.findIndex((range) => range >= state.range - 0.1);
    state.range = RANGES[(index + 1) % RANGES.length];
  });
  $("audio-btn").addEventListener("click", async () => {
    state.audio = !state.audio;
    if (state.audio && audioCtx) await audioCtx.resume();
  });
  $("battery-btn").addEventListener("click", () => openSheet("power"));
  $("rig-btn").addEventListener("click", () => openSheet("rig"));
  $("plan-name").addEventListener("input", () => {
    if (!activePlan) ensureDraft();
    activePlan.name = $("plan-name").value.slice(0, 48) || "UNTITLED";
  });
  $("save-plan").addEventListener("click", async () => {
    if (!activePlan || !activePlan.rooms.length && !activePlan.blueprint) {
      planStatus("DRAW A ROOM OR IMPORT A BLUEPRINT BEFORE SAVING");
      return;
    }
    try {
      await savePlan(activePlan);
      planStatus(`SAVED ${activePlan.name} ON THIS DEVICE`);
      refreshBank();
    } catch {
      planStatus("THE BANK ON THIS DEVICE COULD NOT BE WRITTEN");
    }
  });
  $("undo-room").addEventListener("click", () => {
    if (!activePlan || !activePlan.rooms.length) return;
    activePlan.rooms.pop();
  });
  $("import-btn").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", () => {
    const file = $("import-file").files && $("import-file").files[0];
    $("import-file").value = "";
    onImportFile(file);
  });
  $("export-bank").addEventListener("click", () => exportBank(false));
  $("export-usb").addEventListener("click", () => exportBank(true));
  $("sheet-close").addEventListener("click", () => {
    $("sheet").hidden = true;
    sheet = null;
  });
  $("plug-btn").addEventListener("click", () => setPlug(!power.plugged));
  $("port").addEventListener("click", () => setPlug(!power.plugged));
  $("dead-charge").addEventListener("click", () => setPlug(true));
  $("elapse-10").addEventListener("click", () => advancePower(power, 600, loadWatts(state.audio)));
  $("elapse-30").addEventListener("click", () => advancePower(power, 1800, loadWatts(state.audio)));
  $("fill-btn").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      document.body.classList.toggle("fill");
    }
  });

  $("radar").addEventListener("pointerdown", (event) => {
    const rect = $("radar").getBoundingClientRect();
    const hit = hitRadar(
      radarLayout,
      state.range,
      state.op.heading,
      event.clientX - rect.left,
      event.clientY - rect.top,
      samples()
    );
    if (!hit) return;
    state.pin = hit.id;
    state.trackNearest = false;
  });

  const plan = $("plan");
  let dragging = false;
  plan.addEventListener("pointerdown", (event) => {
    plan.setPointerCapture(event.pointerId);
    const world = worldFromPlan(event);
    if (mapMode === "draw") {
      drawAnchor = world;
      dragging = false;
      return;
    }
    const hit = samples().find((contact) => Math.hypot(contact.x - world.x, contact.y - world.y) < 0.85);
    if (hit) {
      state.pin = hit.id;
      state.trackNearest = false;
      dragging = false;
      return;
    }
    dragging = true;
    placeOperator(world);
  });
  plan.addEventListener("pointermove", (event) => {
    if (mapMode === "draw" && drawAnchor) {
      const world = worldFromPlan(event);
      const x = Math.min(drawAnchor.x, world.x);
      const y = Math.min(drawAnchor.y, world.y);
      draftRect = { x, y, w: Math.abs(world.x - drawAnchor.x), h: Math.abs(world.y - drawAnchor.y) };
      return;
    }
    if (!dragging) return;
    placeOperator(worldFromPlan(event));
  });
  plan.addEventListener("pointerup", (event) => {
    if (mapMode === "draw" && drawAnchor) {
      const world = worldFromPlan(event);
      const x = Math.min(drawAnchor.x, world.x);
      const y = Math.min(drawAnchor.y, world.y);
      const w = Math.abs(world.x - drawAnchor.x);
      const h = Math.abs(world.y - drawAnchor.y);
      if (w >= 0.5 && h >= 0.5) {
        const sketch = ensureDraft();
        sketch.rooms.push({
          id: crypto.randomUUID(),
          floor: state.op.floor,
          x,
          y,
          w,
          h,
          name: `ROOM ${sketch.rooms.length + 1}`,
        });
      }
      drawAnchor = null;
      draftRect = null;
    }
    dragging = false;
  });
  plan.addEventListener("pointercancel", () => {
    dragging = false;
    drawAnchor = null;
    draftRect = null;
  });

  window.addEventListener("pointerdown", () => {
    if (!state.audio) return;
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === "suspended") audioCtx.resume();
  });

  $("nudge").addEventListener("pointerdown", (event) => {
    const button = event.target.closest("[data-dir]");
    if (!button) return;
    const dir = button.dataset.dir;
    nudge(state, dir);
    clearInterval(holdTimer);
    holdTimer = setInterval(() => nudge(state, dir), 130);
  });
  window.addEventListener("pointerup", () => clearInterval(holdTimer));

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const key = event.key.toLowerCase();
    const map = {
      arrowup: "n",
      arrowdown: "s",
      arrowleft: "w",
      arrowright: "e",
      q: "rotl",
      e: "rotr",
    };
    if (map[key]) {
      nudge(state, map[key]);
      event.preventDefault();
    } else if (key === "c") setPlug(!power.plugged);
    else if (key === "a") state.view = state.view === "arc" ? "omni" : "arc";
    else if (key === "[") {
      const index = RANGES.findIndex((range) => range >= state.range - 0.1);
      state.range = RANGES[(index - 1 + RANGES.length) % RANGES.length];
    } else if (key === "]") {
      const index = RANGES.findIndex((range) => range >= state.range - 0.1);
      state.range = RANGES[(index + 1) % RANGES.length];
    }
  });
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  applyMap();
  if (screenAlive(power)) step(state, dt);
  advancePower(power, dt, loadWatts(state.audio));
  const drawn = draw();
  paint(drawn.list, drawn.track);
  pingIfNeeded();
  requestAnimationFrame(frame);
}

bind();
requestAnimationFrame(frame);
