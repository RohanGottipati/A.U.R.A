import { NextResponse } from "next/server";

const DEFAULT_ALLOWED_ORIGIN = "http://localhost:3000";

function getCorsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin":
      process.env.CORS_ORIGIN ?? DEFAULT_ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    Vary: "Origin",
  };
}

export function jsonWithCors(body: unknown, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init);

  Object.entries(getCorsHeaders()).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}

export function optionsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}
