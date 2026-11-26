import { AlertTriangle, CirclePlay, Lightbulb, Terminal } from "lucide-react";
import Link from "next/link";
import type { VizId } from "@/features/visualizer/registry";
import { Card } from "@/components/ui/card";
import type { LessonContent } from "@/server/db/schema";
import { CodeBlock } from "./code-block";

export function LearnCard({ content, title, visualizer = null }: { content: LessonContent; title: string; visualizer?: VizId | null }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-sky">Learn</p>
        <h1 className="mt-1 text-2xl font-black sm:text-3xl">{title}</h1>
      </div>
      <Card className="border-sky/40 bg-sky/10">
        <p className="flex items-start gap-3 text-lg font-extrabold">
          <Lightbulb className="mt-0.5 shrink-0 text-sky" /> {content.concept}
        </p>
      </Card>
      {visualizer && (
        <Link href={`/visualizer?a=${visualizer}`} target="_blank" className="flex items-center gap-3 rounded-2xl border-2 border-sky/40 p-3 text-sm font-extrabold text-sky transition hover:bg-sky/10">
          <CirclePlay size={22} /> See it step by step in the visualizer
          <span className="ml-auto text-xs font-bold text-muted">opens in a new tab · no XP</span>
        </Link>
      )}
      <div className="flex flex-col gap-3 text-[17px] leading-relaxed">
        {content.explanation.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      {content.syntax && (
        <div>
          <p className="mb-2 text-sm font-extrabold uppercase text-muted">Syntax</p>
          <CodeBlock code={content.syntax} />
        </div>
      )}
      {content.example && (
        <div>
          <p className="mb-2 text-sm font-extrabold uppercase text-muted">Example</p>
          <CodeBlock code={content.example.code} />
          <div className="mt-2 rounded-2xl border-2 border-line bg-surface-2 p-4">
            <p className="mb-1 flex items-center gap-2 text-xs font-extrabold uppercase text-muted">
              <Terminal size={14} /> Output
            </p>
            <pre className="whitespace-pre-wrap font-mono text-sm">{content.example.output}</pre>
          </div>
          {content.example.note && <p className="mt-2 text-sm text-muted">{content.example.note}</p>}
        </div>
      )}
      {content.commonMistakes && content.commonMistakes.length > 0 && (
        <Card className="border-tangerine/40 bg-tangerine/10">
          <p className="mb-2 flex items-center gap-2 font-extrabold text-tangerine-dark dark:text-tangerine">
            <AlertTriangle size={18} /> Common mistakes
          </p>
          <ul className="list-disc space-y-1 pl-5">
            {content.commonMistakes.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
