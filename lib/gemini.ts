import { GoogleGenerativeAI, Part } from "@google/generative-ai";

import { getEnv } from "./env";

let genai: GoogleGenerativeAI | null = null;

function getModel() {
  if (!genai) {
    genai = new GoogleGenerativeAI(getEnv().GEMINI_API_KEY);
  }

  return genai.getGenerativeModel({ model: "gemini-2.0-flash" });
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
  options?: { responseMimeType?: "application/json" | "text/plain" },
): Promise<string> {
  const parts: Part[] = [{ text: prompt }];
  if (imageParts) parts.unshift(...imageParts);

  const result = await getModel().generateContent({
    contents: [{ role: "user", parts }],
    generationConfig: options?.responseMimeType
      ? { responseMimeType: options.responseMimeType }
      : undefined,
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
