type EnvKey =
  | "APP_BASE_URL"
  | "DATABASE_URL"
  | "GEMINI_API_KEY"
  | "VULTR_STORAGE_ACCESS_KEY"
  | "VULTR_STORAGE_BUCKET"
  | "VULTR_STORAGE_ENDPOINT"
  | "VULTR_STORAGE_SECRET_KEY";

export interface AppEnv {
  APP_BASE_URL: string;
  DATABASE_URL: string;
  GEMINI_API_KEY: string;
  VULTR_STORAGE_ACCESS_KEY: string;
  VULTR_STORAGE_BUCKET: string;
  VULTR_STORAGE_ENDPOINT: string;
  VULTR_STORAGE_SECRET_KEY: string;
}

let cachedEnv: AppEnv | null = null;

function readRequiredEnv(key: EnvKey): string {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export function getEnv(): AppEnv {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = {
    APP_BASE_URL: readRequiredEnv("APP_BASE_URL").replace(/\/+$/, ""),
    DATABASE_URL: readRequiredEnv("DATABASE_URL"),
    GEMINI_API_KEY: readRequiredEnv("GEMINI_API_KEY"),
    VULTR_STORAGE_ACCESS_KEY: readRequiredEnv("VULTR_STORAGE_ACCESS_KEY"),
    VULTR_STORAGE_BUCKET: readRequiredEnv("VULTR_STORAGE_BUCKET"),
    VULTR_STORAGE_ENDPOINT: readRequiredEnv("VULTR_STORAGE_ENDPOINT"),
    VULTR_STORAGE_SECRET_KEY: readRequiredEnv("VULTR_STORAGE_SECRET_KEY"),
  };

  return cachedEnv;
}
