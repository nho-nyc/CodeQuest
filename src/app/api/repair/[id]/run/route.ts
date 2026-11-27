import { z } from "zod";
import { handle } from "@/server/api";
import { runRepair } from "@/server/services/repair";

export const maxDuration = 60;
const body = z.object({ source: z.string(), language: z.string() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    async (user) => {
      const b = body.parse(await req.json());
      return runRepair(user.id, id, b.source, b.language);
    },
    { limit: 20, bucket: "repair-run" },
  );
}
