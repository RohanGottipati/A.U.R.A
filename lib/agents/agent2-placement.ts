import { callGemini } from '../gemini';
import { FloorPlan, SceneObject, UseCaseCategory } from '../../types/scene';

function buildAgent2Prompt(floorplan: FloorPlan, useCase: string): string {
  return `
You are an expert spatial planner who arranges spaces for real-world events and operations.

You will receive:
1. A floor plan geometry (extracted from an image)
2. A use case description from the user

Your task is to decide what objects to place in the space and exactly where, then return structured JSON.

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

AVAILABLE OBJECT TYPES AND DEFAULT SIZES:
- table: 2.0m wide, 1.0m deep, 0.75m tall (for dining/work)
- chair: 0.5m wide, 0.5m deep, 0.9m tall
- stage: 8.0m wide, 4.0m deep, 0.5m tall (raised platform)
- booth: 2.0m wide, 2.0m deep, 2.0m tall (sponsor/exhibition)
- desk: 1.5m wide, 0.8m deep, 0.75m tall (office desk)
- podium: 0.6m wide, 0.6m deep, 1.1m tall (speaker podium)
- screen: 3.0m wide, 0.1m deep, 2.0m tall (display screen)
- workstation: 2.0m wide, 1.5m deep, 1.0m tall (industrial)
- shelf: 1.0m wide, 0.4m deep, 2.0m tall (storage)
- counter: 2.0m wide, 0.8m deep, 0.9m tall (bar/reception)
- equipment: 1.5m wide, 1.5m deep, 1.2m tall (generic machinery)
- divider: 3.0m wide, 0.1m deep, 1.8m tall (partition panel)

CATEGORIZE the use case as one of: event, hackathon, office, factory, classroom, retail, other

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

CRITICAL: Return ONLY a valid JSON object. No markdown, no explanation, no code fences. Just the raw JSON.
`;
}

export async function runAgent2(
  floorplan: FloorPlan,
  useCase: string
): Promise<{ objects: SceneObject[]; useCaseCategory: UseCaseCategory; placementNotes: string }> {
  const prompt = buildAgent2Prompt(floorplan, useCase);
  const rawResponse = await callGemini(prompt);

  const cleaned = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: { objects: SceneObject[]; useCaseCategory: UseCaseCategory; placementNotes: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Agent 2 returned invalid JSON: ${cleaned.substring(0, 500)}`);
  }

  if (!parsed.objects || parsed.objects.length === 0) {
    throw new Error('Agent 2 placed no objects in the scene');
  }

  parsed.objects = parsed.objects.map((obj, i) => ({
    ...obj,
    id: obj.id ?? `obj_${i + 1}`,
  }));

  return parsed;
}
