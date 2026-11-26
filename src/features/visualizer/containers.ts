import { finishTrace, type RunResult, type Step } from "./engine";

export type ContainerState = {
  kind: "stack" | "queue";
  items: number[];
  /** Index (in `items`) of the element the last operation touched, if it is still inside. */
  touched: number | null;
  /** The value that was just removed, shown ghosted for one step. */
  removed: number | null;
  /** Result of the last query (top / front / back / empty), as text. */
  result: string | null;
  opIndex: number;
  ops: string[];
  warning: boolean;
};

export type Op = { name: "push" | "pop" | "top" | "front" | "back" | "empty"; value?: number; text: string };

export const MAX_OPS = 20;
export const MAX_ITEMS = 10;

const ALLOWED: Record<"stack" | "queue", Op["name"][]> = { stack: ["push", "pop", "top", "empty"], queue: ["push", "pop", "front", "back", "empty"] };

export function parseOps(text: string, kind: "stack" | "queue"): { ok: true; ops: Op[] } | { ok: false; error: string } {
  const parts = text.split(/[,\n;]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return { ok: false, error: "Operations: enter at least one operation, for example: push 5, push 3, pop." };
  if (parts.length > MAX_OPS) return { ok: false, error: `Operations: use at most ${MAX_OPS} operations (you gave ${parts.length}).` };
  const ops: Op[] = [];
  let size = 0;
  for (const p of parts) {
    const m = /^([a-z]+)(?:\s+(-?\d+))?$/i.exec(p);
    const name = m?.[1]?.toLowerCase() as Op["name"] | undefined;
    if (!m || !name || !ALLOWED[kind].includes(name)) return { ok: false, error: `Operations: "${p.slice(0, 20)}" is not allowed. Use: ${ALLOWED[kind].map((o) => (o === "push" ? "push X" : o)).join(", ")}.` };
    if (name === "push") {
      if (m[2] === undefined) return { ok: false, error: `Operations: "push" needs a number, like push 7.` };
      const v = Number(m[2]);
      if (v < -999 || v > 999) return { ok: false, error: `Operations: ${v} is outside the allowed range -999 to 999.` };
      size++;
      if (size > MAX_ITEMS) return { ok: false, error: `Operations: more than ${MAX_ITEMS} values would be stored at once. Add some pop operations or use fewer pushes.` };
      ops.push({ name, value: v, text: `push ${v}` });
    } else {
      if (m[2] !== undefined) return { ok: false, error: `Operations: "${name}" does not take a number.` };
      if (name === "pop") size = Math.max(0, size - 1);
      ops.push({ name, text: name });
    }
  }
  return { ok: true, ops };
}

export const STACK_CODE = ["stack<int> st;", "st.push(x);", "st.pop();", "int t = st.top();", "bool e = st.empty();"];
export const QUEUE_CODE = ["queue<int> q;", "q.push(x);", "q.pop();", "int f = q.front();", "int b = q.back();", "bool e = q.empty();"];

export const STACK_DEFAULT = { ops: "push 5, push 8, push 2, top, pop, pop, empty, push 7, pop, pop, empty" };
export const QUEUE_DEFAULT = { ops: "push 5, push 8, push 2, front, pop, back, pop, pop, empty, push 7, front" };

export function runContainer(kind: "stack" | "queue", input: { ops: string }): RunResult<ContainerState> {
  const parsed = parseOps(input.ops, kind);
  if (!parsed.ok) return { ok: false, errors: [parsed.error] };
  const ops = parsed.ops;
  const labels = ops.map((o) => o.text);
  const stack = kind === "stack";
  const name = stack ? "st" : "q";
  const lineOf = (n: Op["name"]) => (stack ? { push: 1, pop: 2, top: 3, empty: 4 } : { push: 1, pop: 2, front: 3, back: 4, empty: 5 })[n as never] as number;
  let items: number[] = [];
  const steps: Step<ContainerState>[] = [];
  const snap = (opIndex: number, extra: Partial<ContainerState> = {}): ContainerState => ({ kind, items: [...items], touched: null, removed: null, result: null, opIndex, ops: labels, warning: false, ...extra });
  const who = stack ? "last in, first out (LIFO)" : "first in, first out (FIFO)";
  steps.push({ state: snap(-1), line: 0, tone: "info", what: `An empty ${stack ? "stack" : "queue"} is created.`, why: stack ? "A stack only lets you touch one end, the top. The last value pushed is the first one popped." : "A queue lets you add at the back and remove from the front. The first value pushed is the first one popped.", notice: `Rule to remember: ${who}.` });

  ops.forEach((op, i) => {
    const line = lineOf(op.name);
    if (op.name === "push") {
      items = [...items, op.value!];
      steps.push({ state: snap(i, { touched: items.length - 1 }), line, tone: "info", what: `push ${op.value}: add ${op.value} at the ${stack ? "top" : "back"}.`, why: stack ? "Pushing always puts the new value on top, above everything already there." : "Pushing always adds the new value at the back, behind everything already waiting.", notice: `Size is now ${items.length}.` });
    } else if (op.name === "pop") {
      if (items.length === 0) {
        steps.push({ state: snap(i, { warning: true }), line, tone: "warn", what: `pop on an empty ${stack ? "stack" : "queue"}: nothing to remove.`, why: `In C++, calling ${name}.pop() on an empty container is undefined behaviour (it may crash). Always check ${name}.empty() first.`, notice: `Nothing was removed. Guard with: if (!${name}.empty()) ${name}.pop();` });
        return;
      }
      const gone = stack ? items[items.length - 1]! : items[0]!;
      items = stack ? items.slice(0, -1) : items.slice(1);
      steps.push({ state: snap(i, { removed: gone }), line, tone: "info", what: `pop: remove ${gone} from the ${stack ? "top" : "front"}.`, why: stack ? `${gone} was pushed most recently, so it is the one on top and the first to leave. That is LIFO.` : `${gone} has waited the longest, so it is at the front and the first to leave. That is FIFO.`, notice: stack ? "pop() removes the top but does not return it. Read top() first if you need the value." : "pop() removes the front but does not return it. Read front() first if you need the value." });
    } else if (op.name === "top" || op.name === "front" || op.name === "back") {
      if (items.length === 0) {
        steps.push({ state: snap(i, { warning: true }), line, tone: "warn", what: `${op.name} on an empty ${stack ? "stack" : "queue"}: there is no value to read.`, why: `In C++, ${name}.${op.name}() on an empty container is undefined behaviour. Check ${name}.empty() first.`, notice: "Reading an empty container is a classic runtime-error bug." });
        return;
      }
      const idx = op.name === "front" ? 0 : items.length - 1;
      steps.push({ state: snap(i, { touched: idx, result: String(items[idx]) }), line, tone: "info", what: `${op.name}: the ${op.name === "back" ? "back" : stack ? "top" : "front"} value is ${items[idx]}. Nothing is removed.`, why: `${op.name}() only looks at the value. The container does not change.`, notice: "Looking is free: size stays " + items.length + "." });
    } else {
      steps.push({ state: snap(i, { result: items.length === 0 ? "true" : "false" }), line, tone: "info", what: `empty: the ${stack ? "stack" : "queue"} ${items.length === 0 ? "has no values, so empty() is true" : `holds ${items.length} value${items.length === 1 ? "" : "s"}, so empty() is false`}.`, why: `Check empty() before ${stack ? "top() or pop()" : "front(), back() or pop()"} to avoid reading from nothing.` });
    }
  });
  steps.push({ state: snap(ops.length), line: null, tone: "good", what: items.length === 0 ? `All operations done. The ${stack ? "stack" : "queue"} is empty.` : `All operations done. ${items.length} value${items.length === 1 ? " is" : "s are"} left: ${(stack ? [...items].reverse() : items).join(", ")} (${stack ? "top first" : "front first"}).`, why: stack ? "Values left in the reverse of the order they were pushed: the stack reverses order." : "Values left in the same order they were pushed: the queue keeps order.", notice: `Every push, pop and read took constant time, O(1).` });
  return finishTrace(steps);
}
