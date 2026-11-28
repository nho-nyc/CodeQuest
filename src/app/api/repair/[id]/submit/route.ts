import { cookies } from "next/headers";
import { z } from "zod";
import { handle, readJsonLimited } from "@/server/api";
import { flowSubmit } from "@/server/services/repair-flow";

export const maxDuration = 60;
const body = z.object({ source: z.string(), language: z.string() });
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/repair", maxAge: 7 * 86_400 } as const;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    async (user) => {
      const b = body.parse(await readJsonLimited(req));
      const jar = await cookies();
      return flowSubmit(user, { get: (n) => jar.get(n)?.value, set: (n, v) => jar.set(n, v, COOKIE_OPTS) }, id, b.source, b.language);
    },
    { limit: 8, bucket: "repair-submit", shared: true, maxInFlight: 2 },
  );
}
