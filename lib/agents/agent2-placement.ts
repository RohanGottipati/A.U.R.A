import { FloorPlan, SceneObject, UseCaseCategory } from "../../types/scene";

import { buildFallbackPlacement } from "./fallback";
import { ensureAssistant } from "../backboard-agents";
import { isBackboardServiceError, runOnAssistant } from "../backboard-client";
import { callGemini, isGeminiServiceError } from "../gemini";
import { normalizeAgent2Output, parseGeminiJsonResponse } from "../scene-validation";

function buildAgent2Prompt(floorplan: FloorPlan, useCase: string): string {
  // Compact room summary so Gemini can reason about per-room bounds without
  // re-deriving them from the polygon arrays.
  const roomSummary = floorplan.rooms
    .map((r) => {
      const cx = (r.x + r.width / 2).toFixed(2);
      const cy = (r.y + r.height / 2).toFixed(2);
      const area = (r.width * r.height).toFixed(1);
      return `  - ${r.id} (${r.type}, "${r.name}"): bbox x=${r.x.toFixed(2)}..${(r.x + r.width).toFixed(2)} y=${r.y.toFixed(2)}..${(r.y + r.height).toFixed(2)} | center=(${cx},${cy}) | area=${area}m²`;
    })
    .join("\n");

  return `You will plan the configuration of a space and return strict JSON.

You receive:
1. A floor plan geometry (extracted from an image)
2. A use case description from the user

Return a single raw JSON object - no markdown, no commentary, no code fences.

FLOOR PLAN GEOMETRY:
${JSON.stringify(floorplan, null, 2)}

ROOM QUICK REFERENCE (use these EXACT room IDs in roomId fields):
${roomSummary}

USER USE CASE:
"${useCase}"

HARD CONSTRAINTS (the system will deterministically enforce these — do not violate them):
- Every object's center (x, y) MUST lie inside the bounding box of its assigned room. Use the ROOM QUICK REFERENCE above.
- roomId MUST be one of the room IDs listed above. Never use "global" or invented IDs.
- Coordinates use METERS. x in [0, ${floorplan.width.toFixed(2)}], y in [0, ${floorplan.depth.toFixed(2)}].
- Objects must not overlap each other (>=0.6m clearance edge-to-edge between non-anchored items).
- Wall-anchored types (counter, kitchen_unit, shelf, bed, bathtub, sink, toilet, screen, divider, staircase, door, workstation) MUST be placed within 0.5m of a room wall — set the center on the wall line offset inward by half its depth. Their rotation must orient the front of the object toward the room interior (back against the wall).
- Free-standing types (table, chair, podium, plant, entrance_marker, booth, stage, equipment) need >=0.4m clearance from walls.
- Seating (chair) MUST face toward the nearest table, desk, stage, or screen — set rotation accordingly (rotation 0° = facing +y, 90° = facing +x, 180° = facing -y, 270° = facing -x).
- Pair tables with chairs (4-6 chairs per dining/round table; 1-2 chairs per desk) and place them in a tight grouping (chairs within 0.7m of their table).
- Doors must be placed AT a wall opening between two adjacent rooms; their rotation must align with the wall they sit on.

USE-CASE PATTERNS (apply only the relevant one):
- hackathons: hacking desks in clusters of 4 along walls, sponsor booths in central rows, stage at one end of the main hall.
- events: round tables (table+6 chairs) distributed evenly across main hall, stage at front-center against a wall, counter/bar against side wall.
- offices: desks in rows or pods of 4-6, screens on the main wall of meeting-room types, plants and lounge chairs near entrance.
- factories: workstations sequenced along one axis (production flow), shelves along the back wall, equipment near power-side wall.
- classrooms: rows of desks facing one screen on the front wall, podium next to the screen.
- retail: shelves along walls, counter near entrance, plants for ambience.

STAIRCASES: if floorplan.staircases is non-empty, emit one "staircase" object per entry copying x, y, width, depth, rotation directly. roomId must be the nearest room. If floorplan.staircases is empty, do NOT invent staircase objects.

AVAILABLE OBJECT TYPES (you MUST use ONLY these exact strings for the "type" field — no others):
- table: 2.0m wide, 1.0m deep, 0.75m tall  (use for any table-like surface incl. round/conference/dining)
- chair: 0.5m wide, 0.5m deep, 0.9m tall   (use for any seating incl. sofas, couches, benches, stools, armchairs)
- stage: 8.0m wide, 4.0m deep, 0.5m tall   (raised platform / dais / riser)
- booth: 2.0m wide, 2.0m deep, 2.0m tall   (vendor / kiosk / trade-show booth)
- desk: 1.5m wide, 0.8m deep, 0.75m tall   (office desk / cubicle)
- podium: 0.6m wide, 0.6m deep, 1.1m tall  (lectern / pulpit)
- screen: 3.0m wide, 0.1m deep, 2.0m tall  (TV / monitor / whiteboard / projector wall)
- workstation: 2.0m wide, 1.5m deep, 1.0m tall  (workbench / assembly / production machine)
- shelf: 1.0m wide, 0.4m deep, 2.0m tall   (bookcase / cabinet / storage rack / locker)
- counter: 2.0m wide, 0.8m deep, 0.9m tall (bar / reception / checkout)
- equipment: 1.5m wide, 1.5m deep, 1.2m tall (printer, copier, server, fridge, generator, HVAC, speaker — anything industrial/utility)
- divider: 3.0m wide, 0.1m deep, 1.8m tall (partition / cubicle wall / curtain)
- plant: 0.6m wide, 0.6m deep, 1.5m tall   (potted plant, tree, greenery)
- entrance_marker: 0.6m wide, 0.6m deep, 1.4m tall (small "entry" arrow signpost)
- toilet: 0.5m wide, 0.7m deep, 0.85m tall (toilet / urinal / WC fixture — bathroom only)
- sink: 0.7m wide, 0.5m deep, 0.9m tall    (wash basin / vanity — bathroom or kitchen)
- door: 0.9m wide, 0.1m deep, 2.1m tall    (hinged interior/exterior door — place AT a wall opening between rooms)
- staircase: 1.2m wide, 3.0m deep, 1.5m tall (multi-step stair flight, set against a wall)
- bed: 1.6m wide, 2.0m deep, 0.6m tall     (bed / mattress for bedrooms)
- kitchen_unit: 2.4m wide, 0.65m deep, 0.9m tall (kitchen base cabinet w/ stove + sink, against a wall)
- bathtub: 1.7m wide, 0.75m deep, 0.55m tall (bathtub / shower stall, against a wall in bathroom)

DO NOT invent new types. Map any concept you have in mind to one of the types above. Examples:
sofa/couch -> chair, TV/monitor -> screen, bookshelf/cabinet -> shelf, bar -> counter, partition -> divider, tree -> plant, hinged door -> door, signpost arrow -> entrance_marker, urinal -> toilet, vanity -> sink, stairs/stairway -> staircase, mattress -> bed, oven/stove -> kitchen_unit, shower -> bathtub, printer/server -> equipment.

ROOM-AWARE PLACEMENT GUIDANCE:
- bathroom rooms MUST contain at least one toilet and one sink, and a bathtub if depth allows. Place fixtures against walls.
- kitchen rooms should have a kitchen_unit run along one wall and a small dining table+chairs if room permits.
- office rooms should be filled with desks/chairs/screens/shelves; not toilets or beds.
- bedroom-like rooms (use room name to infer) should contain a bed, possibly a desk, and a shelf.
- main_hall / event spaces should be filled with stages / tables / chairs / booths according to the use case.
- For multi-floor floor plans, place a staircase against a wall in the largest open area.
- Place door objects ONLY where there are clear gaps between rooms (along internal walls); their rotation must align with the wall they sit on. Do NOT place doors floating in open space.

CATEGORIZE the use case as exactly one of: event, hackathon, office, factory, classroom, retail, other.

Return this exact structure:
{
  "useCaseCategory": "<category>",
  "objects": [
    {
      "id": "obj_1",
      "type": "<object type>",
      "roomId": "<id of the room this object is in>",
      "x": <center x position in meters>,
      "y": <center y position in meters>,
      "z": 0,
      "width": <width in meters>,
      "depth": <depth in meters>,
      "height": <height in meters>,
      "rotation": <0 to 360 degrees>,
      "label": "<descriptive label shown in 3D>"
    }
  ],
  "placementNotes": "<explain your placement decisions in 2-3 sentences>"
}

Place enough objects to make the space look fully configured. For a large hall aim for 15-40 objects. For a small room aim for 5-15 objects.

QUALITY CHECK before returning:
1. Every object's roomId is in the ROOM QUICK REFERENCE list above.
2. Every (x, y) is inside that room's bbox.
3. No two non-anchored objects share the same (x, y) within 0.6m.
4. Wall-anchored items are within 0.5m of a wall.
5. Each table has chairs grouped around it.`;
}

type Agent2Result = {
  objects: SceneObject[];
  useCaseCategory: UseCaseCategory;
  placementNotes: string;
};

async function runAgent2ViaBackboard(prompt: string, floorplan: FloorPlan): Promise<Agent2Result> {
  const assistantId = await ensureAssistant("agent2");
  const rawResponse = await runOnAssistant({
    assistantId,
    message: {
      content: prompt,
      jsonOutput: true,
    },
  });

  return normalizeAgent2Output(parseGeminiJsonResponse(rawResponse), floorplan);
}

async function runAgent2ViaGeminiDirect(
  prompt: string,
  floorplan: FloorPlan,
  apiKey?: string,
): Promise<Agent2Result> {
  const rawResponse = await callGemini(prompt, undefined, {
    responseMimeType: "application/json",
    maxOutputTokens: 8192,
    apiKey,
  });
  return normalizeAgent2Output(parseGeminiJsonResponse(rawResponse), floorplan);
}

export async function runAgent2(
  floorplan: FloorPlan,
  useCase: string,
  apiKey?: string,
): Promise<Agent2Result> {
  const prompt = buildAgent2Prompt(floorplan, useCase);

  // When the caller supplies their own Gemini key we skip Backboard (which uses
  // the server's API key) and go straight to direct Gemini so the user's
  // quota/credentials are actually exercised end-to-end.
  if (apiKey && apiKey.trim()) {
    try {
      return await runAgent2ViaGeminiDirect(prompt, floorplan, apiKey);
    } catch (geminiError) {
      if (isGeminiServiceError(geminiError)) {
        console.warn("BYOK Gemini agent 2 failed, using rule-based fallback:", geminiError);
        return buildFallbackPlacement(floorplan, useCase);
      }
      throw geminiError;
    }
  }

  try {
    return await runAgent2ViaBackboard(prompt, floorplan);
  } catch (backboardError) {
    if (!isBackboardServiceError(backboardError)) {
      throw backboardError;
    }

    console.warn("Backboard agent 2 failed, retrying with direct Gemini:", backboardError);

    try {
      return await runAgent2ViaGeminiDirect(prompt, floorplan);
    } catch (geminiError) {
      if (isGeminiServiceError(geminiError)) {
        console.warn("Gemini agent 2 failed, using rule-based fallback:", geminiError);
        return buildFallbackPlacement(floorplan, useCase);
      }

      throw geminiError;
    }
  }
}
