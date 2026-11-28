import { cookies } from "next/headers";
import { handle } from "@/server/api";
import { flowProgress } from "@/server/services/repair-flow";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return handle(
    async (user) => {
      const jar = await cookies();
      return flowProgress(user, { get: (n) => jar.get(n)?.value, set: () => {} }, id);
    },
    { limit: 60, bucket: "repair-progress" },
  );
}
