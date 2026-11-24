import type { Metadata } from "next";
import Link from "next/link";
import { PlacementTest } from "@/components/placement/placement-test";
import { requireUser } from "@/server/auth/session";
import { latestPlacement } from "@/server/services/placement";

export const metadata: Metadata = { title: "Placement test" };
export const dynamic = "force-dynamic";

export default async function PlacementPage() {
  const user = await requireUser();
  const last = await latestPlacement(user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/learn" className="text-xs font-extrabold uppercase text-sky hover:underline">
        Learning path
      </Link>
      <h1 className="mt-1 text-3xl font-black">Placement test</h1>
      <p className="mt-1 text-muted">An optional, quick check to suggest where to begin. Your progress is never changed by it.</p>
      <div className="mt-6">
        <PlacementTest previous={last ? { skills: last.skills, recommendation: last.recommendation } : null} />
      </div>
    </div>
  );
}
