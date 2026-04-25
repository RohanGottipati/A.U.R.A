import { callGemini, imageUrlToPart } from '../gemini';
import { FloorPlan } from '../../types/scene';

const AGENT1_PROMPT = `
You are a floor plan analysis expert. You will receive an image of a floor plan.

Your task is to extract the physical geometry of the space and return it as structured JSON.

INSTRUCTIONS:
1. Identify all rooms, their approximate sizes, and their positions relative to each other.
2. Identify all walls as line segments connecting two points.
3. Estimate the real-world dimensions. If a scale is shown, use it. If not, estimate based on typical room sizes (a standard office room is about 4m x 4m, a large hall is 20m+ wide).
4. Assign a coordinate system where the top-left corner of the floor plan is (0, 0), x increases to the right, and y increases downward.
5. All measurements should be in METERS.
6. Classify each room using one of these types: main_hall, corridor, bathroom, storage, kitchen, office, entrance, unknown.

Return this exact structure:
{
  "width": <total width in meters as number>,
  "depth": <total depth in meters as number>,
  "rooms": [
    {
      "id": "room_1",
      "name": "<descriptive name>",
      "x": <top-left x in meters>,
      "y": <top-left y in meters>,
      "width": <room width in meters>,
      "height": <room depth in meters>,
      "type": "<room type>"
    }
  ],
  "walls": [
    { "x1": <meters>, "y1": <meters>, "x2": <meters>, "y2": <meters>, "height": 3.0 }
  ],
  "scale": <your estimated pixels-per-meter ratio, or 10 if unknown>,
  "confidence": <0.0 to 1.0 how confident you are in the extraction>,
  "notes": "<any important observations about the floor plan>"
}

CRITICAL: Return ONLY a valid JSON object. No markdown, no explanation, no code fences. Just the raw JSON.
`;

export async function runAgent1(floorplanImageUrl: string): Promise<FloorPlan> {
  const imagePart = await imageUrlToPart(floorplanImageUrl);
  const rawResponse = await callGemini(AGENT1_PROMPT, [imagePart]);

  const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: FloorPlan;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Agent 1 returned invalid JSON: ${cleaned.substring(0, 500)}`);
  }

  if (!parsed.rooms || parsed.rooms.length === 0) {
    throw new Error('Agent 1 detected no rooms in the floor plan');
  }
  if (!parsed.walls || parsed.walls.length === 0) {
    parsed.walls = [
      { x1: 0, y1: 0, x2: parsed.width, y2: 0, height: 3.0 },
      { x1: parsed.width, y1: 0, x2: parsed.width, y2: parsed.depth, height: 3.0 },
      { x1: parsed.width, y1: parsed.depth, x2: 0, y2: parsed.depth, height: 3.0 },
      { x1: 0, y1: parsed.depth, x2: 0, y2: 0, height: 3.0 },
    ];
  }

  return parsed;
}
