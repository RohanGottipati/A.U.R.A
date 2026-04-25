import { getEnv } from "./env";

const BACKBOARD_BASE_URL = "https://app.backboard.io/api";

export interface BackboardAssistant {
  assistant_id: string;
  name: string;
  system_prompt?: string | null;
}

export interface BackboardThread {
  thread_id: string;
  assistant_id: string;
}

export interface BackboardMessageResponse {
  message: string;
  thread_id: string;
  content?: string | null;
  message_id?: string | null;
  status?: string | null;
}

export interface SendMessageOptions {
  content: string;
  llmProvider?: string;
  modelName?: string;
  jsonOutput?: boolean;
  memory?: "Auto" | "Readonly" | "off";
  attachment?: {
    filename: string;
    buffer: Buffer;
    contentType: string;
  };
}

export class BackboardError extends Error {
  status: number;
  body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = "BackboardError";
    this.status = status;
    this.body = body;
  }
}

function getApiKey(): string {
  return getEnv().BACKBOARD_API_KEY;
}

async function backboardFetch(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set("X-API-Key", getApiKey());

  const response = await fetch(`${BACKBOARD_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new BackboardError(
      `Backboard request failed: ${response.status} ${response.statusText} - ${body.substring(0, 500)}`,
      response.status,
      body,
    );
  }

  return response;
}

export async function createAssistant(input: {
  name: string;
  systemPrompt: string;
}): Promise<BackboardAssistant> {
  const response = await backboardFetch("/assistants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: input.name,
      system_prompt: input.systemPrompt,
    }),
  });

  return (await response.json()) as BackboardAssistant;
}

export async function createThread(assistantId: string): Promise<BackboardThread> {
  const response = await backboardFetch(`/assistants/${assistantId}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  return (await response.json()) as BackboardThread;
}

export async function sendMessage(
  threadId: string,
  options: SendMessageOptions,
): Promise<BackboardMessageResponse> {
  const env = getEnv();
  const llmProvider = options.llmProvider ?? env.BACKBOARD_LLM_PROVIDER;
  const modelName = options.modelName ?? env.BACKBOARD_MODEL_NAME;

  let response: Response;

  if (options.attachment) {
    const formData = new FormData();
    formData.set("content", options.content);
    formData.set("llm_provider", llmProvider);
    formData.set("model_name", modelName);
    formData.set("stream", "false");
    formData.set("memory", options.memory ?? "off");
    if (options.jsonOutput) {
      formData.set("json_output", "true");
    }
    const blob = new Blob([new Uint8Array(options.attachment.buffer)], {
      type: options.attachment.contentType,
    });
    formData.append("files", blob, options.attachment.filename);

    response = await backboardFetch(`/threads/${threadId}/messages`, {
      method: "POST",
      body: formData,
    });
  } else {
    response = await backboardFetch(`/threads/${threadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: options.content,
        llm_provider: llmProvider,
        model_name: modelName,
        stream: false,
        memory: options.memory ?? "off",
        json_output: Boolean(options.jsonOutput),
      }),
    });
  }

  return (await response.json()) as BackboardMessageResponse;
}

export async function runOnAssistant(input: {
  assistantId: string;
  message: SendMessageOptions;
}): Promise<string> {
  const thread = await createThread(input.assistantId);
  const result = await sendMessage(thread.thread_id, input.message);
  const text = result.content ?? "";
  if (!text) {
    throw new BackboardError("Backboard returned empty content", 200, JSON.stringify(result));
  }
  return text;
}

export function isBackboardServiceError(error: unknown): boolean {
  if (error instanceof BackboardError) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /Backboard|backboard\.io|app\.backboard\.io/i.test(message);
}
