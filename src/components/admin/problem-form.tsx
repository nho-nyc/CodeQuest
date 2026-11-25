import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { saveProblemAction } from "@/features/admin/actions";
import type { Problem } from "@/server/db/schema";
import { Field, inputCls } from "./ui";

export function ProblemForm({ p }: { p?: Problem }) {
  const sample = p?.samples[0];
  return (
    <Card>
      <form action={saveProblemAction} className="grid gap-3">
        {p && <input type="hidden" name="id" value={p.id} />}
        <Field label="Title"><input name="title" required defaultValue={p?.title} className={inputCls} /></Field>
        <Field label="Statement"><textarea name="statement" required rows={6} defaultValue={p?.statement} className={inputCls} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Input format"><textarea name="inputFormat" required rows={3} defaultValue={p?.inputFormat} className={inputCls} /></Field>
          <Field label="Output format"><textarea name="outputFormat" required rows={3} defaultValue={p?.outputFormat} className={inputCls} /></Field>
        </div>
        <Field label="Constraints"><textarea name="constraints" required rows={2} defaultValue={p?.constraints} className={inputCls} /></Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Difficulty"><select name="difficulty" defaultValue={p?.difficulty ?? "easy"} className={inputCls}>{["newbie", "easy", "medium", "hard", "expert"].map((d) => <option key={d}>{d}</option>)}</select></Field>
          <Field label="Rating"><input name="rating" type="number" defaultValue={p?.rating ?? 1000} className={inputCls} /></Field>
          <Field label="Estimated minutes"><input name="estimatedMinutes" type="number" defaultValue={p?.estimatedMinutes ?? 15} className={inputCls} /></Field>
          <Field label="Time limit (ms)"><input name="timeLimitMs" type="number" defaultValue={p?.timeLimitMs ?? 1000} className={inputCls} /></Field>
          <Field label="Memory limit (MB)"><input name="memoryLimitMb" type="number" defaultValue={p?.memoryLimitMb ?? 256} className={inputCls} /></Field>
          <Field label="Tags" hint="Comma separated"><input name="tags" defaultValue={p?.tags.join(", ")} className={inputCls} /></Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Sample input"><textarea name="sampleInput" required rows={3} defaultValue={sample?.input} className={`${inputCls} font-mono`} /></Field>
          <Field label="Sample output"><textarea name="sampleOutput" required rows={3} defaultValue={sample?.output} className={`${inputCls} font-mono`} /></Field>
        </div>
        {[1, 2, 3].map((n) => (
          <Field key={n} label={`Hint ${n} · ${["Understand", "Direction", "Implementation"][n - 1]}`} hint={["Understand the problem: point at the key observation without naming the algorithm.", "Algorithmic direction: name the technique and why it fits, but no code.", "Implementation: the key steps, invariant or data structure."][n - 1]}><input name={`hint${n}`} required defaultValue={p?.hints[n - 1]} className={inputCls} /></Field>
        ))}
        <fieldset className="grid gap-3 rounded-2xl border-2 border-line p-4">
          <legend className="px-2 text-sm font-extrabold">Teaching metadata <span className="font-normal text-muted">(optional: leave all blank for none, otherwise fill every field except prerequisites)</span></legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Main skill" hint="Must be one of the tags"><input name="primarySkill" defaultValue={p?.meta?.primarySkill} className={inputCls} /></Field>
            <Field label="Expected time"><input name="timeComplexity" placeholder="O(n log n)" defaultValue={p?.meta?.timeComplexity} className={inputCls} /></Field>
            <Field label="Expected memory"><input name="spaceComplexity" placeholder="O(n)" defaultValue={p?.meta?.spaceComplexity} className={inputCls} /></Field>
          </div>
          <Field label="Approach" hint="One sentence. Shown only after the learner solves the problem."><textarea name="approach" rows={2} defaultValue={p?.meta?.approach} className={inputCls} /></Field>
          <Field label="Common mistakes" hint="One per line, 1 to 4."><textarea name="commonMistakes" rows={3} defaultValue={p?.meta?.commonMistakes?.join("\n")} className={inputCls} /></Field>
          <Field label="Prerequisite unit slugs" hint="Optional, comma separated, at most 3. Left empty they are derived from the tags."><input name="prerequisites" defaultValue={p?.meta?.prerequisites?.join(", ")} className={inputCls} /></Field>
        </fieldset>
        <Field label="Editorial (shown after solving)"><textarea name="editorial" required rows={4} defaultValue={p?.editorial} className={inputCls} /></Field>
        <Field label="Reference solution C++ (shown after solving)"><textarea name="referenceSolution" required rows={8} defaultValue={p?.referenceSolution} className={`${inputCls} font-mono`} /></Field>
        <Button type="submit">{p ? "Save problem" : "Create problem (as draft)"}</Button>
      </form>
    </Card>
  );
}
