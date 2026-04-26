import { GoogleGenerativeAI, Part } from "@google/generative-ai";

import { getEnv } from "./env";

let defaultGenai: GoogleGenerativeAI | null = null;

function resolveModelName(): string {
  // gemini-2.5-flash is the current production-ready vision-capable model on the
  // free tier. The implementation.MD spec mentions gemini-2.0-flash but Google
  // has retired that endpoint for new free-tier projects (returns 0 quota).
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
}

function getModel(apiKeyOverride?: string) {
  if (apiKeyOverride && apiKeyOverride.trim()) {
    // User-supplied keys must NOT be cached: different requests can carry
    // different keys, so we build a fresh client per call.
    const client = new GoogleGenerativeAI(apiKeyOverride.trim());
    return client.getGenerativeModel({ model: resolveModelName() });
  }

  if (!defaultGenai) {
    defaultGenai = new GoogleGenerativeAI(getEnv().GEMINI_API_KEY);
  }
  return defaultGenai.getGenerativeModel({ model: resolveModelName() });
}

export async function fetchImageData(url: string): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${url}`);
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type") ?? "image/jpeg",
  };
}

export function isGeminiServiceError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /GoogleGenerativeAI|generativelanguage\.googleapis\.com|fetch failed|quota|429|api key/i.test(message);
}

export function isGeminiQuotaError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /quota|429|Too Many Requests/i.test(message);
}

export async function callGemini(
  prompt: string,
  imageParts?: Part[],
  options?: {
    responseMimeType?: "application/json" | "text/plain";
    maxOutputTokens?: number;
    // Allow caller-overridable sampling. Default is fully deterministic so
    // re-uploading the same image produces the same floor plan instead of a
    // fresh roll of the dice each time.
    temperature?: number;
    topK?: number;
    topP?: number;
    // Optional per-request API key. When supplied, used in place of the
    // server-side GEMINI_API_KEY env var (allows BYOK from the UI).
    apiKey?: string;
  },
): Promise<string> {
  const parts: Part[] = [{ text: prompt }];
  if (imageParts) parts.unshift(...imageParts);

  const result = await getModel(options?.apiKey).generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: {
      // Deterministic defaults: same input -> same output across runs.
      // Gemini's default temperature for 2.5-flash is ~1.0 which produced
      // highly variable extractions for identical floor-plan images.
      temperature: options?.temperature ?? 0,
      topK: options?.topK ?? 1,
      topP: options?.topP ?? 0,
      ...(options?.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
      ...(options?.maxOutputTokens ? { maxOutputTokens: options.maxOutputTokens } : {}),
    },
  });
  const text = result.response.text();

  if (!text) throw new Error("Gemini returned empty response");
  return text;
}

export function imageBufferToPart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    },
  };
}

export async function imageUrlToPart(url: string): Promise<Part> {
  const { buffer, mimeType } = await fetchImageData(url);
  return imageBufferToPart(buffer, mimeType);
}
