import { cookies } from "next/headers";
import { z } from "zod";
import { handle, readJsonLimited } from "@/server/api";
import { flowHint } from "@/server/services/repair-flow";

const body = z.object({ level: z.number() });
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/repair", maxAge: 7 * 86_400 } as const;

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    async (user) => {
      const b = body.parse(await readJsonLimited(req));
      const jar = await cookies();
      return flowHint(user, { get: (n) => jar.get(n)?.value, set: (n, v) => jar.set(n, v, COOKIE_OPTS) }, id, b.level);
    },
    { limit: 60, bucket: "repair-hint" },
  );
}
