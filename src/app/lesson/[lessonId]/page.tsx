import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/lesson-player";
import { UUID } from "@/server/api";
import { requireUser } from "@/server/auth/session";
import { ServiceError, startOrResumeRun } from "@/server/services/lesson-run";

export const metadata: Metadata = { title: "Lesson" };
export const dynamic = "force-dynamic";

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  const user = await requireUser();
  if (!UUID.test(lessonId)) notFound();
  let run;
  try {
    run = await startOrResumeRun(user.id, lessonId);
  } catch (e) {
    if (e instanceof ServiceError && e.status === 403) redirect(`/learn?locked=${lessonId}`);
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  }
  return <LessonPlayer run={run} />;
}
