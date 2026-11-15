/** Saved floor plans. The bank lives in the browser's IndexedDB, which is the tablet's storage. */

export function roomsToWalls(rooms) {
  const walls = [];
  for (const room of rooms || []) {
    const x2 = room.x + room.w;
    const y2 = room.y + room.h;
    walls.push(
      { x1: room.x, y1: room.y, x2, y2: room.y },
      { x1: x2, y1: room.y, x2, y2 },
      { x1: x2, y1: y2, x2: room.x, y2 },
      { x1: room.x, y1: y2, x2: room.x, y2: room.y }
    );
  }
  return walls;
}

export function geometryOverride(plan, floorId) {
  if (!plan) return null;
  const rooms = (plan.rooms || []).filter((room) => room.floor === floorId);
  if (!rooms.length) return null;
  return { rooms, walls: roomsToWalls(rooms) };
}

export function emptyPlan(name) {
  return {
    id: crypto.randomUUID(),
    name: name || "UNTITLED",
    rooms: [],
    blueprint: null,
    updated: Date.now(),
  };
}

export function packBank(plans) {
  return JSON.stringify({ version: 1, plans: plans || [] });
}

export function unpackBank(text) {
  const data = JSON.parse(text);
  const plans = Array.isArray(data) ? data : data.plans;
  if (!Array.isArray(plans)) throw new Error("No plans in that file");
  return plans
    .filter((plan) => plan && typeof plan.name === "string" && Array.isArray(plan.rooms))
    .map((plan) => ({
      id: typeof plan.id === "string" ? plan.id : crypto.randomUUID(),
      name: plan.name.slice(0, 48),
      rooms: plan.rooms
        .filter((room) => Number.isFinite(room.x) && Number.isFinite(room.y) && room.w > 0 && room.h > 0)
        .map((room) => ({
          id: typeof room.id === "string" ? room.id : crypto.randomUUID(),
          floor: Number.isFinite(room.floor) ? room.floor : 0,
          x: room.x,
          y: room.y,
          w: room.w,
          h: room.h,
          name: String(room.name || "ROOM").slice(0, 24),
        })),
      blueprint: plan.blueprint && typeof plan.blueprint.dataUrl === "string" ? plan.blueprint : null,
      updated: Date.now(),
    }));
}

const DB_NAME = "pulsegrid-bank";
const STORE = "plans";

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function listPlans() {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const request = tx.objectStore(STORE).getAll();
  const rows = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  await txDone(tx);
  db.close();
  return rows.sort((a, b) => (b.updated || 0) - (a.updated || 0));
}

export async function savePlan(plan) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put({ ...plan, updated: Date.now() });
  await txDone(tx);
  db.close();
}

export async function deletePlan(id) {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}

export function downloadBank(plans) {
  const blob = new Blob([packBank(plans)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "pulsegrid-plans.json";
  link.click();
  URL.revokeObjectURL(url);
}

/** Write the bank onto a folder the user picks. On the Pi, that folder can be a USB stick. */
export async function writeBankToFolder(plans) {
  if (typeof window.showDirectoryPicker !== "function") {
    downloadBank(plans);
    return "download";
  }
  const dir = await window.showDirectoryPicker({ mode: "readwrite" });
  const handle = await dir.getFileHandle("pulsegrid-plans.json", { create: true });
  const writable = await handle.createWritable();
  await writable.write(packBank(plans));
  await writable.close();
  return "usb";
}
