import { createAssistant } from "../lib/backboard-client";
import { listAgentDefinitions } from "../lib/backboard-agents";
import { getEnv } from "../lib/env";

const ENV_KEYS = {
  agent1: "BACKBOARD_AGENT1_ASSISTANT_ID",
  agent2: "BACKBOARD_AGENT2_ASSISTANT_ID",
  agent3: "BACKBOARD_AGENT3_ASSISTANT_ID",
} as const;

async function setup() {
  // Force env load and validate the API key is present.
  getEnv();

  const definitions = listAgentDefinitions();
  const created: Record<string, string> = {};

  for (const def of definitions) {
    process.stdout.write(`Creating Backboard assistant for ${def.slot}... `);
    const assistant = await createAssistant({
      name: def.name,
      systemPrompt: def.systemPrompt,
    });
    process.stdout.write(`${assistant.assistant_id}\n`);
    created[ENV_KEYS[def.slot]] = assistant.assistant_id;
  }

  console.log("\nAdd the following lines to your .env.local to reuse these assistants:");
  for (const [key, value] of Object.entries(created)) {
    console.log(`${key}=${value}`);
  }
  console.log("\nDone.");
}

setup().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
