"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Toast } from "@/components/ui/toast";
import type { QuestionResponse } from "@/features/learning/grader";
import type { PublicQuestion } from "@/features/learning/types";
import { cn } from "@/lib/cn";
import type { PlacementResult } from "@/server/services/placement";
import { QuestionView } from "@/components/lesson/question-views";
import { ResultView } from "./result-view";

type Answer = QuestionResponse | "unknown";
type View = Pick<PlacementResult, "skills" | "recommendation"> & { missed?: PlacementResult["missed"]; total?: number };

const storeKey = (id: string) => `cq-placement:${id}`;

export function PlacementTest({ previous }: { previous: View | null }) {
  const [phase, setPhase] = useState<"intro" | "test" | "result">(previous ? "result" : "intro");
  const [attemptId, setAttemptId] = useState("");
  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<View | null>(previous);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  async function call<T>(url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok) throw new Error(data.error ?? "Something went wrong");
    return data;
  }

  // Keep answers across a refresh (best effort: storage can be unavailable).
  useEffect(() => {
    if (phase !== "test" || !attemptId) return;
    try {
      localStorage.setItem(storeKey(attemptId), JSON.stringify({ answers, index }));
    } catch {}
  }, [answers, index, attemptId, phase]);

  async function start() {
    setBusy(true);
    try {
      const d = await call<{ attemptId: string; questions: PublicQuestion[] }>("/api/placement/start");
      setAttemptId(d.attemptId);
      setQuestions(d.questions);
      let saved: { answers?: Record<string, Answer>; index?: number } = {};
      try {
        saved = JSON.parse(localStorage.getItem(storeKey(d.attemptId)) ?? "{}");
      } catch {}
      setAnswers(saved.answers ?? {});
      setIndex(Math.min(saved.index ?? 0, d.questions.length - 1));
      setPhase("test");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start the test");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {};
      for (const q of questions) payload[q.id] = answers[q.id] && answers[q.id] !== "unknown" ? answers[q.id] : null;
      setResult(await call<PlacementResult>("/api/placement/submit", { attemptId, answers: payload }));
      try {
        localStorage.removeItem(storeKey(attemptId));
      } catch {}
      setPhase("result");
      window.scrollTo({ top: 0 });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit the test");
    } finally {
      setBusy(false);
    }
  }

  if (phase === "result" && result) return <ResultView result={result} onRetake={() => setPhase("intro")} />;

  if (phase === "intro") {
    return (
      <Card className="p-6">
        <Toast message={error} onDone={clearError} />
        <h2 className="text-xl font-black">Find a good place to start</h2>
        <p className="mt-2">About 19 short questions, around 10 minutes, covering what CodeQuest teaches: from variables and loops up to graphs and a first look at dynamic programming.</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Do not guess. Press <b>I&apos;m not sure</b> when you do not know; that is useful information, not a failure.</li>
          <li>You can go back and change answers before you submit.</li>
          <li>It is a quick, provisional estimate, not an exam. It costs no hearts, earns no XP, and changes none of your progress.</li>
          <li>You get a suggested path. Nothing is unlocked or skipped automatically.</li>
        </ul>
        <Button type="button" size="lg" className="mt-5" onClick={start} disabled={busy}>
          {busy ? "Starting..." : "Start the placement test"}
        </Button>
      </Card>
    );
  }

  const q = questions[index];
  if (!q) return null;
  const last = index === questions.length - 1;
  const a = answers[q.id];
  const value = a && a !== "unknown" ? a : null;
  const answered = questions.filter((x) => answers[x.id]).length;
  const set = (id: string, v: Answer | null) =>
    setAnswers((cur) => {
      const next = { ...cur };
      if (v) next[id] = v;
      else delete next[id];
      return next;
    });
  return (
    <div className="flex flex-col gap-6 pb-44 lg:pb-32">
      <Toast message={error} onDone={clearError} />
      <div className="flex items-center gap-4">
        <ProgressBar value={answered / questions.length} label="Questions answered" />
        <span className="whitespace-nowrap text-sm font-extrabold text-muted">
          {index + 1}/{questions.length}
        </span>
      </div>
      <nav aria-label="Question navigation" className="flex flex-wrap gap-1.5">
        {questions.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Question ${i + 1}${answers[x.id] ? (answers[x.id] === "unknown" ? ", not sure" : ", answered") : ", unanswered"}`}
            aria-current={i === index ? "step" : undefined}
            className={cn("grid size-8 place-items-center rounded-lg border-2 text-xs font-extrabold transition", i === index ? "border-sky bg-sky text-white" : answers[x.id] === "unknown" ? "border-gold bg-gold/20" : answers[x.id] ? "border-brand bg-brand/15" : "border-line bg-surface hover:bg-surface-2")}
          >
            {i + 1}
          </button>
        ))}
      </nav>
      <QuestionView key={q.id} q={q} value={value} onChange={(v) => set(q.id, v)} verdict={null} />
      <button type="button" onClick={() => set(q.id, a === "unknown" ? null : "unknown")} aria-pressed={a === "unknown"} className={cn("self-start rounded-xl border-2 px-4 py-2 text-sm font-extrabold", a === "unknown" ? "border-gold bg-gold/20" : "border-line hover:bg-surface-2")}>
        {a === "unknown" ? "Marked as not sure (tap to undo)" : "I'm not sure"}
      </button>
      <footer className="fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-20 border-t-2 border-line bg-surface px-4 py-3 lg:bottom-0 lg:pb-4 lg:pl-72 lg:pt-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <Button type="button" variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            Back
          </Button>
          {last ? (
            <div className="flex flex-col items-end gap-1">
              {answered < questions.length && <span className="text-xs text-muted">{questions.length - answered} unanswered count as &ldquo;not sure&rdquo;</span>}
              <Button type="button" disabled={busy} onClick={submit}>
                {busy ? "Submitting..." : "See my results"}
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={() => setIndex((i) => i + 1)}>
              {a ? "Next" : "Skip for now"}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
