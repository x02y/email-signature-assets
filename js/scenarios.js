/** Room simulations. Coordinates are metres. Floor index 0 is the lowest level. */

export function hWall(x1, x2, y) {
  return { x1, y1: y, x2, y2: y };
}

export function vWall(x, y1, y2) {
  return { x1: x, y1, x2: x, y2 };
}

const southFlatWalls = [
  hWall(0.4, 10.6, 0.4),
  hWall(0.4, 10.6, 15.6),
  vWall(0.4, 0.4, 15.6),
  vWall(10.6, 0.4, 15.6),
  hWall(0.4, 10.6, 7.2),
  hWall(0.4, 4.2, 8.6),
  hWall(6.4, 10.6, 8.6),
  vWall(6.6, 0.4, 2.0),
  vWall(6.6, 2.8, 4.6),
  hWall(0.4, 5.2, 4.6),
  hWall(6.4, 10.6, 4.6),
  vWall(5.4, 4.6, 7.2),
  vWall(6.6, 8.6, 10.4),
  vWall(6.6, 11.4, 13.2),
  hWall(0.4, 5.2, 11.0),
  hWall(6.4, 10.6, 11.0),
  vWall(5.4, 11.0, 15.6),
];

const southRooms = [
  { name: "KITCHEN", x: 6.6, y: 0.4, w: 4.0, h: 4.2 },
  { name: "LIVING", x: 0.4, y: 0.4, w: 6.2, h: 4.2 },
  { name: "BED", x: 0.4, y: 4.6, w: 5.0, h: 2.6 },
  { name: "BATH", x: 5.4, y: 4.6, w: 5.2, h: 2.6 },
  { name: "LANDING", x: 0.4, y: 7.2, w: 10.2, h: 1.4 },
  { name: "LIVING", x: 0.4, y: 8.6, w: 6.2, h: 2.4 },
  { name: "KITCHEN", x: 6.6, y: 8.6, w: 4.0, h: 2.4 },
  { name: "BED", x: 0.4, y: 11.0, w: 5.0, h: 4.6 },
  { name: "BATH", x: 5.4, y: 11.0, w: 5.2, h: 4.6 },
];

function blockFloor(id, name, label) {
  return { id, name, label, walls: southFlatWalls, rooms: southRooms };
}

const houseShell = [
  hWall(0.3, 11.9, 0.3),
  hWall(0.3, 11.9, 8.7),
  vWall(0.3, 0.3, 8.7),
  vWall(11.9, 0.3, 8.7),
];

const houseGroundWalls = [
  ...houseShell,
  vWall(3.9, 0.3, 1.6),
  vWall(3.9, 2.7, 4.3),
  hWall(0.3, 2.0, 4.3),
  hWall(3.2, 6.4, 4.3),
  hWall(7.6, 11.9, 4.3),
  vWall(7.5, 4.3, 5.5),
  vWall(7.5, 6.7, 8.7),
];

const houseGroundRooms = [
  { name: "HALL", x: 0.3, y: 0.3, w: 3.6, h: 4.0 },
  { name: "STUDY", x: 3.9, y: 0.3, w: 8.0, h: 4.0 },
  { name: "LOUNGE", x: 0.3, y: 4.3, w: 7.2, h: 4.4 },
  { name: "KITCHEN", x: 7.5, y: 4.3, w: 4.4, h: 4.4 },
];

const houseFirstWalls = [
  ...houseShell,
  vWall(6.2, 4.3, 5.8),
  vWall(6.2, 7.0, 8.7),
  hWall(0.3, 2.4, 4.3),
  hWall(3.6, 11.9, 4.3),
  vWall(3.6, 0.3, 2.4),
  vWall(3.6, 3.3, 4.3),
];

const houseFirstRooms = [
  { name: "BATH", x: 0.3, y: 0.3, w: 3.3, h: 4.0 },
  { name: "LANDING", x: 3.6, y: 0.3, w: 8.3, h: 4.0 },
  { name: "BED A", x: 0.3, y: 4.3, w: 5.9, h: 4.4 },
  { name: "BED B", x: 6.2, y: 4.3, w: 5.7, h: 4.4 },
];

const houseLoftWalls = [...houseShell, vWall(8.4, 0.3, 8.7)];

const houseLoftRooms = [
  { name: "STUDIO", x: 0.3, y: 0.3, w: 8.1, h: 8.4 },
  { name: "STORE", x: 8.4, y: 0.3, w: 3.5, h: 8.4 },
];

const officeWalls = [
  hWall(0.4, 22.4, 0.4),
  hWall(0.4, 22.4, 12.4),
  vWall(0.4, 0.4, 12.4),
  vWall(22.4, 0.4, 12.4),
  hWall(0.4, 8.5, 6.2),
  hWall(11.5, 22.4, 6.2),
  hWall(0.4, 8.5, 8.2),
  hWall(11.5, 22.4, 8.2),
  vWall(8.5, 0.4, 4.4),
  vWall(8.5, 5.2, 6.2),
  vWall(14.5, 0.4, 6.2),
  vWall(14.5, 8.2, 12.4),
];

const officeRooms = [
  { name: "MEETING", x: 0.4, y: 0.4, w: 8.1, h: 5.8 },
  { name: "DESKS", x: 8.5, y: 0.4, w: 6.0, h: 5.8 },
  { name: "DESKS", x: 14.5, y: 0.4, w: 7.9, h: 12.0 },
  { name: "CORE", x: 8.5, y: 6.2, w: 3.0, h: 2.0 },
  { name: "CORRIDOR", x: 0.4, y: 6.2, w: 8.1, h: 2.0 },
  { name: "CORRIDOR", x: 11.5, y: 6.2, w: 10.9, h: 2.0 },
  { name: "STUDIO", x: 0.4, y: 8.2, w: 14.1, h: 4.2 },
];

function officeFloor(id, name, label) {
  return { id, name, label, walls: officeWalls, rooms: officeRooms };
}

const yardWalls = [
  hWall(0.3, 32.3, 0.3),
  hWall(0.3, 32.3, 16.3),
  vWall(0.3, 0.3, 16.3),
  vWall(32.3, 0.3, 16.3),
  vWall(8.3, 0.3, 6.4),
  vWall(8.3, 9.4, 16.3),
  vWall(16.3, 0.3, 6.4),
  vWall(16.3, 9.4, 16.3),
  vWall(24.3, 0.3, 6.4),
  vWall(24.3, 9.4, 16.3),
];

const yardRooms = [
  { name: "AISLE A", x: 0.3, y: 0.3, w: 8.0, h: 16.0 },
  { name: "AISLE B", x: 8.3, y: 0.3, w: 8.0, h: 16.0 },
  { name: "AISLE C", x: 16.3, y: 0.3, w: 8.0, h: 16.0 },
  { name: "AISLE D", x: 24.3, y: 0.3, w: 8.0, h: 16.0 },
];

const mezzWalls = [
  hWall(0.3, 12.3, 0.3),
  hWall(0.3, 12.3, 16.3),
  vWall(0.3, 0.3, 16.3),
  vWall(12.3, 0.3, 16.3),
  hWall(0.3, 12.3, 8.3),
];

const mezzRooms = [
  { name: "OFFICE", x: 0.3, y: 8.3, w: 12.0, h: 8.0 },
  { name: "GANTRY", x: 0.3, y: 0.3, w: 12.0, h: 8.0 },
];

function loop(points) {
  return points.map((p) => ({
    x: p.x,
    y: p.y,
    floor: p.floor,
    dwell: p.dwell || 0,
  }));
}

function person(spec) {
  return {
    id: spec.id,
    name: spec.name,
    restBpm: spec.rest,
    speedCmd: spec.speed,
    phase: spec.phase ?? 0,
    loop: loop(spec.loop),
  };
}

export const SCENARIOS = [
  {
    id: "block",
    name: "HARROW COURT",
    blurb: "Six flats stacked. Stand in a kitchen and read the floors above and below.",
    floorH: 3,
    range: 20,
    bounds: { minX: 0.2, maxX: 10.8, minY: 0.2, maxY: 15.8 },
    op: { x: 9.2, y: 1.0, floor: 3, heading: 270 },
    floors: [
      blockFloor(0, "G", "GROUND"),
      blockFloor(1, "1", "FLOOR 1"),
      blockFloor(2, "2", "FLOOR 2"),
      blockFloor(3, "3", "FLOOR 3"),
      blockFloor(4, "4", "FLOOR 4"),
      blockFloor(5, "5", "FLOOR 5"),
    ],
    contacts: [
      person({
        id: "ihea",
        name: "IHEANACHO",
        rest: 64,
        speed: 0.15,
        phase: 0.1,
        loop: [
          { x: 1.5, y: 1.2, floor: 3, dwell: 6 },
          { x: 2.4, y: 1.6, floor: 3, dwell: 2 },
          { x: 1.8, y: 2.4, floor: 3, dwell: 4 },
        ],
      }),
      person({
        id: "moss",
        name: "MOSS",
        rest: 70,
        speed: 0.9,
        phase: 0.4,
        loop: [
          { x: 9.8, y: 3.6, floor: 3, dwell: 1.2 },
          { x: 7.6, y: 3.8, floor: 3 },
          { x: 7.2, y: 2.6, floor: 3, dwell: 0.6 },
          { x: 9.6, y: 2.8, floor: 3 },
        ],
      }),
      person({
        id: "shaw",
        name: "SHAW",
        rest: 66,
        speed: 0.7,
        phase: 0.2,
        loop: [
          { x: 8.6, y: 1.4, floor: 4 },
          { x: 9.6, y: 2.2, floor: 4, dwell: 0.8 },
          { x: 8.2, y: 2.8, floor: 4 },
          { x: 7.6, y: 1.2, floor: 4, dwell: 0.4 },
        ],
      }),
      person({
        id: "quinn",
        name: "QUINN",
        rest: 60,
        speed: 0.2,
        phase: 0.5,
        loop: [
          { x: 8.8, y: 1.3, floor: 2, dwell: 5 },
          { x: 9.4, y: 2.0, floor: 2, dwell: 3 },
        ],
      }),
      person({
        id: "adler",
        name: "ADLER",
        rest: 58,
        speed: 0.1,
        phase: 0,
        loop: [
          { x: 2.2, y: 13.2, floor: 5, dwell: 8 },
          { x: 3.4, y: 12.4, floor: 5, dwell: 4 },
        ],
      }),
      person({
        id: "kent",
        name: "KENT",
        rest: 72,
        speed: 1.25,
        phase: 0.33,
        loop: [
          { x: 2.0, y: 12.0, floor: 1 },
          { x: 5.0, y: 13.4, floor: 1 },
          { x: 8.6, y: 12.6, floor: 1, dwell: 0.5 },
          { x: 4.0, y: 11.6, floor: 1 },
        ],
      }),
      person({
        id: "bloom",
        name: "BLOOM",
        rest: 76,
        speed: 0.85,
        phase: 0.15,
        loop: [
          { x: 5.2, y: 7.8, floor: 2, dwell: 0.4 },
          { x: 5.2, y: 7.8, floor: 3 },
          { x: 2.2, y: 6.2, floor: 3, dwell: 1.2 },
          { x: 5.2, y: 7.8, floor: 3 },
          { x: 5.2, y: 7.8, floor: 4 },
          { x: 8.4, y: 6.0, floor: 4, dwell: 1.4 },
          { x: 5.2, y: 7.8, floor: 4 },
          { x: 5.2, y: 7.8, floor: 3 },
          { x: 5.2, y: 7.8, floor: 2 },
        ],
      }),
      person({
        id: "dwyer",
        name: "DWYER",
        rest: 68,
        speed: 1.05,
        phase: 0.62,
        loop: [
          { x: 1.6, y: 9.6, floor: 3 },
          { x: 4.4, y: 10.2, floor: 3 },
          { x: 3.2, y: 13.6, floor: 3, dwell: 0.8 },
          { x: 1.4, y: 12.2, floor: 3 },
        ],
      }),
    ],
  },
  {
    id: "house",
    name: "TERRACE HOUSE",
    blurb: "Three floors of a terrace. Walls sit between rooms on the same level.",
    floorH: 2.8,
    range: 15,
    bounds: { minX: 0.2, maxX: 12.0, minY: 0.2, maxY: 8.8 },
    op: { x: 9.0, y: 6.4, floor: 1, heading: 270 },
    floors: [
      { id: 0, name: "G", label: "GROUND", walls: houseGroundWalls, rooms: houseGroundRooms },
      { id: 1, name: "1", label: "FIRST", walls: houseFirstWalls, rooms: houseFirstRooms },
      { id: 2, name: "L", label: "LOFT", walls: houseLoftWalls, rooms: houseLoftRooms },
    ],
    contacts: [
      person({
        id: "reed",
        name: "REED",
        rest: 66,
        speed: 1.15,
        phase: 0.05,
        loop: [
          { x: 2.0, y: 6.4, floor: 0 },
          { x: 5.2, y: 7.6, floor: 0, dwell: 0.6 },
          { x: 4.8, y: 5.2, floor: 0 },
          { x: 1.6, y: 5.4, floor: 0, dwell: 0.4 },
        ],
      }),
      person({
        id: "cole",
        name: "COLE",
        rest: 71,
        speed: 0.35,
        phase: 0.5,
        loop: [
          { x: 9.4, y: 6.8, floor: 0, dwell: 2 },
          { x: 10.4, y: 5.6, floor: 0, dwell: 1.5 },
          { x: 8.6, y: 5.4, floor: 0 },
        ],
      }),
      person({
        id: "nash",
        name: "NASH",
        rest: 69,
        speed: 1.35,
        phase: 0.25,
        loop: [
          { x: 5.0, y: 2.0, floor: 0 },
          { x: 9.6, y: 1.4, floor: 0, dwell: 0.5 },
          { x: 8.2, y: 3.2, floor: 0 },
          { x: 4.8, y: 3.0, floor: 0 },
        ],
      }),
      person({
        id: "okonkwo",
        name: "OKONKWO",
        rest: 63,
        speed: 0.8,
        phase: 0.4,
        loop: [
          { x: 2.2, y: 6.6, floor: 1 },
          { x: 4.6, y: 7.2, floor: 1, dwell: 1 },
          { x: 3.4, y: 5.2, floor: 1 },
        ],
      }),
      person({
        id: "vargas",
        name: "VARGAS",
        rest: 58,
        speed: 0.12,
        phase: 0.7,
        loop: [
          { x: 3.2, y: 4.6, floor: 2, dwell: 6 },
          { x: 4.4, y: 5.8, floor: 2, dwell: 3 },
        ],
      }),
      person({
        id: "berg",
        name: "BERG",
        rest: 74,
        speed: 0.9,
        phase: 0.12,
        loop: [
          { x: 1.4, y: 2.0, floor: 0, dwell: 0.3 },
          { x: 1.4, y: 2.0, floor: 1 },
          { x: 2.4, y: 6.4, floor: 1, dwell: 1 },
          { x: 1.4, y: 2.0, floor: 1 },
          { x: 1.4, y: 2.0, floor: 2 },
          { x: 4.0, y: 3.2, floor: 2, dwell: 1.5 },
          { x: 1.4, y: 2.0, floor: 2 },
          { x: 1.4, y: 2.0, floor: 1 },
          { x: 1.4, y: 2.0, floor: 0 },
        ],
      }),
    ],
  },
  {
    id: "office",
    name: "MERIDIAN OFFICE",
    blurb: "Five storeys. Two people pace almost directly above and below the desk.",
    floorH: 3.6,
    range: 25,
    bounds: { minX: 0.2, maxX: 22.6, minY: 0.2, maxY: 12.6 },
    op: { x: 4.2, y: 3.2, floor: 2, heading: 90 },
    floors: [
      officeFloor(0, "B1", "BASEMENT"),
      officeFloor(1, "G", "GROUND"),
      officeFloor(2, "L1", "LEVEL 1"),
      officeFloor(3, "L2", "LEVEL 2"),
      officeFloor(4, "L3", "LEVEL 3"),
    ],
    contacts: [
      person({
        id: "hoyle",
        name: "HOYLE",
        rest: 64,
        speed: 0.55,
        phase: 0.1,
        loop: [
          { x: 4.8, y: 3.6, floor: 3 },
          { x: 5.6, y: 2.6, floor: 3 },
          { x: 3.8, y: 2.4, floor: 3 },
          { x: 3.6, y: 3.8, floor: 3, dwell: 0.6 },
        ],
      }),
      person({
        id: "briggs",
        name: "BRIGGS",
        rest: 62,
        speed: 0.4,
        phase: 0.55,
        loop: [
          { x: 3.8, y: 2.8, floor: 1, dwell: 1 },
          { x: 4.8, y: 3.8, floor: 1 },
          { x: 5.2, y: 2.4, floor: 1, dwell: 0.8 },
        ],
      }),
      person({
        id: "cho",
        name: "CHO",
        rest: 78,
        speed: 1.45,
        phase: 0.2,
        loop: [
          { x: 1.4, y: 7.2, floor: 2 },
          { x: 7.2, y: 7.2, floor: 2 },
          { x: 16.0, y: 7.2, floor: 2 },
          { x: 20.4, y: 7.2, floor: 2, dwell: 0.4 },
          { x: 16.0, y: 7.2, floor: 2 },
          { x: 7.2, y: 7.2, floor: 2 },
        ],
      }),
      person({
        id: "ellis",
        name: "ELLIS",
        rest: 60,
        speed: 0.1,
        phase: 0,
        loop: [
          { x: 17.2, y: 3.2, floor: 2, dwell: 8 },
          { x: 18.4, y: 4.4, floor: 2, dwell: 3 },
        ],
      }),
      person({
        id: "farouk",
        name: "FAROUK",
        rest: 67,
        speed: 0.2,
        phase: 0.3,
        loop: [
          { x: 3.2, y: 2.4, floor: 0, dwell: 6 },
          { x: 4.6, y: 3.4, floor: 0, dwell: 2 },
        ],
      }),
      person({
        id: "singh",
        name: "SINGH",
        rest: 73,
        speed: 1.1,
        phase: 0.48,
        loop: [
          { x: 16.4, y: 10.2, floor: 0 },
          { x: 18.8, y: 9.4, floor: 0 },
          { x: 20.2, y: 4.2, floor: 0, dwell: 0.5 },
          { x: 16.6, y: 3.2, floor: 0 },
        ],
      }),
      person({
        id: "park",
        name: "PARK",
        rest: 59,
        speed: 0.15,
        phase: 0.8,
        loop: [
          { x: 11.2, y: 10.0, floor: 4, dwell: 7 },
          { x: 12.4, y: 9.2, floor: 4, dwell: 2 },
        ],
      }),
      person({
        id: "adebayo",
        name: "ADEBAYO",
        rest: 80,
        speed: 0.95,
        phase: 0.05,
        loop: [
          { x: 9.8, y: 7.2, floor: 2, dwell: 0.2 },
          { x: 9.8, y: 7.2, floor: 3 },
          { x: 12.2, y: 3.4, floor: 3, dwell: 1 },
          { x: 9.8, y: 7.2, floor: 3 },
          { x: 9.8, y: 7.2, floor: 2 },
          { x: 6.2, y: 10.2, floor: 2, dwell: 0.8 },
          { x: 9.8, y: 7.2, floor: 2 },
        ],
      }),
    ],
  },
  {
    id: "yard",
    name: "DOCK WAREHOUSE",
    blurb: "Floor plate plus a mezzanine. One jogger, so the speed math has something to chew on.",
    floorH: 4.5,
    range: 30,
    bounds: { minX: 0.2, maxX: 32.4, minY: 0.2, maxY: 16.4 },
    op: { x: 4.2, y: 8.2, floor: 0, heading: 90 },
    floors: [
      { id: 0, name: "F", label: "FLOOR", walls: yardWalls, rooms: yardRooms },
      { id: 1, name: "M", label: "MEZZANINE", walls: mezzWalls, rooms: mezzRooms },
    ],
    contacts: [
      person({
        id: "juno",
        name: "JUNO",
        rest: 86,
        speed: 3.2,
        phase: 0.15,
        loop: [
          { x: 20.2, y: 1.4, floor: 0 },
          { x: 20.2, y: 14.8, floor: 0 },
        ],
      }),
      person({
        id: "pike",
        name: "PIKE",
        rest: 70,
        speed: 1.3,
        phase: 0.4,
        loop: [
          { x: 28.2, y: 2.0, floor: 0 },
          { x: 28.2, y: 14.4, floor: 0, dwell: 0.4 },
          { x: 26.4, y: 8.0, floor: 0 },
        ],
      }),
      person({
        id: "otto",
        name: "OTTO",
        rest: 63,
        speed: 0.1,
        phase: 0,
        loop: [
          { x: 2.4, y: 14.2, floor: 0, dwell: 8 },
          { x: 3.6, y: 13.2, floor: 0, dwell: 2 },
        ],
      }),
      person({
        id: "reyes",
        name: "REYES",
        rest: 61,
        speed: 0.45,
        phase: 0.3,
        loop: [
          { x: 4.4, y: 12.6, floor: 1 },
          { x: 8.6, y: 13.4, floor: 1, dwell: 1.2 },
          { x: 6.2, y: 11.2, floor: 1 },
        ],
      }),
      person({
        id: "sol",
        name: "SOL",
        rest: 75,
        speed: 0.8,
        phase: 0.5,
        loop: [
          { x: 10.2, y: 8.0, floor: 0, dwell: 0.3 },
          { x: 10.2, y: 8.0, floor: 1 },
          { x: 6.4, y: 4.2, floor: 1, dwell: 1.5 },
          { x: 10.2, y: 8.0, floor: 1 },
          { x: 10.2, y: 8.0, floor: 0 },
          { x: 6.0, y: 8.0, floor: 0, dwell: 0.6 },
        ],
      }),
    ],
  },
];

export function getScenario(id) {
  return SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
}
