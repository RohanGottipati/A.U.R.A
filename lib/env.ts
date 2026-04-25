import fs from "fs";
import path from "path";

type EnvKey =
  | "APP_BASE_URL"
  | "BACKBOARD_API_KEY"
  | "DATABASE_URL"
  | "GEMINI_API_KEY"
  | "VULTR_STORAGE_ACCESS_KEY"
  | "VULTR_STORAGE_BUCKET"
  | "VULTR_STORAGE_ENDPOINT"
  | "VULTR_STORAGE_SECRET_KEY";

type OptionalEnvKey =
  | "BACKBOARD_AGENT1_ASSISTANT_ID"
  | "BACKBOARD_AGENT2_ASSISTANT_ID"
  | "BACKBOARD_AGENT3_ASSISTANT_ID"
  | "BACKBOARD_LLM_PROVIDER"
  | "BACKBOARD_MODEL_NAME";

export interface AppEnv {
  APP_BASE_URL: string;
  BACKBOARD_API_KEY: string;
  DATABASE_URL: string;
  GEMINI_API_KEY: string;
  VULTR_STORAGE_ACCESS_KEY: string;
  VULTR_STORAGE_BUCKET: string;
  VULTR_STORAGE_ENDPOINT: string;
  VULTR_STORAGE_SECRET_KEY: string;
  BACKBOARD_AGENT1_ASSISTANT_ID?: string;
  BACKBOARD_AGENT2_ASSISTANT_ID?: string;
  BACKBOARD_AGENT3_ASSISTANT_ID?: string;
  BACKBOARD_LLM_PROVIDER: string;
  BACKBOARD_MODEL_NAME: string;
}

let cachedEnv: AppEnv | null = null;
let loadedEnvFile = false;

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");
  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  if (!key) {
    return null;
  }

  let value = trimmed.slice(separatorIndex + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return [key, value];
}

function loadLocalEnvFile(): void {
  if (loadedEnvFile) {
    return;
  }

  loadedEnvFile = true;
  const envCandidates = [
    path.join(process.cwd(), ".env.local"),
    path.join(process.cwd(), ".env"),
  ];

  for (const envPath of envCandidates) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed) {
        continue;
      }

      const [key, value] = parsed;
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

function readRequiredEnv(key: EnvKey): string {
  loadLocalEnvFile();
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function readOptionalEnv(key: OptionalEnvKey): string | undefined {
  loadLocalEnvFile();
  const value = process.env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    APP_BASE_URL: readRequiredEnv("APP_BASE_URL").replace(/\/+$/, ""),
    BACKBOARD_API_KEY: readRequiredEnv("BACKBOARD_API_KEY"),
    DATABASE_URL: readRequiredEnv("DATABASE_URL"),
    GEMINI_API_KEY: readRequiredEnv("GEMINI_API_KEY"),
    VULTR_STORAGE_ACCESS_KEY: readRequiredEnv("VULTR_STORAGE_ACCESS_KEY"),
    VULTR_STORAGE_BUCKET: readRequiredEnv("VULTR_STORAGE_BUCKET"),
    VULTR_STORAGE_ENDPOINT: readRequiredEnv("VULTR_STORAGE_ENDPOINT"),
    VULTR_STORAGE_SECRET_KEY: readRequiredEnv("VULTR_STORAGE_SECRET_KEY"),
    BACKBOARD_AGENT1_ASSISTANT_ID: readOptionalEnv("BACKBOARD_AGENT1_ASSISTANT_ID"),
    BACKBOARD_AGENT2_ASSISTANT_ID: readOptionalEnv("BACKBOARD_AGENT2_ASSISTANT_ID"),
    BACKBOARD_AGENT3_ASSISTANT_ID: readOptionalEnv("BACKBOARD_AGENT3_ASSISTANT_ID"),
    BACKBOARD_LLM_PROVIDER: readOptionalEnv("BACKBOARD_LLM_PROVIDER") ?? "google",
    BACKBOARD_MODEL_NAME: readOptionalEnv("BACKBOARD_MODEL_NAME") ?? "gemini-2.5-flash",
  };

  return cachedEnv;
}
