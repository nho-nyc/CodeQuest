import type { LessonContent } from "@/server/db/schema";
import type { QuestionType } from "@/features/learning/types";

export type QuestionSeed = {
  type: QuestionType;
  prompt: string;
  code?: string;
  data: Record<string, unknown>;
  answer: Record<string, unknown>;
  explanation: string;
};

export type LessonSeed = {
  slug: string;
  title: string;
  summary: string;
  content: LessonContent;
  questions: QuestionSeed[];
  /** "lesson" (default), "assessment" (required unit checkpoint, last) or "checkpoint" (optional review test, last). */
  kind?: "lesson" | "assessment" | "checkpoint";
};

export type UnitSeed = { slug: string; title: string; description: string; icon: string; lessons: LessonSeed[] };

export type WorldSeed = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  published: boolean;
  units: UnitSeed[];
};
