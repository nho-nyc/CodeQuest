import { z } from "zod";
import { handle, UUID } from "@/server/api";
import { submitPlacement } from "@/server/services/placement";

const body = z.object({ attemptId: z.string().regex(UUID), answers: z.record(z.string().regex(UUID), z.unknown()) });

export async function POST(req: Request) {
  return handle(
    async (user) => {
      const b = body.parse(await req.json());
      if (Object.keys(b.answers).length > 30) throw new Error("too many answers");
      return submitPlacement(user.id, b.attemptId, b.answers);
    },
    { limit: 10, bucket: "placement-submit" },
  );
}
