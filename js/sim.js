import { classifyContact, motionFromHist } from "./geom.js";
import { getScenario } from "./scenarios.js";

const HIST_KEEP = 2.4;
const SAMPLE = 0.1;
export const SWEEP_RATE = 2.4;

function segLen(a, b, floorH) {
  const dz = (b.floor - a.floor) * floorH;
  return Math.hypot(b.x - a.x, b.y - a.y, dz);
}

function loopLengths(loop, floorH) {
  const lens = [];
  let total = 0;
  for (let i = 0; i < loop.length; i++) {
    const len = Math.max(0.04, segLen(loop[i], loop[(i + 1) % loop.length], floorH));
    lens.push(len);
    total += len;
  }
  return { lens, total };
}

function writePose(contact, floorH) {
  const pts = contact.loop;
  const a = pts[contact.seg];
  const b = pts[(contact.seg + 1) % pts.length];
  const len = Math.max(0.04, segLen(a, b, floorH));
  const f = Math.min(1, contact.along / len);
  contact.x = a.x + (b.x - a.x) * f;
  contact.y = a.y + (b.y - a.y) * f;
  contact.z = (a.floor + (b.floor - a.floor) * f) * floorH;
}

function placePhase(contact, floorH) {
  const { lens, total } = loopLengths(contact.loop, floorH);
  let dist = ((contact.phase || 0) % 1) * total;
  contact.seg = 0;
  contact.along = 0;
  contact.dwell = 0;
  for (let i = 0; i < lens.length; i++) {
    if (dist <= lens[i]) {
      contact.seg = i;
      contact.along = dist;
      break;
    }
    dist -= lens[i];
  }
  writePose(contact, floorH);
}

function advanceContact(contact, dt, floorH) {
  let left = Math.max(0, contact.speedCmd * dt);
  if (contact.dwell > 0) {
    const used = Math.min(contact.dwell, dt);
    contact.dwell -= used;
    left = contact.speedCmd * (dt - used);
  }
  const pts = contact.loop;
  let guard = 0;
  while (left > 0.0001 && guard++ < 16) {
    const a = pts[contact.seg];
    const b = pts[(contact.seg + 1) % pts.length];
    const len = Math.max(0.04, segLen(a, b, floorH));
    const remain = len - contact.along;
    if (left < remain) {
      contact.along += left;
      left = 0;
    } else {
      left -= remain;
      contact.seg = (contact.seg + 1) % pts.length;
      contact.along = 0;
      const arrived = pts[contact.seg];
      if (arrived.dwell > 0) {
        contact.dwell = arrived.dwell;
        const dwellEat = Math.min(contact.dwell, left / contact.speedCmd);
        contact.dwell -= dwellEat;
        left -= dwellEat * contact.speedCmd;
        if (contact.dwell > 0) break;
      }
    }
  }
  writePose(contact, floorH);
}

export function sweepAngle(time) {
  const raw = -Math.PI / 2 + time * SWEEP_RATE;
  const tau = Math.PI * 2;
  let s = raw % tau;
  if (s > Math.PI) s -= tau;
  if (s < -Math.PI) s += tau;
  return s;
}

function angDiff(a, b) {
  const tau = Math.PI * 2;
  const na = ((a % tau) + tau) % tau;
  const nb = ((b % tau) + tau) % tau;
  let d = Math.abs(na - nb);
  if (d > Math.PI) d = tau - d;
  return d;
}

function beamSees(bearing, sweep, view) {
  if (view === "arc") {
    if (bearing < -Math.PI / 2 - 0.08 || bearing > Math.PI / 2 + 0.08) return false;
  }
  return angDiff(bearing, sweep) < 0.22;
}

export function sampleContact(state, contact) {
  const scenario = state.scenario;
  const floor = floorDef(state, Math.round(contact.z / scenario.floorH));
  const opFloor = floorDef(state, state.op.floor);
  const geometry = classifyContact(
    state.op,
    contact,
    scenario.floorH,
    opFloor.walls,
    floor.rooms
  );
  const speed = motionFromHist(contact.hist).speed;
  const bpm =
    contact.restBpm + speed * 22 + Math.sin(state.time * 0.85 + contact.phase * 6) * 1.4;
  contact.bpm = bpm;
  return {
    ...geometry,
    id: contact.id,
    name: contact.name,
    bpm,
    x: contact.x,
    y: contact.y,
    z: contact.z,
    motion: motionFromHist(contact.hist),
  };
}

function remember(state, contact, sample) {
  contact.hist.push({
    t: state.time,
    x: contact.x,
    y: contact.y,
    z: contact.z,
    slant: sample.slant,
  });
  const cutoff = state.time - HIST_KEEP;
  while (contact.hist.length > 2 && contact.hist[0].t < cutoff) contact.hist.shift();
}

export function createState(scenarioId = "block") {
  const scenario = getScenario(scenarioId);
  const contacts = scenario.contacts.map((c) => ({
    ...c,
    loop: c.loop.map((p) => ({ ...p })),
    seg: 0,
    along: 0,
    dwell: 0,
    hist: [],
    x: 0,
    y: 0,
    z: 0,
    bpm: c.restBpm,
    sweepMark: -1,
  }));
  const state = {
    scenario,
    contacts,
    op: { ...scenario.op },
    scan: new Set(scenario.floors.map((f) => f.id)),
    range: scenario.range,
    view: "arc",
    pin: null,
    trackNearest: true,
    pings: 186,
    time: 0,
    audio: false,
    accum: 0,
  };
  for (const c of contacts) placePhase(c, scenario.floorH);
  for (let i = 0; i < 24; i++) step(state, 0.1);
  state.pin = null;
  state.trackNearest = true;
  return state;
}

export function switchScenario(state, id) {
  const next = createState(id);
  next.audio = state.audio;
  next.view = state.view;
  return next;
}

export function step(state, dt) {
  let left = Math.max(0, dt);
  while (left > 0.000001) {
    const h = Math.min(0.05, left);
    stepOnce(state, h);
    left -= h;
  }
  return state;
}

function stepOnce(state, dt) {
  const scenario = state.scenario;
  state.time += dt;
  for (const c of state.contacts) advanceContact(c, dt, scenario.floorH);

  state.accum += dt;
  while (state.accum >= SAMPLE) {
    state.accum -= SAMPLE;
    for (const c of state.contacts) remember(state, c, sampleContact(state, c));
  }

  const sweep = sweepAngle(state.time);
  const period = (Math.PI * 2) / SWEEP_RATE;
  const rev = Math.floor(state.time / period);
  for (const c of state.contacts) {
    const sample = sampleContact(state, c);
    if (!isScanned(state, sample) || sample.slant > state.range) continue;
    const bearing = egoBearing(state, sample);
    if (beamSees(bearing, sweep, state.view)) {
      if (c.sweepMark !== rev) {
        c.sweepMark = rev;
        state.pings += 1;
      }
    }
  }
}

export function egoOf(dx, dy, headingDeg) {
  const h = (headingDeg * Math.PI) / 180;
  const cos = Math.cos(h);
  const sin = Math.sin(h);
  return {
    right: dx * cos - dy * sin,
    fwd: dx * sin + dy * cos,
  };
}

export function egoBearing(state, sample) {
  const ego = egoOf(sample.dx, sample.dy, state.op.heading);
  return Math.atan2(ego.right, ego.fwd);
}

export function isScanned(state, sample) {
  return state.scan.has(sample.floorIndex);
}

export function sensedContacts(state) {
  const list = [];
  for (const c of state.contacts) {
    const sample = sampleContact(state, c);
    sample.scanned = isScanned(state, sample);
    sample.inRange = sample.slant <= state.range + 0.05;
    sample.visible = sample.scanned && sample.inRange;
    list.push(sample);
  }
  list.sort((a, b) => a.slant - b.slant);
  return list;
}

export function trackedContact(state, list = sensedContacts(state)) {
  const visible = list.filter((c) => c.visible);
  if (!state.trackNearest && state.pin) {
    const pinned = list.find((c) => c.id === state.pin);
    if (pinned && pinned.visible) return pinned;
  }
  return visible[0] || null;
}

export function moveOperator(state, dx, dy) {
  const b = state.scenario.bounds;
  state.op.x = clamp(state.op.x + dx, b.minX, b.maxX);
  state.op.y = clamp(state.op.y + dy, b.minY, b.maxY);
}

export function nudge(state, dir) {
  const stepM = 0.6;
  if (dir === "n") moveOperator(state, 0, stepM);
  else if (dir === "s") moveOperator(state, 0, -stepM);
  else if (dir === "e") moveOperator(state, stepM, 0);
  else if (dir === "w") moveOperator(state, -stepM, 0);
  else if (dir === "rotl") state.op.heading = (state.op.heading - 15 + 360) % 360;
  else if (dir === "rotr") state.op.heading = (state.op.heading + 15) % 360;
}

export function standOn(state, floorId) {
  if (!state.scenario.floors.some((f) => f.id === floorId)) return;
  state.op.floor = floorId;
  state.scan.add(floorId);
}

export function toggleScan(state, floorId) {
  if (state.scan.has(floorId)) {
    if (state.scan.size === 1) return false;
    state.scan.delete(floorId);
  } else {
    state.scan.add(floorId);
  }
  return true;
}

export function setAllScan(state, on) {
  if (on) state.scan = new Set(state.scenario.floors.map((f) => f.id));
  else state.scan = new Set([state.op.floor]);
}

export function scanAround(state) {
  const ids = new Set();
  for (const f of state.scenario.floors) {
    if (Math.abs(f.id - state.op.floor) <= 1) ids.add(f.id);
  }
  if (ids.size === 0) ids.add(state.op.floor);
  state.scan = ids;
}

export function floorDef(state, id) {
  return (
    state.scenario.floors.find((f) => f.id === id) || state.scenario.floors[0]
  );
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
