import { PHASE_DEVELOPMENT_SERVER } from "next/constants.js";

/** @type {import('next').NextConfig} */
function nextConfig(phase) {
  return {
    // Keep dev and production artifacts separate so switching between
    // `next dev` and `next build` never leaves a mixed runtime behind.
    distDir:
      phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next-prod",
  };
}

export default nextConfig;
