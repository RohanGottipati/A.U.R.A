import { jsonWithCors, optionsResponse } from "@/lib/http";

export async function GET() {
  return jsonWithCors({ status: "ok", timestamp: new Date().toISOString() });
}

export async function OPTIONS() {
  return optionsResponse();
}
