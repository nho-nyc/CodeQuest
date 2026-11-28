import type { Metadata } from "next";
import { Workshop } from "@/components/repair/workshop";
import { REPAIR_CHALLENGES, isRepairId } from "@/features/repair/challenges";
import { requireUser } from "@/server/auth/session";
import { getJudge } from "@/server/judge";

export const metadata: Metadata = { title: "Algorithm Repair Workshop" };

export default async function RepairWorkshopPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const user = await requireUser();
  let judgeConfigured = false;
  try {
    judgeConfigured = getJudge() !== null;
  } catch {
    judgeConfigured = false; // a misconfigured judge is reported by the API with a clear message
  }
  return <Workshop initial={isRepairId(c) ? c : REPAIR_CHALLENGES[0]!.id} judgeConfigured={judgeConfigured} userId={user.id} />;
}
