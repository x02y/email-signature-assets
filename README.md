# Pulsegrid MK1

Handheld heartbeat-sensor tablet. The screen is a multi-floor room simulation: slant range to 0.1 m, speed from how far each person moved, and a floor stack so you can see who is above or below you.

It does not sense real people through walls.

## Run

```bash
python3 -m http.server 8080
```

Open `http://127.0.0.1:8080`. On a phone or tablet, use HOLD for a full-screen grip.

## On a Raspberry Pi

Use a Raspberry Pi 5 and a 7-inch touchscreen. Serve this folder and open it in Chromium kiosk mode.

The Pi’s USB-C port wants **5 V**. A Pi 5 is happiest with a supply that can do 5 V at 5 A. Do not feed a 15 V charger straight into the Pi.

The on-screen contract (15 V / 3 A, 45 W) is the pack charger, not the Pi’s input. In a real shell that 15 V stops at a charger board, which makes 5 V for the Pi and puts the spare watts into the cells. Unplugged, a 48 Wh pack at about 8 W runs the Pi and the backlight for several hours.

## Map

SENSE counts storeys from the heights of heartbeats in range. DRAW lets you drag rooms onto the floor you are standing on and save them in a bank on the device. PLANS imports a blueprint picture or a `pulsegrid-plans.json` file, and exports that file. TO USB writes it into a folder you pick, which on the Pi can be a memory stick.

AUDIO plays a heartbeat each time the sweep detects someone in range.

```bash
chromium --kiosk --app=http://127.0.0.1:8080
```

## Tests

```bash
node --test
```
