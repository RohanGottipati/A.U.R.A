import type { DefaultSession } from "next-auth";

/**
 * Extend the built-in NextAuth types so `session.user` includes
 * the fields we store in Prisma (e.g. `id`).
 *
 * See: https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
