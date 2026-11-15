# Pulsegrid MK1 — handoff

This file is for a local coding session that does not have the earlier chat. Read it before changing the tablet. The short run notes are in `README.md`.

Product name on the bezel: **PULSEGRID MK1**. Screen title: **HEARTBEAT SENSOR**. Badge: **ROOM SIM**.

Repo: `x02y/email-signature-assets`, branch `cursor/heartbeat-sensor-tablet-b2a2`, pull request #1 against `main`. The repo also holds Elysian Quantum Audio logo PNGs (`EQA Logo AW.png`, `EQA Logo ES v2.png`, `EQA Logo v2.png`). Leave those files alone. Do not rebrand the sensor as EQA. Do not use Call of Duty, Modern Warfare, or PlayStation names or marks. The screen is an original instrument, not a copy of a game HUD.

## What it is

A handheld tablet screen. You hold it, walk a floor plan, and watch simulated people as cardiac tracks. It tells you:

- who is in range
- whether each person is above you, level with you, or below you
- slant range from the tablet to that person, always to 0.1 m (for example `10.1 m`)
- how fast they are moving, and whether the range is closing or opening
- a heartbeat sound each time the sweep detects someone in range

Four buildings are built in: Harrow Court (six flats), Terrace House, Meridian Office, and Dock Warehouse.

The picture of walls and floors is computed on the page from the room data. **It does not listen through real walls.** Do not add a real through-wall radar, and do not give frequencies, transmit power, antenna designs, or covert-surveillance build steps. Consumer same-room mmWave was left off the parts list on purpose.

`THRU WALL` means the straight line in the simulation crosses a wall on your floor. `THRU FLOOR` means the person is on another deck.

## How to run and test

No bundler and no npm install. `package.json` sets `"type": "module"`. The page is static ES modules.

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080`. HOLD asks for fullscreen.

```bash
node --test
```

Nine tests live in `test/sensor.test.js`. Keep them passing. They cover one-decimal metres, slant range with a floor of height, gait, the block having someone above, level, and below, a measured jog, floor filtering, storey counting, a plan export, and the USB-C charge math.

On a Raspberry Pi 5, serve this folder and open it in Chromium kiosk mode:

```bash
chromium --kiosk --app=http://127.0.0.1:8080
```

The Pi’s USB-C port wants **5 V**. A Pi 5 is happiest with a supply that can do 5 V at 5 A. Do not feed 15 V into the Pi. The 15 V / 3 A / 45 W figure on the power sheet is the simulated pack charger, not the Pi’s input.

## Files

| File | Job |
| --- | --- |
| `index.html` | Device chrome, radar, floor stack, side panel, plan, power sheet, plans sheet, rig sheet, dead-battery overlay, USB-C port |
| `css/app.css` | Rugged tablet, phosphor UI, floor stack, phone layout |
| `js/geom.js` | Distance, speed, gait, walls, ECG shape, storey counting, pack math. No DOM |
| `js/scenarios.js` | The four buildings, rooms, walls, and people. Metres. Floor index 0 is the lowest |
| `js/sim.js` | Walking the paths, the sweep, sampling, scan set, operator nudges |
| `js/draw.js` | Radar, plan, and ECG canvases |
| `js/plans.js` | Drawn rooms, IndexedDB bank, JSON import and export, USB folder write |
| `js/main.js` | Animation loop, buttons, heartbeat sound, sheets |
| `icon.svg`, `manifest.webmanifest` | Home-screen icon |

The side panel is a six-row grid: scenes, map header, floor presets, detail, contact list, plan. Do not add another direct child of `aside` without changing `grid-template-rows`. On a phone the aside becomes a scrolling column and the contact list must not collapse to height 0. Contact names go in with `textContent`, never `innerHTML`.

Canvas bitmaps resize only when the CSS size changes. DOM text updates every frame. The floor stack and the contact list rebuild only when the scenario or the ids change.

## Coordinates and range

- Units are metres.
- `+y` is north. Heading `0` is north and increases clockwise.
- Operator height is `floorIndex * floorH`. Contact height is continuous, so a person on stairs can sit between storeys.
- Slant range is `hypot(dx, dy, dz)`, the straight line from the tablet to the person, including the height between floors.
- `m1()` prints one decimal, half-up. A tiny negative such as `-0.04` prints as `0.0`.
- Relation: `dz > 0.5` is above, `dz < -0.5` is below, otherwise level.
- Gait: under `0.3` m/s still, under `1.8` walk, under `3.5` run, otherwise sprint.
- Speed comes from position history over about 2.4 s, sampled every 0.1 s. It reports 3D speed, horizontal, vertical, and closure. Closure is `d(slant)/dt`. Negative means the person is getting closer.
- Heart rate on screen is `restBpm + speed * 22`, with a small sine wobble. It is a display, not a measurement.

`createState` fast-forwards the sim by 24 steps of 0.1 s. `step()` must consume the whole `dt` in 0.05 s substeps. Clamping and dropping the rest makes the fast-forward too short.

## The sweep and the heartbeat

The sweep angle is derived from time, not accumulated: `-π/2 + time * 2.4` rad/s, then wrapped into `(-π, π]`. The beam “sees” a contact when the angular gap is under `0.22` rad. In ARC view the bearing also has to be inside the forward half. Each contact pings once per revolution.

AUDIO defaults on. The first pointer unlocks `AudioContext` (browsers block sound until a gesture). Each new ping plays two thumps, about 90 Hz then 58 Hz. Several pings in one frame are staggered, capped at four. AUDIO toggles mute. There is no distance alarm. Do not add one unless the owner asks.

## Floors

The stack on the right of the scope is the building, top to bottom. The DOM order is low-to-high and the column is reversed, so the ground plate sits at the bottom under DOWN and the top floor sits under UP. Tap a plate to scan that floor. Tap the letter to go and stand there. You cannot turn off the last scanned floor.

Presets: ALL FLOORS, ±1 FLOOR, THIS FLOOR. People on a floor you are not scanning stay out of the radar and are counted in the “not scanning” line.

Colours: above is cyan with ▲, your level is green with a dot, below is amber with ▼. The yellow mark on a floor plate is you. The yellow arrow on the plan is you and points the way the arc is facing. Blip labels include the slant, such as `▲3.1m`.

## SENSE, DRAW, and PLANS

**SENSE** is the default. It does not use a drawing. `senseFloors()` in `geom.js` rounds each in-range heartbeat height and your height to a storey using the building’s `floorH` as the pitch. The count is `highestIndex - lowestIndex + 1`, so an empty storey between two heartbeats still counts, and your own storey is included. The line looks like `SENSE · 5 STOREYS · ON 5 · 2 BELOW · 2 ABOVE · PITCH 3.0 m`. With nobody in range the count is just you. The stack still shows the loaded building’s real floors. The sensed number can be smaller when people are out of range.

**DRAW.** Drag a rectangle on the plan. If it is at least 0.5 m on each side it becomes `ROOM n` on the floor you are standing on. UNDO ROOM pops the last room. Until a floor has a drawn room, that floor keeps the scenario walls. A drawn room replaces walls and room names on that floor only, for both the picture and the `THRU WALL` test. The people remain the scenario’s people.

**PLANS** opens the bank. SAVE writes the current sketch to IndexedDB database `pulsegrid-bank`, object store `plans`. LOAD copies a saved plan back onto the screen and switches to DRAW. DELETE removes it from the bank.

IMPORT accepts a PNG, JPEG, or WebP under 1.2 MB, laid under the floor you were on, or a `pulsegrid-plans.json` file. EXPORT downloads that file. TO USB uses `showDirectoryPicker` and writes `pulsegrid-plans.json` into the folder you pick. On the Pi that folder can be a memory stick. If the browser has no folder picker, TO USB downloads the file instead.

Switching building returns to SENSE and does not carry the live sketch onto the new building. The bank itself stays.

Export shape:

```json
{
  "version": 1,
  "plans": [
    {
      "id": "…",
      "name": "HARROW COURT SKETCH",
      "rooms": [{ "id": "…", "floor": 3, "x": 1, "y": 2, "w": 4, "h": 3, "name": "ROOM 1" }],
      "blueprint": { "floor": 3, "dataUrl": "data:image/png;base64,…", "name": "plan.png" },
      "updated": 0
    }
  ]
}
```

`state.plan` is applied at the start of the frame, before `step()`, so the wall test sees the drawing. SENSE forces `state.plan` to null. `switchScenario` does not copy the plan.

## Controls

- Drag the plan to walk. In DRAW, dragging adds a room instead.
- Tap a dot on the plan or a return on the radar to pin that person. NEAREST goes back to the closest in-range contact.
- N E S W step 0.6 m. Arrow keys do the same. Q and E turn 15°. The on-screen turn buttons do the same.
- A toggles ARC and 360. The range button, or `[` and `]`, cycles 10, 15, 20, 25, 30, 40 m.
- C, the chin USB-C port, or CONNECT USB-C plugs and unplugs the charger.
- The clock is `Europe/London`.

## Power, on screen and in hardware

On screen the pack is 48 Wh and starts at 58% (`PACK_WH * 0.58`). Load is 5.4 + 2.2 + 0.4 = 8.0 W, plus 0.3 W while audio is on. A plugged source offers 45 W, modelled as 15 V at 3 A. After a 0.85 s handshake the cells take `max(0, (45 - load) * 0.9)` watts, which is 33.3 W at an 8 W load. The screen stays on while the pack is above 0.25 Wh, or while it is plugged and the handshake has finished, so a flat pack boots from the charger. ELAPSE 10 MIN and ELAPSE 30 MIN jump the pack clock. Live drain is real time. Watt-hours on the sheet are shown to two decimals.

That 15 V number is a label in the simulation. In a real shell:

- Power the Pi at 5 V. The official 45 W Raspberry Pi USB-C supply negotiates 5 V at up to 5 A with a Pi 5. Use that for the wall.
- A USB-C power bank runs the tablet with the wall unplugged. Many banks only offer 5 V at 3 A (15 W). That still covers an about 8 W tablet and limits USB extras on the Pi. A 45 W bank has more headroom.
- Do not wire 15 V into the Pi’s USB-C port. If a pack charger speaks 15 V, that contract has to stop at a charger board that makes 5 V for the Pi. This page does not specify that board, and a session must not invent a boost or buck circuit.

## Parts, UK, 15 November 2026

Prices include VAT, from The Pi Hut and Anker UK on 15 November 2026. They move. Re-check before buying. Shipping is extra.

| Part | Why | Price |
| --- | --- | --- |
| Raspberry Pi 5, 4 GB | Runs the page. 4 GB is enough. 8 GB is not required | £105.60 |
| Raspberry Pi Touch Display 2, 7 inch | The glass. 720×1280 portrait. Rotate to landscape in Raspberry Pi OS. The Pi bolts to the back with the screws in the box. Power and picture go over the included GPIO cable and DSI ribbon. No second supply | £57.60 |
| Active Cooler for Pi 5 | The Pi sits on the back of the glass, so it needs its own cooler | £4.80 |
| Official 64 GB A2 microSD with Raspberry Pi OS | Boot disk. The Pi Hut’s 32 GB official card was discontinued | £30.60 |
| Official Raspberry Pi 45 W USB-C PSU, UK plug | Wall power. Gives the Pi 5 V at up to 5 A | £14.40 |
| Anker Zolo 20,000 mAh, 45 W, built-in USB-C cables | The pack in your hand. Listed at £32.99, down from £44.99. The sale can end | £32.99 |

Optional: The Pi Hut’s enclosure for the 7 inch Touch Display 2, £9.90, fits a Pi 5 and the Active Cooler. It is a ventilated shell, including a wall mount, rather than a rubberised grip. The official red and white Pi 5 case does **not** fit, because the Pi is mounted on the display.

The glass has no speaker and the Pi 5 has no headphone jack. The heartbeat is Web Audio, so a small USB speaker is needed if the tablet should be heard. No speaker was priced.

Totals, incl. VAT, before shipping:

- Wall only, no shell: **£213.00**
- Wall only, with the display enclosure: **£222.90**
- Handheld, bank at the £32.99 price, no shell: **£245.99**
- Handheld plus the display enclosure: **£255.89**

At the bank’s £44.99 list price, add £12.

## Buildings

| Button | Name | Floors | Storey pitch | Start range | You start |
| --- | --- | --- | --- | --- | --- |
| BLOCK | Harrow Court | 6 (G–5) | 3.0 m | 20 m | Floor 3, kitchen |
| HOUSE | Terrace House | 3 (ground, first, loft) | 2.8 m | 15 m | First floor, so people exist above and below |
| OFFICE | Meridian Office | 5, including a basement | 3.6 m | 25 m | Level 1 |
| DOCK | Dock Warehouse | Floor plus mezzanine | 4.5 m | 30 m | The floor. JUNO is the jogger used by the speed test |

People follow loops of points with a dwell. Do not move IHEANACHO, SHAW, or QUINN far enough to break the block test: IHEANACHO is level and through a wall, SHAW is above, QUINN is below. JUNO’s speed check expects roughly 2.8–3.5 m/s, gait RUN.

## Do not build unless the owner asks

**Time to contact** was discussed and left off. Metres divided by closing speed is the seconds until someone walking straight at you arrives. It is only true while they keep that pace. It is the same kind of urgency as a distance alarm, which the owner did not want.

**Remember the building** is an open design choice. Three different saves got mixed together:

1. Last session: which building, which floor, which floors were scanned, and where you stood and faced. The tablet would reopen where you left it.
2. The plan bank. This already persists in IndexedDB and exports.
3. A sensed reading, such as “5 storeys, 2 below, 2 above”. That number changes as people enter and leave range, so saving one sample as “the building” would freeze a moment.

The owner still needs to say whether “remember” means the last pose, or a sensed floor count that DRAW and an imported blueprint then fill in. A saved plan and the live scenario are separate today. Pairing them, so a Harrow Court sketch reloads only with Harrow Court, is part of that decision. Do not implement it while it is still open.

## Layout notes that already bit once

- The floor stack looked upside down until it was `column-reverse` with UP at the top and DOWN at the bottom.
- The contact list collapsed on a phone when it was allowed to shrink. On a narrow screen `#tracks` and `.plan-wrap` are `flex: 0 0 auto`.
- The power sheet background is solid `#02140c`. A translucent sheet let the radar show through.
- The tracks row is `minmax(110px, 1fr)` and the plan row is `minmax(120px, 168px)`, so a taller map header does not crush the list to two lines.
