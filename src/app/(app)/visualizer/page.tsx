import type { Metadata } from "next";
import { Visualizer } from "@/components/visualizer/visualizer";
import { isVizId } from "@/features/visualizer/registry";

export const metadata: Metadata = { title: "Algorithm visualizer" };

export default async function VisualizerPage({ searchParams }: { searchParams: Promise<{ a?: string }> }) {
  const { a } = await searchParams;
  return <Visualizer initial={isVizId(a) ? a : "two-pointers"} />;
}
