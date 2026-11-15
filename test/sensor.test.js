import test from "node:test";
import assert from "node:assert/strict";
import {
  m1,
  slant,
  relation,
  gait,
  clockFace,
  cellChargeWatts,
  loadWatts,
  advancePower,
  createPower,
  screenAlive,
  powerStatus,
  PACK_WH,
} from "../js/geom.js";
import { createState, sensedContacts, step } from "../js/sim.js";

test("distance is one decimal metre", () => {
  assert.equal(m1(10), "10.0");
  assert.equal(m1(10.14), "10.1");
  assert.equal(m1(10.15), "10.2");
  assert.equal(m1(10.04), "10.0");
  assert.equal(m1(-0.04), "0.0");
  assert.equal(m1(-1.26), "-1.3");
});

test("slant range includes the floor above you", () => {
  const flat = slant(10, 0, 0);
  assert.equal(m1(flat), "10.0");
  const above = slant(10, 0, 3);
  assert.equal(m1(above), "10.4");
  assert.equal(relation(3), "above");
  assert.equal(relation(-2.8), "below");
  assert.equal(relation(0.2), "level");
});

test("gait and clock", () => {
  assert.equal(gait(0), "STILL");
  assert.equal(gait(1.2), "WALK");
  assert.equal(gait(3.2), "RUN");
  assert.equal(clockFace(0), "12 o'clock");
  assert.equal(clockFace(90), "3 o'clock");
  assert.equal(clockFace(180), "6 o'clock");
  assert.equal(clockFace(-90), "9 o'clock");
});

test("block reads above, below, and through a wall", () => {
  const state = createState("block");
  const list = sensedContacts(state).filter((c) => c.visible);
  const names = list.map((c) => `${c.name}:${c.rel}:${c.thru}:${m1(c.slant)}`);
  assert.ok(list.some((c) => c.rel === "above"), names.join(" | "));
  assert.ok(list.some((c) => c.rel === "below"), names.join(" | "));
  assert.ok(list.some((c) => c.thru === "wall"), names.join(" | "));
  for (const c of list) {
    assert.match(m1(c.slant), /^\d+\.\d$/);
  }
  const shaw = list.find((c) => c.name === "SHAW");
  assert.ok(shaw, "SHAW should be in range above the kitchen");
  assert.equal(shaw.rel, "above");
  assert.ok(shaw.slant < 8, shaw.slant);
  const quinn = list.find((c) => c.name === "QUINN");
  assert.equal(quinn.rel, "below");
});

test("jogger speed is measured from movement", () => {
  const state = createState("yard");
  step(state, 1.2);
  const juno = sensedContacts(state).find((c) => c.name === "JUNO");
  assert.ok(juno.visible);
  assert.ok(juno.motion.speed > 2.8 && juno.motion.speed < 3.5, juno.motion.speed);
  assert.equal(gait(juno.motion.speed), "RUN");
  assert.match(m1(juno.motion.speed), /^\d+\.\d$/);
  const kmh = juno.motion.speed * 3.6;
  assert.ok(kmh > 10 && kmh < 13);
});

test("turning floors off hides the people on them", () => {
  const state = createState("block");
  state.scan = new Set([state.op.floor]);
  const list = sensedContacts(state).filter((c) => c.visible);
  assert.ok(list.length >= 1);
  assert.ok(list.every((c) => c.floorIndex === state.op.floor));
  state.scan = new Set([state.op.floor + 1, state.op.floor - 1]);
  const vertical = sensedContacts(state).filter((c) => c.visible);
  assert.ok(vertical.every((c) => c.rel !== "level"));
  assert.ok(vertical.some((c) => c.rel === "above"));
  assert.ok(vertical.some((c) => c.rel === "below"));
});

test("usb-c fast charge fills the pack and battery runs it unplugged", () => {
  const load = loadWatts(false);
  assert.equal(load, 8);
  assert.ok(Math.abs(cellChargeWatts(load) - 33.3) < 0.001);

  const charging = createPower(PACK_WH * 0.58);
  charging.plugged = true;
  charging.negotiate = 0;
  advancePower(charging, 30 * 60, load);
  const up = powerStatus(charging, load);
  assert.ok(up.pct > 90 && up.pct < 96, up.pct);
  assert.equal(up.mode, "FASTCHARGE");
  assert.equal(up.volts, 15);
  assert.equal(up.amps, 3);

  const draining = createPower(PACK_WH * 0.58);
  advancePower(draining, 30 * 60, load);
  const down = powerStatus(draining, load);
  assert.ok(down.pct > 47 && down.pct < 52, down.pct);
  assert.equal(down.mode, "BATTERY");
  assert.equal(screenAlive(draining), true);

  const dead = createPower(0.1);
  advancePower(dead, 120, load);
  assert.equal(dead.wh, 0);
  assert.equal(screenAlive(dead), false);
  dead.plugged = true;
  dead.negotiate = 0;
  assert.equal(screenAlive(dead), true);
});
