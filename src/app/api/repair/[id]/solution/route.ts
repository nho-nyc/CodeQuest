import { handle } from "@/server/api";
import { repairSolution } from "@/server/services/repair";




export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    async () => {
      return repairSolution(id);
    },
    { limit: 10, bucket: "repair-solution" },
  );
}
