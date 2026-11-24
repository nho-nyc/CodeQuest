"use client";

import { Check, Heart, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Toast } from "@/components/ui/toast";
import type { QuestionResponse } from "@/features/learning/grader";
import type { PublicQuestion } from "@/features/learning/types";
import { cn } from "@/lib/cn";
import type { RunState } from "@/server/services/lesson-run";
import { CompleteScreen, type CompleteSummary } from "./complete-screen";
import { LearnCard } from "./learn-card";
import { QuestionView } from "./question-views";

type Feedback = { correct: boolean; correctAnswer: string; explanation: string };

class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) throw new ApiError(data.error ?? "Request failed", data.code);
  return data as T;
}

export function LessonPlayer({ run }: { run: RunState }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"learn" | "quiz" | "done">(run.resumed ? "quiz" : "learn");
  const [queue, setQueue] = useState<PublicQuestion[]>(run.remaining);
  const [correctCount, setCorrectCount] = useState(run.total - run.remaining.length);
  const [mistakes, setMistakes] = useState(run.mistakes);
  const [value, setValue] = useState<QuestionResponse | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [summary, setSummary] = useState<CompleteSummary | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
  // Hearts only apply to a lesson you have not finished before. Replays are free practice.
  const heartsApply = !run.alreadyCompleted && run.kind !== "assessment";
  const [hearts, setHearts] = useState(run.hearts.hearts);
  const [noHearts, setNoHearts] = useState(heartsApply && run.hearts.hearts === 0 && run.resumed);

  const current = queue[0];
  const clearError = useCallback(() => setError(null), []);

  async function check() {
    if (!current || !value || busy || feedback) return;
    setBusy(true);
    try {
      const r = await post<{ correct: boolean; correctAnswer: string; explanation: string; mistakes: number; hearts: { hearts: number } }>(`/api/runs/${run.runId}/answer`, { questionId: current.id, response: value });
      setFeedback({ correct: r.correct, correctAnswer: r.correctAnswer, explanation: r.explanation });
      setMistakes(r.mistakes);
      setHearts(r.hearts.hearts);
    } catch (e) {
      if (e instanceof ApiError && e.code === "out_of_hearts") {
        setHearts(0);
        setNoHearts(true);
      } else if (e instanceof ApiError && e.code === "content_updated") {
        setError(e.message);
        setTimeout(() => window.location.reload(), 1800);
      } else setError(e instanceof Error ? e.message : "Could not check your answer");
    } finally {
      setBusy(false);
    }
  }

  async function next() {
    if (!current || !feedback || busy) return;
    const rest = queue.slice(1);
    if (!feedback.correct && heartsApply && hearts === 0) {
      // Out of hearts: keep everything saved and let the learner recover instead of punishing them.
      setNoHearts(true);
      return;
    }
    if (!feedback.correct) {
      // Missed questions come back at the end of the lesson (like Duolingo).
      setQueue([...rest, current]);
    } else {
      setCorrectCount((c) => c + 1);
      if (rest.length === 0) {
        setBusy(true);
        try {
          const s = await post<CompleteSummary>(`/api/runs/${run.runId}/complete`);
          setSummary(s);
          setPhase("done");
          router.refresh();
        } catch (e) {
          if (e instanceof ApiError && e.code === "assessment_failed") {
            setFailedMessage(e.message);
            return;
          }
          setError(e instanceof Error ? e.message : "Could not finish the lesson");
          setCorrectCount((c) => c - 1);
        } finally {
          setBusy(false);
        }
        return;
      }
      setQueue(rest);
    }
    setFeedback(null);
    setValue(null);
    setAttempt((a) => a + 1);
  }

  // Keyboard: Enter to check/continue, 1-4 to pick an option.
  useEffect(() => {
    if (phase !== "quiz" || !current) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" && e.key !== "Enter") return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (feedback) void next();
        else void check();
      } else if (!feedback && /^[1-4]$/.test(e.key) && ["multiple_choice", "true_false", "predict_output", "find_bug"].includes(current.type)) {
        const idx = Number(e.key) - 1;
        if (idx < ((current.data.options as string[])?.length ?? 0)) setValue({ index: idx });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (failedMessage) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 py-10">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-black">Assessment not passed yet</h1>
          <p className="mt-3 text-muted">{failedMessage}</p>
          <p className="mt-2 text-sm text-muted">Nothing is lost. Re-read the lessons of this unit, then start a fresh attempt.</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
              Try again
            </Button>
            <ButtonLink href="/learn" size="lg" variant="outline" className="w-full">
              Back to the path
            </ButtonLink>
          </div>
        </div>
      </main>
    );
  }

  if (phase === "done" && summary) {
    return (
      <main className="grid min-h-dvh place-items-center px-4 py-10">
        <CompleteScreen s={summary} mistakes={mistakes} />
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Toast message={error} onDone={clearError} />
      <header className="mx-auto flex w-full max-w-3xl items-center gap-4 px-4 py-4">
        <button type="button" onClick={() => setLeaving(true)} aria-label="Exit lesson" className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-2">
          <X size={26} />
        </button>
        <ProgressBar value={run.total ? correctCount / run.total : 0} label="Lesson progress" />
        <span className="whitespace-nowrap text-sm font-extrabold text-muted">
          {Math.min(correctCount + 1, run.total)}/{run.total}
        </span>
        {run.maxMistakes !== null && (
          <span className={cn("whitespace-nowrap text-xs font-extrabold uppercase", mistakes > run.maxMistakes ? "text-danger" : "text-muted")} aria-label={`${mistakes} of ${run.maxMistakes} allowed mistakes`}>
            Mistakes {mistakes}/{run.maxMistakes}
          </span>
        )}
        {heartsApply && (
          <span className="flex items-center gap-1 font-extrabold text-danger" aria-label={`${hearts} hearts left`}>
            <Heart size={22} fill={hearts > 0 ? "currentColor" : "none"} /> {hearts}
          </span>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-48 pt-4">
        {phase === "learn" ? (
          <LearnCard content={run.lesson.content} title={run.lesson.title} />
        ) : current ? (
          <QuestionView key={`${current.id}-${attempt}`} q={current} value={value} onChange={setValue} verdict={feedback && { correct: feedback.correct, correctAnswer: feedback.correctAnswer }} />
        ) : null}
      </main>

      <footer className={cn("fixed inset-x-0 bottom-0 border-t-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 transition-colors", feedback ? (feedback.correct ? "border-brand/40 bg-brand/15" : "border-danger/40 bg-danger/15") : "border-line bg-surface")}>
        <div className="mx-auto flex max-w-3xl flex-col gap-3">
          {feedback && (
            <div role="status" aria-live="polite" className="animate-pop">
              <p className={cn("flex items-center gap-2 text-lg font-black", feedback.correct ? "text-brand-dark dark:text-brand" : "text-danger")}>
                {feedback.correct ? <Check size={22} /> : <X size={22} />}
                {feedback.correct ? "Correct!" : "Not quite."}
              </p>
              <p className="mt-1 text-sm leading-snug">{feedback.explanation}</p>
            </div>
          )}
          {phase === "learn" ? (
            <>
              {run.maxMistakes !== null && <p className="text-center text-xs font-bold text-sky">Unit assessment: pass with at most {run.maxMistakes} mistakes. It does not use hearts, and you can retry.</p>}
              {run.alreadyCompleted && <p className="text-center text-xs text-muted">You have completed this lesson before. Replays are practice and earn no new XP, apart from a one-time Perfect bonus.</p>}
              <Button size="lg" onClick={() => (heartsApply && hearts === 0 ? setNoHearts(true) : setPhase("quiz"))} className="w-full sm:ml-auto sm:w-56">
                Start quiz
              </Button>
            </>
          ) : feedback ? (
            <Button size="lg" variant={feedback.correct ? "primary" : "danger"} onClick={() => void next()} disabled={busy} className="w-full sm:ml-auto sm:w-56">
              {busy ? "Saving..." : feedback.correct && queue.length === 1 ? "Finish" : "Continue"}
            </Button>
          ) : (
            <Button size="lg" onClick={() => void check()} disabled={!value || busy} className="w-full sm:ml-auto sm:w-56">
              {busy ? "Checking..." : "Check"}
            </Button>
          )}
        </div>
      </footer>

      <Modal open={noHearts} onClose={() => setNoHearts(false)} title="You are out of hearts">
        <p className="text-muted">No problem, nothing is lost. Your progress in this lesson is saved.</p>
        <ul className="mt-3 list-disc pl-5 text-sm text-muted">
          <li>A heart comes back every 30 minutes.</li>
          <li>Replay a lesson you already finished: replays are free, and finishing one earns a heart.</li>
        </ul>
        <div className="mt-5 flex flex-col gap-3">
          <ButtonLink href="/learn" size="lg" className="w-full">
            Practice to earn a heart
          </ButtonLink>
          <Button size="lg" variant="outline" className="w-full" onClick={() => window.location.reload()}>
            I waited, check again
          </Button>
        </div>
      </Modal>

      <Modal open={leaving} onClose={() => setLeaving(false)} title="Leave this lesson?">
        <p className="text-muted">Your progress is saved. You can pick up right where you stopped.</p>
        <div className="mt-5 flex flex-col gap-3">
          <Button size="lg" onClick={() => setLeaving(false)} className="w-full">
            Keep learning
          </Button>
          <Button size="lg" variant="outline" onClick={() => router.push("/learn")} className="w-full">
            Leave
          </Button>
        </div>
      </Modal>
    </div>
  );
}
