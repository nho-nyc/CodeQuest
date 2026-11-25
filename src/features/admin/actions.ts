"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/server/auth/session";
import * as admin from "@/server/services/admin";
import { ServiceError } from "@/server/services/lesson-run";

type Actor = { id: string; role: string };

async function run(back: string, fn: (a: Actor) => Promise<string | void>): Promise<never> {
  const user = await requireRole("admin", "content_editor");
  let error: string | null = null;
  let to: string | void = undefined;
  try {
    to = await fn({ id: user.id, role: user.role });
  } catch (e) {
    if (e instanceof ServiceError) error = e.message;
    else throw e;
  }
  revalidatePath("/admin", "layout");
  revalidatePath("/learn");
  revalidatePath("/practice");
  const sep = back.includes("?") ? "&" : "?";
  if (error) redirect(`${back}${sep}error=${encodeURIComponent(error)}`);
  redirect(`${to ?? back}${(to ?? back).includes("?") ? "&" : "?"}saved=1`);
}
const s = (f: FormData, k: string) => String(f.get(k) ?? "");
const on = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "1";
const idOrNull = (f: FormData, k: string) => s(f, k) || null;

// users
export async function setRoleAction(f: FormData) {
  await run("/admin/users", (a) => admin.setUserRole(a, s(f, "userId"), s(f, "role")));
}
export async function setActiveAction(f: FormData) {
  await run("/admin/users", (a) => admin.setUserActive(a, s(f, "userId"), s(f, "active") === "1"));
}

// curriculum
export async function saveWorldAction(f: FormData) {
  await run("/admin/content", async (a) => {
    await admin.saveWorld(a, idOrNull(f, "id"), { title: s(f, "title"), description: s(f, "description"), icon: s(f, "icon"), color: s(f, "color"), published: on(f, "published") });
  });
}
export async function saveUnitAction(f: FormData) {
  await run("/admin/content", async (a) => {
    await admin.saveUnit(a, idOrNull(f, "id"), s(f, "worldId"), { title: s(f, "title"), description: s(f, "description"), icon: s(f, "icon"), published: on(f, "published") });
  });
}
export async function saveLessonAction(f: FormData) {
  const id = idOrNull(f, "id");
  const back = id ? `/admin/content/lesson/${id}` : `/admin/content/lesson/new?unit=${s(f, "unitId")}`;
  await run(back, async (a) => {
    const newId = await admin.saveLesson(a, id, s(f, "unitId"), {
      title: s(f, "title"), summary: s(f, "summary"), concept: s(f, "concept"), explanation: s(f, "explanation"), syntax: s(f, "syntax"),
      exampleCode: s(f, "exampleCode"), exampleOutput: s(f, "exampleOutput"), exampleNote: s(f, "exampleNote"), mistakes: s(f, "mistakes"), xpReward: s(f, "xpReward"), published: on(f, "published"),
    });
    return `/admin/content/lesson/${newId}`;
  });
}
export async function nodeAction(f: FormData) {
  const kind = s(f, "kind") as "world" | "unit" | "lesson";
  const op = s(f, "op");
  const id = s(f, "id");
  await run("/admin/content", async (a) => {
    if (op === "delete") await admin.deleteNode(a, kind, id);
    else if (op === "publish" || op === "unpublish") await admin.setPublished(a, kind, id, op === "publish");
    else if (op === "up" || op === "down") await admin.moveNode(a, kind, id, op);
    else throw new ServiceError("Unknown operation", 400);
  });
}
export async function saveQuestionAction(f: FormData) {
  const lessonId = s(f, "lessonId");
  await run(`/admin/content/lesson/${lessonId}`, async (a) => {
    await admin.saveQuestion(a, idOrNull(f, "id"), lessonId, {
      type: s(f, "type"), prompt: s(f, "prompt"), code: s(f, "code"), explanation: s(f, "explanation"), items: s(f, "items"), right: s(f, "right"),
      correct: s(f, "correct"), accepted: s(f, "accepted"), order: s(f, "order"), pairs: s(f, "pairs"), bank: s(f, "bank"), xp: s(f, "xp"),
    });
  });
}
export async function deleteQuestionAction(f: FormData) {
  await run(`/admin/content/lesson/${s(f, "lessonId")}`, (a) => admin.deleteQuestion(a, s(f, "id")));
}

// problems
export async function saveProblemAction(f: FormData) {
  const id = idOrNull(f, "id");
  await run(id ? `/admin/problems/${id}` : "/admin/problems/new", async (a) => {
    const newId = await admin.saveProblem(a, id, {
      title: s(f, "title"), statement: s(f, "statement"), inputFormat: s(f, "inputFormat"), outputFormat: s(f, "outputFormat"), constraints: s(f, "constraints"),
      difficulty: s(f, "difficulty"), rating: s(f, "rating"), tags: s(f, "tags"), timeLimitMs: s(f, "timeLimitMs"), memoryLimitMb: s(f, "memoryLimitMb"),
      sampleInput: s(f, "sampleInput"), sampleOutput: s(f, "sampleOutput"), hint1: s(f, "hint1"), hint2: s(f, "hint2"), hint3: s(f, "hint3"),
      editorial: s(f, "editorial"), referenceSolution: s(f, "referenceSolution"), estimatedMinutes: s(f, "estimatedMinutes"), published: false,
      primarySkill: s(f, "primarySkill"), approach: s(f, "approach"), timeComplexity: s(f, "timeComplexity"), spaceComplexity: s(f, "spaceComplexity"),
      commonMistakes: s(f, "commonMistakes"), prerequisites: s(f, "prerequisites"),
    });
    return `/admin/problems/${newId}`;
  });
}
export async function publishProblemAction(f: FormData) {
  const id = s(f, "id");
  await run(`/admin/problems/${id}`, (a) => admin.setProblemPublished(a, id, s(f, "publish") === "1"));
}

/** Test cases come from pasted text (blocks separated by a line with `---`) or uploaded .in/.out file pairs. */
export async function addTestsAction(f: FormData) {
  const id = s(f, "id");
  await run(`/admin/problems/${id}`, async (a) => {
    const cases: Array<{ input: string; expected: string }> = [];
    const files = f.getAll("files").filter((x): x is File => x instanceof File && x.size > 0);
    if (files.length) {
      if (files.length > 200) throw new ServiceError("Upload at most 100 pairs at a time", 400);
      const byBase = new Map<string, { in?: string; out?: string }>();
      for (const file of files) {
        if (file.size > 1_000_000) throw new ServiceError(`${file.name} is larger than 1 MB`, 413);
        const m = /^(.*)\.(in|out|ans|txt)$/i.exec(file.name);
        if (!m) throw new ServiceError(`${file.name}: use .in and .out (or .ans) file names`, 400);
        const key = m[1]!;
        const slot = byBase.get(key) ?? {};
        const body = await file.text();
        if (m[2]!.toLowerCase() === "in") slot.in = body;
        else slot.out = body;
        byBase.set(key, slot);
      }
      for (const [name, p] of [...byBase.entries()].sort(([x], [y]) => x.localeCompare(y, undefined, { numeric: true }))) {
        if (p.in === undefined || p.out === undefined) throw new ServiceError(`Test "${name}" needs both a .in and an .out file`, 400);
        cases.push({ input: p.in, expected: p.out });
      }
    }
    const pasted = s(f, "pasted").trim();
    if (pasted) {
      for (const block of pasted.split(/^\s*---\s*$/m)) {
        const [input = "", expected = ""] = block.split(/^\s*===\s*$/m);
        if (input.trim() || expected.trim()) cases.push({ input: input.replace(/^\r?\n/, ""), expected: expected.replace(/^\r?\n/, "") });
      }
    }
    await admin.addTestCases(a, id, cases, { replace: on(f, "replace") });
  });
}
export async function deleteTestAction(f: FormData) {
  await run(`/admin/problems/${s(f, "problemId")}`, (a) => admin.deleteTestCase(a, s(f, "id")));
}

// contests
export async function saveContestAction(f: FormData) {
  const id = idOrNull(f, "id");
  await run("/admin/contests", async (a) => {
    await admin.saveContest(a, id, { title: s(f, "title"), description: s(f, "description"), startsAt: /^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(s(f, "startsAt")) ? `${s(f, "startsAt")}:00Z` : s(f, "startsAt"), durationMin: s(f, "durationMin"), problems: s(f, "problems"), published: on(f, "published") });
  });
}
export async function deleteContestAction(f: FormData) {
  await run("/admin/contests", (a) => admin.deleteContest(a, s(f, "id")));
}

// settings
export async function saveXpRulesAction(f: FormData) {
  await run("/admin/settings", (a) => {
    const problem: Record<string, number> = {};
    for (const d of ["newbie", "easy", "medium", "hard", "expert"]) problem[d] = Number(s(f, `p_${d}`));
    const streakMilestones: Record<string, number> = {};
    for (const line of s(f, "streaks").split(/\r?\n/)) {
      const m = /^\s*(\d+)\s*[:=,]\s*(\d+)\s*$/.exec(line);
      if (line.trim() && !m) throw new ServiceError(`Streak line "${line.trim()}" must look like 7:25`, 400);
      if (m) streakMilestones[m[1]!] = Number(m[2]);
    }
    return admin.updateXpRules(a, { perfectBonus: Number(s(f, "perfectBonus")), problem, streakMilestones });
  });
}
export async function toggleQuestAction(f: FormData) {
  await run("/admin/settings", (a) => admin.setQuestActive(a, s(f, "id"), s(f, "active") === "1"));
}
export async function toggleAchievementAction(f: FormData) {
  await run("/admin/settings", (a) => admin.setAchievementActive(a, s(f, "id"), s(f, "active") === "1"));
}
