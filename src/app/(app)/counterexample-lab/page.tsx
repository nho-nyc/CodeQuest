import type { Metadata } from "next";
import { Lab } from "@/components/lab/lab";
import { CHALLENGES, isChallengeId } from "@/features/lab/registry";

export const metadata: Metadata = { title: "Counterexample Lab" };

export default async function LabPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  return <Lab initial={isChallengeId(c) ? c : CHALLENGES[0]!.id} />;
}
