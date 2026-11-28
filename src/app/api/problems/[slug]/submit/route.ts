import { z } from "zod";
import { handle } from "@/server/api";
import { submit } from "@/server/services/problems";

export const maxDuration = 60;
const body = z.object({ source: z.string(), language: z.string() });

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return handle(
    async (user) => {
      const b = body.parse(await req.json());
      return submit(user.id, slug, b.source, b.language);
    },
    { limit: 10, bucket: "submit", shared: true },
  );
}
