import { z } from "zod";
import { handle } from "@/server/api";
import { runSamples } from "@/server/services/problems";

export const maxDuration = 60;
const body = z.object({ source: z.string(), language: z.string(), customInput: z.string().optional() });

export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  return handle(
    async (user) => {
      const b = body.parse(await req.json());
      return runSamples(user.id, slug, b.source, b.language, b.customInput);
    },
    { limit: 20, bucket: "run", shared: true },
  );
}
