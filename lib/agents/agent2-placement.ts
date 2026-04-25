import { FloorPlan, SceneObject, UseCaseCategory } from "../../types/scene";

import { buildFallbackPlacement } from "./fallback";
import { ensureAssistant } from "../backboard-agents";
import { isBackboardServiceError, runOnAssistant } from "../backboard-client";
import { callGemini, isGeminiServiceError } from "../gemini";
import { normalizeAgent2Output, parseGeminiJsonResponse } from "../scene-validation";

function buildAgent2Prompt(floorplan: FloorPlan, useCase: string): string {
  return `You will plan the configuration of a space and return strict JSON.

You receive:
1. A floor plan geometry (extracted from an image)
2. A use case description from the user

Return a single raw JSON object - no markdown, no commentary, no code fences.

FLOOR PLAN GEOMETRY:
${JSON.stringify(floorplan, null, 2)}

USER USE CASE:
"${useCase}"

PLACEMENT RULES:
- All x and y coordinates must be within the floor plan bounds (0 to ${floorplan.width} for x, 0 to ${floorplan.depth} for y)
- Objects must not overlap each other. Maintain at least 1 meter clearance between objects.
- Leave 1.5 meter clearance from all walls for walkways.
- Place stages and presentation areas against walls, not in the center.
- Place seating facing toward stages or screens.
- For hackathons: hacking stations along walls, booths in center, stage at one end.
- For events: round tables distributed across main area, stage at front, bar against a wall.
- For offices: desks in rows or clusters, meeting rooms separated, lounge near entrance.
- For factories: workstations in sequence along production flow, storage at back.
- Staircases: if the floor plan geometry includes staircases (floorplan.staircases array), place a "staircase" object at each detected position using the x, y, width, depth, and rotation values directly from floorplan.staircases. Do not move detected staircases. If floorplan.staircases is empty, do not invent staircase objects. The roomId for each staircase must be the id of the nearest room from floorplan.rooms — NEVER use "global" or any id not present in floorplan.rooms.

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

Place enough objects to make the space look fully configured. For a large hall aim for 15-40 objects. For a small room aim for 5-15 objects.`;
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

async function runAgent2ViaGeminiDirect(prompt: string, floorplan: FloorPlan): Promise<Agent2Result> {
  const rawResponse = await callGemini(prompt, undefined, {
    responseMimeType: "application/json",
    maxOutputTokens: 8192,
  });
  return normalizeAgent2Output(parseGeminiJsonResponse(rawResponse), floorplan);
}

export async function runAgent2(
  floorplan: FloorPlan,
  useCase: string,
): Promise<Agent2Result> {
  const prompt = buildAgent2Prompt(floorplan, useCase);

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
