export const VENUE_BOUNDS = { x: 28, z: 22 };

export const STRUCTURES = [
  { id: "main-stage", type: "stage", label: "MAIN STAGE", x: 0, z: -16, w: 18, d: 5, h: 3.4, color: "#0a0a12", accent: "#00f0ff" },
  { id: "main-stage-truss", type: "truss", parent: "main-stage", x: 0, z: -16, w: 20, d: 6, h: 6.5, color: "#15151f", accent: "#00f0ff" },
  { id: "side-stage", type: "stage", label: "SIDE STAGE", x: 17, z: 8, w: 9, d: 4, h: 2.2, color: "#0a0a12", accent: "#00f0ff" },
  { id: "vip", type: "platform", label: "VIP DECK", x: -19, z: -10, w: 9, d: 6, h: 1.4, color: "#0d0d18", accent: "#ffb020" },
  { id: "food-1", type: "booth", x: -19, z: 4, w: 2.6, d: 2.6, h: 1.6, color: "#13131e", accent: "#ffb020" },
  { id: "food-2", type: "booth", x: -15, z: 4, w: 2.6, d: 2.6, h: 1.6, color: "#13131e", accent: "#ffb020" },
  { id: "food-3", type: "booth", x: -19, z: 8, w: 2.6, d: 2.6, h: 1.6, color: "#13131e", accent: "#ffb020" },
  { id: "food-4", type: "booth", x: -15, z: 8, w: 2.6, d: 2.6, h: 1.6, color: "#13131e", accent: "#ffb020" },
  { id: "vendor-1", type: "booth", x: 9, z: 16, w: 2.6, d: 2.6, h: 1.4, color: "#13131e", accent: "#00f0ff" },
  { id: "vendor-2", type: "booth", x: 13, z: 16, w: 2.6, d: 2.6, h: 1.4, color: "#13131e", accent: "#00f0ff" },
  { id: "vendor-3", type: "booth", x: 17, z: 16, w: 2.6, d: 2.6, h: 1.4, color: "#13131e", accent: "#00f0ff" },
  { id: "vendor-4", type: "booth", x: 21, z: 16, w: 2.6, d: 2.6, h: 1.4, color: "#13131e", accent: "#00f0ff" },
  { id: "bar-1", type: "booth", x: -8, z: 16, w: 5, d: 2.4, h: 1.6, color: "#13131e", accent: "#ffb020" },
  { id: "bar-2", type: "booth", x: 0, z: 16, w: 5, d: 2.4, h: 1.6, color: "#13131e", accent: "#ffb020" },
] as const;

export const LABELS = [
  { id: "main-stage", text: "MAIN STAGE", x: 0, z: -19, color: "#00f0ff" },
  { id: "side-stage", text: "SIDE STAGE", x: 17, z: 5.4, color: "#00f0ff" },
  { id: "vip", text: "VIP", x: -19, z: -13.4, color: "#ffb020" },
  { id: "food", text: "FOOD COURT", x: -17, z: 11.6, color: "#ffb020" },
  { id: "vendors", text: "VENDORS", x: 15, z: 19.4, color: "#00f0ff" },
  { id: "entry-a", text: "GATE A", x: -7, z: 21, color: "#ffffff" },
  { id: "entry-b", text: "GATE B", x: 7, z: 21, color: "#ffffff" },
] as const;

export const ATTRACTORS = [
  { x: 0, z: -13, weight: 1.6, name: "main" },
  { x: 17, z: 6, weight: 0.9, name: "side" },
  { x: -17, z: 6, weight: 0.6, name: "food" },
  { x: 15, z: 14, weight: 0.5, name: "vendors" },
  { x: -19, z: -10, weight: 0.4, name: "vip" },
] as const;

export const GATES = [
  { x: -7, z: 22, name: "GATE A" },
  { x: 7, z: 22, name: "GATE B" },
] as const;

export const HOTSPOTS = [
  { x: -7, z: 18, radius: 3, label: "GATE A" },
  { x: 7, z: 18, radius: 3, label: "GATE B" },
  { x: 0, z: -12, radius: 4.5, label: "FRONT OF MAIN" },
  { x: -17, z: 6, radius: 2.5, label: "FOOD QUEUE" },
] as const;
