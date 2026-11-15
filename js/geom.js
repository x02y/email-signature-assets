/** Pure sensor math. Distances and speeds are always one decimal place. */

export const PACK_WH = 48;
export const PD_WATTS = 45;
export const PD_VOLTS = 15;
export const PD_AMPS = 3;
export const CHARGE_EFF = 0.9;
export const LOAD_COMPUTE_W = 5.4;
export const LOAD_DISPLAY_W = 2.2;
export const LOAD_LOGIC_W = 0.4;
export const LOAD_AUDIO_W = 0.3;

export function m1(n) {
  if (!Number.isFinite(n)) return "—.-";
  const sign = n < 0 ? -1 : 1;
  const v = Math.round((Math.abs(n) + 1e-9) * 10) / 10;
  if (v === 0) return "0.0";
  return (sign < 0 ? "-" : "") + v.toFixed(1);
}

export function loadWatts(audio = false) {
  return LOAD_COMPUTE_W + LOAD_DISPLAY_W + LOAD_LOGIC_W + (audio ? LOAD_AUDIO_W : 0);
}

/** Watts actually stored in the cells while a 45 W USB-C PD source is attached. */
export function cellChargeWatts(loadW) {
  return Math.max(0, (PD_WATTS - loadW) * CHARGE_EFF);
}

export function slant(dx, dy, dz) {
  return Math.hypot(dx, dy, dz);
}

export function relation(dz) {
  if (dz > 0.5) return "above";
  if (dz < -0.5) return "below";
  return "level";
}

/**
 * Count storeys from heartbeat height. Empty storeys between the lowest and
 * highest return still count, and the operator's own storey is included.
 * Heights and operatorZ are metres. Pitch is the assumed storey height.
 */
export function senseFloors(heights, operatorZ, pitch) {
  if (!(pitch > 0) || !Number.isFinite(operatorZ)) {
    return { floors: 0, occupied: 0, below: 0, above: 0, pitch: 0, low: 0, high: 0 };
  }
  const you = Math.round(operatorZ / pitch);
  const clean = (heights || []).filter((z) => Number.isFinite(z));
  if (!clean.length) {
    return { floors: 1, occupied: 0, below: 0, above: 0, pitch, low: operatorZ, high: operatorZ };
  }
  const ids = clean.map((z) => Math.round(z / pitch));
  const minI = Math.min(you, ...ids);
  const maxI = Math.max(you, ...ids);
  return {
    floors: maxI - minI + 1,
    occupied: new Set(ids).size,
    below: you - minI,
    above: maxI - you,
    pitch,
    low: Math.min(...clean),
    high: Math.max(...clean),
  };
}

export function gait(speed) {
  if (speed < 0.3) return "STILL";
  if (speed < 1.8) return "WALK";
  if (speed < 3.5) return "RUN";
  return "SPRINT";
}

export function heartWord(bpm) {
  if (bpm < 75) return "REST";
  if (bpm < 110) return "ELEVATED";
  return "HIGH";
}

/** Clock face from a relative bearing. 0° is straight ahead. */
export function clockFace(relDeg) {
  const deg = ((relDeg % 360) + 360) % 360;
  const idx = Math.round(deg / 30) % 12;
  return `${idx === 0 ? 12 : idx} o'clock`;
}

export function wrapDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

export function bearingNorth(dx, dy) {
  return wrapDeg((Math.atan2(dx, dy) * 180) / Math.PI);
}

export function relativeBearing(dx, dy, headingDeg) {
  return wrapDeg(bearingNorth(dx, dy) - headingDeg);
}

/** Signed -180..180, clockwise from the nose. */
export function signedRelative(dx, dy, headingDeg) {
  const rel = relativeBearing(dx, dy, headingDeg);
  return rel > 180 ? rel - 360 : rel;
}

export function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const rx = bx - ax;
  const ry = by - ay;
  const sx = dx - cx;
  const sy = dy - cy;
  const den = rx * sy - ry * sx;
  if (Math.abs(den) < 1e-9) return false;
  const qpx = cx - ax;
  const qpy = cy - ay;
  const t = (qpx * sy - qpy * sx) / den;
  const u = (qpx * ry - qpy * rx) / den;
  return t > 0.03 && t < 0.97 && u > 0.03 && u < 0.97;
}

export function crossesWall(x1, y1, x2, y2, walls) {
  for (const w of walls) {
    if (segmentsIntersect(x1, y1, x2, y2, w.x1, w.y1, w.x2, w.y2)) return true;
  }
  return false;
}

export function roomAt(x, y, rooms) {
  for (const r of rooms) {
    if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return r.name;
  }
  return "OPEN";
}

/**
 * Speed from a position history. Returns 3D speed plus horizontal,
 * vertical, and how the slant range is changing (negative = closing).
 */
export function motionFromHist(hist, minDt = 0.45) {
  if (!hist || hist.length < 2) {
    return { speed: 0, horiz: 0, vert: 0, closure: 0, travelled: 0, window: 0 };
  }
  const a = hist[0];
  const b = hist[hist.length - 1];
  const window = b.t - a.t;
  if (window < minDt) {
    return { speed: 0, horiz: 0, vert: 0, closure: 0, travelled: 0, window };
  }
  let travelled = 0;
  let flat = 0;
  for (let i = 1; i < hist.length; i++) {
    const p = hist[i - 1];
    const q = hist[i];
    travelled += Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z);
    flat += Math.hypot(q.x - p.x, q.y - p.y);
  }
  const speed = travelled / window;
  const horiz = flat / window;
  const vert = (b.z - a.z) / window;
  const closure = (b.slant - a.slant) / window;
  return { speed, horiz, vert, closure, travelled, window };
}

export function classifyContact(op, contact, floorH, walls, rooms) {
  const dx = contact.x - op.x;
  const dy = contact.y - op.y;
  const oz = op.floor * floorH;
  const dz = contact.z - oz;
  const horiz = Math.hypot(dx, dy);
  const range = slant(dx, dy, dz);
  const rel = relation(dz);
  const floors = dz / floorH;
  const idx = Math.round(contact.z / floorH);
  let thru = "clear";
  if (Math.abs(dz) > 0.8) thru = "floor";
  else if (crossesWall(op.x, op.y, contact.x, contact.y, walls)) thru = "wall";
  const room = roomAt(contact.x, contact.y, rooms);
  return { dx, dy, dz, horiz, slant: range, rel, floors, floorIndex: idx, thru, room };
}

/** ECG sample, phase 0..1, returns -0.3..1 */
export function ecg(phase) {
  const p = ((phase % 1) + 1) % 1;
  if (p < 0.08) return 0;
  if (p < 0.12) return ((p - 0.08) / 0.04) * 0.16;
  if (p < 0.18) return 0.16 * (1 - (p - 0.12) / 0.06);
  if (p < 0.22) return 0;
  if (p < 0.25) return -((p - 0.22) / 0.03) * 0.22;
  if (p < 0.28) return -0.22 + ((p - 0.25) / 0.03) * 1.22;
  if (p < 0.32) return 1 - ((p - 0.28) / 0.04) * 1.28;
  if (p < 0.36) return -0.28 + ((p - 0.32) / 0.04) * 0.28;
  if (p < 0.5) return 0;
  if (p < 0.66) return Math.sin(((p - 0.5) / 0.16) * Math.PI) * 0.24;
  return 0;
}

export function createPower(wh = PACK_WH * 0.58) {
  return {
    wh,
    capacity: PACK_WH,
    plugged: false,
    negotiate: 0,
    audio: false,
  };
}

export function screenAlive(power) {
  if (power.wh > 0.25) return true;
  return power.plugged && power.negotiate <= 0;
}

/**
 * Advance the pack by `seconds`.
 * Plugged: USB-C PD 45 W (15 V / 3 A). The tablet draws its load from that
 * bus and the rest, after conversion loss, fast-charges the cells.
 * Unplugged: the pack alone runs the Pi and the display.
 */
export function advancePower(power, seconds, loadW = loadWatts(power.audio)) {
  let left = Math.max(0, seconds);
  if (power.plugged && power.negotiate > 0) {
    const handshake = Math.min(power.negotiate, left);
    power.wh = Math.max(0, power.wh - loadW * (handshake / 3600));
    power.negotiate -= handshake;
    left -= handshake;
  }
  if (left <= 0) return power;
  if (power.plugged && power.negotiate <= 0) {
    const intoCells = cellChargeWatts(loadW);
    power.wh = Math.min(power.capacity, power.wh + intoCells * (left / 3600));
  } else {
    power.wh = Math.max(0, power.wh - loadW * (left / 3600));
  }
  return power;
}

export function powerStatus(power, loadW = loadWatts(power.audio)) {
  const pct = (power.wh / power.capacity) * 100;
  const alive = screenAlive(power);
  let mode = "BATTERY";
  let wattsIn = 0;
  let intoCells = 0;
  if (power.plugged && power.negotiate > 0) {
    mode = "HANDSHAKE";
  } else if (power.plugged && power.wh >= power.capacity - 0.05) {
    mode = "PASSTHROUGH";
    wattsIn = loadW;
    intoCells = 0;
  } else if (power.plugged) {
    mode = "FASTCHARGE";
    intoCells = cellChargeWatts(loadW);
    wattsIn = loadW + intoCells / CHARGE_EFF;
  }
  const hoursLeft = loadW > 0 ? power.wh / loadW : Infinity;
  const need = Math.max(0, power.capacity - power.wh);
  const chargeW = cellChargeWatts(loadW);
  const hoursToFull = chargeW > 0 ? need / chargeW : Infinity;
  return {
    pct,
    mode,
    wattsIn,
    intoCells,
    loadW,
    hoursLeft,
    hoursToFull,
    alive,
    volts: power.plugged && power.negotiate <= 0 ? PD_VOLTS : 0,
    amps: power.plugged && power.negotiate <= 0 ? PD_AMPS : 0,
  };
}

export function formatHours(h) {
  if (!Number.isFinite(h)) return "—";
  const totalMin = Math.round(h * 60);
  const hr = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (hr <= 0) return `${min}m`;
  return `${hr}h ${String(min).padStart(2, "0")}m`;
}
