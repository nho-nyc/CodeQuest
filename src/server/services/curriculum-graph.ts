/**
 * Pure prerequisite-graph logic (no database): which units/lessons are open given what is completed.
 *
 *  - A unit is MASTERED when every required lesson (kind "lesson" and "assessment") is complete.
 *    Optional "checkpoint" lessons never gate anything.
 *  - A unit is OPEN when all its prerequisite units are mastered. Units with no declared prerequisites
 *    depend on the unit before them in curriculum order (the first unit is always open).
 *  - A lesson is unlocked when its unit is open and every earlier required lesson of the unit is complete.
 *    A checkpoint is unlocked once all required lessons of its unit are complete.
 */
export type GraphLesson = { id: string; kind: string };
export type GraphUnit = { id: string; slug: string; title: string; prerequisites: string[]; lessons: GraphLesson[] };

export type UnitGate = {
  unitId: string;
  prerequisiteIds: string[];
  /** Prerequisite units that are not mastered yet. */
  missingIds: string[];
  open: boolean;
};

const required = (l: GraphLesson) => l.kind !== "checkpoint";

export function isUnitMastered(u: GraphUnit, done: ReadonlySet<string>): boolean {
  // A unit with nothing required (e.g. all lessons unpublished) cannot hold anyone back.
  return u.lessons.filter(required).every((l) => done.has(l.id));
}

/** Units in global curriculum order. */
export function resolveGates(units: GraphUnit[], done: ReadonlySet<string>): Map<string, UnitGate> {
  const bySlug = new Map(units.map((u) => [u.slug, u]));
  const gates = new Map<string, UnitGate>();
  units.forEach((u, i) => {
    let prereq = u.prerequisites.map((s) => bySlug.get(s)).filter((p): p is GraphUnit => !!p && p.id !== u.id);
    if (prereq.length === 0 && i > 0) prereq = [units[i - 1]!];
    const missing = prereq.filter((p) => !isUnitMastered(p, done));
    gates.set(u.id, { unitId: u.id, prerequisiteIds: prereq.map((p) => p.id), missingIds: missing.map((p) => p.id), open: missing.length === 0 });
  });
  return gates;
}

export function isLessonUnlockedIn(units: GraphUnit[], done: ReadonlySet<string>, lessonId: string): boolean {
  const gates = resolveGates(units, done);
  for (const u of units) {
    const idx = u.lessons.findIndex((l) => l.id === lessonId);
    if (idx === -1) continue;
    if (!gates.get(u.id)!.open) return false;
    const lesson = u.lessons[idx]!;
    if (!required(lesson)) return u.lessons.filter(required).every((l) => done.has(l.id));
    return u.lessons.slice(0, idx).filter(required).every((l) => done.has(l.id));
  }
  return false;
}

/** Human-readable reason a unit is closed (null when open). */
export function lockedReason(units: GraphUnit[], gate: UnitGate): string | null {
  if (gate.open) return null;
  const names = gate.missingIds.map((id) => units.find((u) => u.id === id)?.title ?? "a previous unit");
  return `Finish ${names.join(" and ")} first (lessons and the unit assessment).`;
}

/** Throws a descriptive error if the declared prerequisites contain a cycle, an unknown slug or a forward reference. */
export function validateGraph(units: Array<{ slug: string; prerequisites: string[] }>): string[] {
  const errors: string[] = [];
  const order = new Map(units.map((u, i) => [u.slug, i]));
  for (const u of units) {
    for (const p of u.prerequisites) {
      if (!order.has(p)) errors.push(`${u.slug}: unknown prerequisite "${p}"`);
      else if (order.get(p)! >= order.get(u.slug)!) errors.push(`${u.slug}: prerequisite "${p}" does not come earlier`);
    }
  }
  return errors;
}

/** Depth = length of the longest prerequisite chain below a unit (roots are 0). Used to lay out the skill map. */
export function unitDepths(units: Array<{ slug: string; prerequisites: Array<{ slug: string }> }>): Map<string, number> {
  const bySlug = new Map(units.map((u) => [u.slug, u]));
  const memo = new Map<string, number>();
  const depth = (slug: string, seen: Set<string>): number => {
    if (memo.has(slug)) return memo.get(slug)!;
    if (seen.has(slug)) return 0;
    seen.add(slug);
    const u = bySlug.get(slug);
    const d = !u || u.prerequisites.length === 0 ? 0 : 1 + Math.max(...u.prerequisites.map((p) => depth(p.slug, seen)));
    memo.set(slug, d);
    return d;
  };
  units.forEach((u) => depth(u.slug, new Set()));
  return memo;
}

/**
 * Grid positions for the skill map: column = prerequisite depth, row chosen near the average row of the unit's
 * prerequisites so that dependency lines stay short and mostly horizontal. Units must be in curriculum order.
 */
export function layoutUnits(units: Array<{ slug: string; prerequisites: Array<{ slug: string }> }>): Map<string, { col: number; row: number }> {
  const depths = unitDepths(units);
  const maxCol = Math.max(0, ...depths.values());
  const pos = new Map<string, { col: number; row: number }>();
  for (let col = 0; col <= maxCol; col++) {
    const inCol = units.filter((u) => depths.get(u.slug) === col);
    const wanted = inCol.map((u, i) => {
      const rows = u.prerequisites.map((p) => pos.get(p.slug)?.row).filter((r): r is number => r !== undefined);
      return { u, want: rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : i, order: i };
    });
    wanted.sort((a, b) => a.want - b.want || a.order - b.order);
    let last = -1;
    for (const { u, want } of wanted) {
      const row = Math.max(Math.round(want), last + 1);
      pos.set(u.slug, { col, row });
      last = row;
    }
  }
  return pos;
}
