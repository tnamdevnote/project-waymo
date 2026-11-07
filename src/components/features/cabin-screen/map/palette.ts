// Cabin map colors (the "Chase" look, docs/decisions/cabin-map.md).
// three.js can't read CSS variables, so these are hex copies. `ahead` and `behind` are the
// exact brand swatches behind --waymo-green and --waymo-blue in src/app/tokens.css: keep them in sync.
export const palette = {
  /** Clear color and fog. */
  bg: "#d4d4db",
  /** Fog start and end, meters from the camera. */
  fog: [70, 230] as [number, number],
  road: "#7a7884",
  sidewalk: "#ebeaee",
  building: "#dddce3",
  marking: "#f3f3f6",
  traffic: "#9fcbef",
  trafficOpacity: 0.85,
  vehicle: "#f6f6f8",
  vehicleGlass: "#2b2e3b",
  vehicleSensor: "#3a3d4a",
  tire: "#16161c",
  brakeOff: "#8a1f2b",
  brakeOn: "#ff3b4e",
  /** Route still to drive: --waymo-green. */
  ahead: "#00E89E",
  /** Route already driven: --waymo-blue. */
  behind: "#0077FE",
  hemi: ["#ffffff", "#8c8a96", 1.9] as [string, string, number],
  sun: 1.3,
} as const;
