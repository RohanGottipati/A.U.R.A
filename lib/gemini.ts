import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { getEnv } from './env';

let genai: GoogleGenerativeAI | null = null;

function getModel() {
  if (!genai) {
    genai = new GoogleGenerativeAI(getEnv().GEMINI_API_KEY);
  }

  return genai.getGenerativeModel({ model: 'gemini-2.0-flash' });
}

export async function callGemini(prompt: string, imageParts?: Part[]): Promise<string> {
  const parts: Part[] = [{ text: prompt }];
  if (imageParts) parts.unshift(...imageParts);

  const result = await getModel().generateContent({ contents: [{ role: 'user', parts }] });
  const text = result.response.text();

  if (!text) throw new Error('Gemini returned empty response');
  return text;
}

export function imageBufferToPart(buffer: Buffer, mimeType: string): Part {
  return {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType,
    }
  };
}

export async function imageUrlToPart(url: string): Promise<Part> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image: ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get('content-type') ?? 'image/jpeg';
  return imageBufferToPart(buffer, mimeType);
}
