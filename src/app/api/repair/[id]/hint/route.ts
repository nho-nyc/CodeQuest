import { z } from "zod";
import { handle } from "@/server/api";
import { repairHint } from "@/server/services/repair";


const body = z.object({ level: z.number() });

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    async () => {
      const b = body.parse(await req.json());
      return repairHint(id, b.level);
    },
    { limit: 60, bucket: "repair-hint" },
  );
}
