import { m1 } from "./geom.js";
import { geometryOverride } from "./plans.js";
import { egoOf, sweepAngle } from "./sim.js";

const ABOVE = "#7ef6ff";
const LEVEL = "#5dff8a";
const BELOW = "#ffbf3c";
const DIM = "rgba(120, 220, 160, 0.55)";

function relColor(rel) {
  if (rel === "above") return ABOVE;
  if (rel === "below") return BELOW;
  return LEVEL;
}

function angDiff(a, b) {
  const tau = Math.PI * 2;
  const na = ((a % tau) + tau) % tau;
  const nb = ((b % tau) + tau) % tau;
  let d = Math.abs(na - nb);
  if (d > Math.PI) d = tau - d;
  return d;
}

export function radarLayout(w, h, view) {
  if (view === "omni") {
    const radius = Math.min(w * 0.46, h * 0.40);
    return { cx: w * 0.5, cy: h * 0.58, radius, view };
  }
  const top = h < 520 ? Math.min(120, h * 0.32) : Math.min(108, h * 0.18);
  const radius = Math.min(w * 0.46, h - top - 16);
  return { cx: w * 0.5, cy: top + radius, radius, view };
}

function project(layout, dx, dy, heading, range) {
  const ego = egoOf(dx, dy, heading);
  const scale = layout.radius / range;
  return {
    x: layout.cx + ego.right * scale,
    y: layout.cy - ego.fwd * scale,
    right: ego.right,
    fwd: ego.fwd,
    bearing: Math.atan2(ego.right, ego.fwd),
  };
}

function clipScope(ctx, layout) {
  ctx.beginPath();
  if (layout.view === "arc") {
    ctx.moveTo(layout.cx, layout.cy);
    ctx.arc(layout.cx, layout.cy, layout.radius, Math.PI, Math.PI * 2, false);
    ctx.closePath();
  } else {
    ctx.arc(layout.cx, layout.cy, layout.radius, 0, Math.PI * 2);
  }
  ctx.clip();
}

function inScope(layout, pt) {
  const dx = pt.x - layout.cx;
  const dy = pt.y - layout.cy;
  if (dx * dx + dy * dy > layout.radius * layout.radius) return false;
  if (layout.view === "arc" && pt.y > layout.cy + 1) return false;
  return true;
}

export function drawRadar(ctx, w, h, state, samples) {
  const layout = radarLayout(w, h, state.view);
  ctx.clearRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(
    layout.cx,
    layout.cy,
    layout.radius * 0.05,
    layout.cx,
    layout.cy,
    layout.radius * 1.05
  );
  glow.addColorStop(0, "#0a3d22");
  glow.addColorStop(0.55, "#042616");
  glow.addColorStop(1, "#010a06");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  clipScope(ctx, layout);
  drawWalls(ctx, layout, state);
  ctx.restore();

  drawRings(ctx, layout, state.range);
  drawSweep(ctx, layout, sweepAngle(state.time), state.view);
  drawContacts(ctx, layout, state, samples);
  drawOrigin(ctx, layout);

  const vignette = ctx.createRadialGradient(
    layout.cx,
    layout.cy - layout.radius * 0.2,
    layout.radius * 0.45,
    layout.cx,
    layout.cy,
    layout.radius * 1.2
  );
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
  return layout;
}

function strokeWalls(ctx, layout, state, walls) {
  ctx.beginPath();
  for (const wall of walls) {
    const a = project(layout, wall.x1 - state.op.x, wall.y1 - state.op.y, state.op.heading, state.range);
    const b = project(layout, wall.x2 - state.op.x, wall.y2 - state.op.y, state.op.heading, state.range);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
}

function drawWalls(ctx, layout, state) {
  const { scenario, op, scan } = state;
  const mine = op.floor;
  if (state.plan) {
    for (const floor of scenario.floors) {
      const delta = floor.id - mine;
      if (floor.id !== mine && (!scan.has(floor.id) || Math.abs(delta) > 1)) continue;
      const drawn = geometryOverride(state.plan, floor.id);
      if (!drawn || !drawn.walls.length) continue;
      ctx.save();
      ctx.lineWidth = floor.id === mine ? 1.6 : 1;
      ctx.strokeStyle =
        floor.id === mine
          ? "rgba(180, 255, 210, 0.8)"
          : delta > 0
            ? "rgba(126, 246, 255, 0.35)"
            : "rgba(255, 191, 60, 0.35)";
      strokeWalls(ctx, layout, state, drawn.walls);
      ctx.restore();
    }
    return;
  }
  for (const floor of scenario.floors) {
    const delta = floor.id - mine;
    if (floor.id !== mine && (!scan.has(floor.id) || Math.abs(delta) > 1)) continue;
    ctx.save();
    ctx.lineWidth = floor.id === mine ? 1.4 : 1;
    ctx.strokeStyle =
      floor.id === mine
        ? "rgba(150, 255, 190, 0.55)"
        : delta > 0
          ? "rgba(126, 246, 255, 0.28)"
          : "rgba(255, 191, 60, 0.28)";
    strokeWalls(ctx, layout, state, floor.walls);
    ctx.restore();
  }
}

function ringValues(range) {
  const step = range <= 15 ? 5 : range <= 30 ? 5 : 10;
  const rings = [];
  for (let m = step; m < range - 0.1; m += step) rings.push(m);
  rings.push(range);
  return rings;
}

function drawRings(ctx, layout, range) {
  ctx.save();
  ctx.strokeStyle = "rgba(90, 255, 150, 0.38)";
  ctx.fillStyle = "rgba(190, 255, 210, 0.75)";
  ctx.lineWidth = 1;
  ctx.font = '11px "Share Tech Mono", ui-monospace, monospace';
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const rings = ringValues(range);
  for (const metres of rings) {
    const r = (metres / range) * layout.radius;
    ctx.beginPath();
    if (layout.view === "arc") ctx.arc(layout.cx, layout.cy, r, Math.PI, Math.PI * 2, false);
    else ctx.arc(layout.cx, layout.cy, r, 0, Math.PI * 2);
    ctx.stroke();
    const label = Number.isInteger(metres) ? String(metres) : m1(metres);
    ctx.fillText(label, layout.cx + 6, layout.cy - r);
  }

  ctx.strokeStyle = "rgba(90, 255, 150, 0.22)";
  const spokes = layout.view === "arc" ? 7 : 12;
  const start = layout.view === "arc" ? -Math.PI / 2 : 0;
  const span = layout.view === "arc" ? Math.PI : Math.PI * 2;
  for (let i = 0; i < spokes; i++) {
    const bearing = start + (span * i) / (spokes - (layout.view === "arc" ? 1 : 0));
    const a = -Math.PI / 2 + bearing;
    ctx.beginPath();
    ctx.moveTo(layout.cx, layout.cy);
    ctx.lineTo(layout.cx + Math.cos(a) * layout.radius, layout.cy + Math.sin(a) * layout.radius);
    ctx.stroke();
  }
  ctx.restore();
}

function drawSweep(ctx, layout, sweep, view) {
  const screen = -Math.PI / 2 + sweep;
  const signed = sweep > Math.PI ? sweep - Math.PI * 2 : sweep;
  if (view === "arc" && (signed < -Math.PI / 2 - 0.2 || signed > Math.PI / 2 + 0.2)) return;

  ctx.save();
  clipScope(ctx, layout);
  for (let i = 10; i >= 0; i--) {
    const a0 = screen - (i + 1) * 0.05;
    const a1 = screen - i * 0.05;
    ctx.beginPath();
    ctx.moveTo(layout.cx, layout.cy);
    ctx.arc(layout.cx, layout.cy, layout.radius, a0, a1, false);
    ctx.closePath();
    const alpha = 0.015 + (10 - i) * 0.012;
    ctx.fillStyle = `rgba(120, 255, 170, ${alpha})`;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(layout.cx, layout.cy);
  ctx.lineTo(
    layout.cx + Math.cos(screen) * layout.radius,
    layout.cy + Math.sin(screen) * layout.radius
  );
  ctx.strokeStyle = "rgba(230, 255, 236, 0.9)";
  ctx.lineWidth = 1.6;
  ctx.shadowColor = "#b6ffd0";
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.restore();
}

function drawContacts(ctx, layout, state, samples) {
  const sweep = sweepAngle(state.time);
  const visible = samples.filter((s) => s.visible);
  const nearest = visible[0];
  const placed = [];
  ctx.save();
  ctx.font = '12px "Share Tech Mono", ui-monospace, monospace';
  ctx.textBaseline = "middle";
  for (const sample of visible) {
    const raw = state.contacts.find((c) => c.id === sample.id);
    const pt = project(layout, sample.dx, sample.dy, state.op.heading, state.range);
    if (!inScope(layout, pt)) continue;
    const fresh = 1 - Math.min(1, angDiff(pt.bearing, sweep) / 1.6);
    const color = relColor(sample.rel);
    const selected = state.trackNearest
      ? nearest && sample.id === nearest.id
      : state.pin === sample.id;

    if (selected && raw && raw.hist.length > 1) {
      ctx.beginPath();
      raw.hist.forEach((p, i) => {
        const hp = project(
          layout,
          p.x - state.op.x,
          p.y - state.op.y,
          state.op.heading,
          state.range
        );
        if (i === 0) ctx.moveTo(hp.x, hp.y);
        else ctx.lineTo(hp.x, hp.y);
      });
      ctx.strokeStyle = color;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    const phase = (state.time * (sample.bpm / 60)) % 1;
    const pulse = phase < 0.12 ? 1.55 : 1;
    const radius = (selected ? 6 : 4.2) * pulse;
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10 + fresh * 8;
    ctx.globalAlpha = 0.55 + fresh * 0.45;
    ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
    ctx.fill();
    if (fresh > 0.82) {
      ctx.globalAlpha = (fresh - 0.82) * 3;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, radius + 7, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;

    if (sample.rel !== "level") {
      ctx.fillStyle = color;
      ctx.beginPath();
      if (sample.rel === "above") {
        ctx.moveTo(pt.x, pt.y - radius - 7);
        ctx.lineTo(pt.x - 4.5, pt.y - radius - 1);
        ctx.lineTo(pt.x + 4.5, pt.y - radius - 1);
      } else {
        ctx.moveTo(pt.x, pt.y + radius + 7);
        ctx.lineTo(pt.x - 4.5, pt.y + radius + 1);
        ctx.lineTo(pt.x + 4.5, pt.y + radius + 1);
      }
      ctx.closePath();
      ctx.fill();
    }

    if (selected) {
      ctx.strokeStyle = "#f4fff6";
      ctx.lineWidth = 1;
      ctx.strokeRect(pt.x - 9, pt.y - 9, 18, 18);
    }

    const label = `${sample.rel === "above" ? "▲" : sample.rel === "below" ? "▼" : ""}${m1(sample.slant)}m`;
    const lx = pt.x + 10;
    const ly = pt.y - 12;
    const crowded = placed.some((p) => Math.hypot(p.x - lx, p.y - ly) < 32);
    if (!crowded || selected) {
      placed.push({ x: lx, y: ly });
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(0, 16, 8, 0.9)";
      ctx.fillStyle = color;
      ctx.strokeText(label, lx, ly);
      ctx.fillText(label, lx, ly);
    }
  }
  ctx.restore();
}

function drawOrigin(ctx, layout) {
  ctx.save();
  ctx.translate(layout.cx, layout.cy);
  ctx.fillStyle = "#ffe14a";
  ctx.shadowColor = "#ffe14a";
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.lineTo(5, 5);
  ctx.lineTo(0, 2);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function hitRadar(layout, range, heading, x, y, samples) {
  if (!layout) return null;
  const scale = layout.radius / range;
  const right = (x - layout.cx) / scale;
  const fwd = (layout.cy - y) / scale;
  if (layout.view === "arc" && fwd < -0.4) return null;
  if (Math.hypot(right, fwd) > range) return null;
  const h = (heading * Math.PI) / 180;
  const cos = Math.cos(h);
  const sin = Math.sin(h);
  const dx = right * cos + fwd * sin;
  const dy = -right * sin + fwd * cos;
  let best = null;
  let bestD = Math.max(1.3, range * 0.07);
  for (const sample of samples) {
    if (!sample.visible) continue;
    const d = Math.hypot(sample.dx - dx, sample.dy - dy);
    if (d < bestD) {
      bestD = d;
      best = sample;
    }
  }
  return best;
}

export function planTransform(w, h, bounds) {
  const pad = 16;
  const worldW = Math.max(0.1, bounds.maxX - bounds.minX);
  const worldH = Math.max(0.1, bounds.maxY - bounds.minY);
  const scale = Math.min((w - pad * 2) / worldW, (h - pad * 2) / worldH);
  const mapW = worldW * scale;
  const mapH = worldH * scale;
  const ox = (w - mapW) / 2;
  const oy = (h - mapH) / 2;
  return {
    scale,
    toScreen(x, y) {
      return {
        x: ox + (x - bounds.minX) * scale,
        y: oy + (bounds.maxY - y) * scale,
      };
    },
    toWorld(px, py) {
      return {
        x: bounds.minX + (px - ox) / scale,
        y: bounds.maxY - (py - oy) / scale,
      };
    },
  };
}

export function drawPlan(ctx, w, h, state, samples) {
  const tf = planTransform(w, h, state.scenario.bounds);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#03150c";
  ctx.fillRect(0, 0, w, h);
  const floor = state.scenario.floors.find((f) => f.id === state.op.floor) || state.scenario.floors[0];
  const drawn = state.plan ? geometryOverride(state.plan, state.op.floor) : null;

  ctx.save();
  const print = state.plan && state.plan.blueprint && state.plan.blueprint.floor === state.op.floor
    ? cachedImage(state.plan.blueprint.dataUrl)
    : null;
  if (print) {
    const origin = tf.toScreen(state.scenario.bounds.minX, state.scenario.bounds.maxY);
    const far = tf.toScreen(state.scenario.bounds.maxX, state.scenario.bounds.minY);
    ctx.globalAlpha = 0.55;
    ctx.drawImage(print, origin.x, origin.y, far.x - origin.x, far.y - origin.y);
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(140, 255, 190, 0.7)";
  ctx.beginPath();
  const walls = drawn ? drawn.walls : floor.walls;
  for (const wall of walls) {
    const a = tf.toScreen(wall.x1, wall.y1);
    const b = tf.toScreen(wall.x2, wall.y2);
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(180, 255, 210, 0.45)";
  ctx.font = '10px "Share Tech Mono", ui-monospace, monospace';
  ctx.textAlign = "center";
  const labels = drawn ? drawn.rooms : floor.rooms;
  for (const room of labels) {
    const p = tf.toScreen(room.x + room.w / 2, room.y + room.h / 2);
    ctx.fillText(room.name, p.x, p.y);
  }
  if (state.draftRect) {
    const a = tf.toScreen(state.draftRect.x, state.draftRect.y + state.draftRect.h);
    const b = tf.toScreen(state.draftRect.x + state.draftRect.w, state.draftRect.y);
    ctx.strokeStyle = "#ffe14a";
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  }

  for (const sample of samples) {
    if (sample.floorIndex !== state.op.floor && Math.abs(sample.z - state.op.floor * state.scenario.floorH) > state.scenario.floorH * 0.6) {
      const p = tf.toScreen(sample.x, sample.y);
      ctx.globalAlpha = sample.scanned ? 0.85 : 0.3;
      ctx.fillStyle = relColor(sample.rel);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  for (const sample of samples) {
    if (Math.round(sample.z / state.scenario.floorH) !== state.op.floor) continue;
    const p = tf.toScreen(sample.x, sample.y);
    ctx.fillStyle = sample.scanned ? LEVEL : DIM;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  const you = tf.toScreen(state.op.x, state.op.y);
  ctx.translate(you.x, you.y);
  ctx.rotate((state.op.heading * Math.PI) / 180);
  ctx.fillStyle = "#ffe14a";
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 6);
  ctx.lineTo(0, 3);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "rgba(190, 255, 210, 0.55)";
  ctx.font = '10px "Saira Condensed", sans-serif';
  ctx.textAlign = "left";
  ctx.fillText("N", 8, 12);
  return tf;
}

export function drawEcg(ctx, w, h, time, bpm) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#02140c";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(80, 255, 140, 0.18)";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.72);
  ctx.lineTo(w, h * 0.72);
  ctx.stroke();
  if (!bpm) return;
  ctx.beginPath();
  ctx.strokeStyle = "#b6ff9a";
  ctx.lineWidth = 1.4;
  ctx.shadowColor = "#39ff7a";
  ctx.shadowBlur = 6;
  const period = 60 / Math.max(40, bpm);
  for (let x = 0; x <= w; x += 2) {
    const t = time - ((w - x) / w) * period * 3.2;
    const phase = ((t / period) % 1 + 1) % 1;
    const y = h * 0.72 - ecgSample(phase) * h * 0.55;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

const imageCache = new Map();

function cachedImage(dataUrl) {
  let image = imageCache.get(dataUrl);
  if (!image) {
    image = new Image();
    image.src = dataUrl;
    imageCache.set(dataUrl, image);
  }
  return image.complete && image.naturalWidth ? image : null;
}

function ecgSample(p) {
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
