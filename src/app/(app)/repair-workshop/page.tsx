import type { Metadata } from "next";
import { Workshop } from "@/components/repair/workshop";
import { REPAIR_CHALLENGES, isRepairId } from "@/features/repair/challenges";
import { getJudge } from "@/server/judge";

export const metadata: Metadata = { title: "Algorithm Repair Workshop" };

export default async function RepairWorkshopPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  return <Workshop initial={isRepairId(c) ? c : REPAIR_CHALLENGES[0]!.id} judgeConfigured={getJudge() !== null} />;
}
