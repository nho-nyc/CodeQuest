import { cookies } from "next/headers";
import { handle } from "@/server/api";
import { flowSolution } from "@/server/services/repair-flow";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    async (user) => {
      const jar = await cookies();
      return flowSolution(user, { get: (n) => jar.get(n)?.value, set: () => {} }, id);
    },
    { limit: 10, bucket: "repair-solution" },
  );
}
