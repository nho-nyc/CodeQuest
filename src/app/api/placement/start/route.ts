import { handle } from "@/server/api";
import { startPlacement } from "@/server/services/placement";

export async function POST() {
  return handle((user) => startPlacement(user.id), { limit: 10, bucket: "placement-start" });
}
