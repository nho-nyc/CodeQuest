import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * CodeQuest MVP schema (Phase 1).
 *
 * Design notes:
 * - XP is never stored as a free-floating number only: every change goes through
 *   `xp_transactions` (a ledger) and `user_stats.total_xp` is a cache updated in the
 *   same DB transaction. `(user_id, idempotency_key)` is unique, so the same reward
 *   cannot be granted twice (anti XP-spam).
 * - Question payloads live in JSONB (`data` visible to the client, `answer` server-only)
 *   so new question types can be added without a migration.
 */

export const userRole = pgEnum("user_role", ["user", "content_editor", "admin"]);
export const runStatus = pgEnum("run_status", ["in_progress", "completed", "abandoned"]);
export const difficulty = pgEnum("difficulty", ["newbie", "easy", "medium", "hard", "expert"]);
export const verdict = pgEnum("verdict", [
  "pending",
  "judging",
  "accepted",
  "wrong_answer",
  "time_limit_exceeded",
  "memory_limit_exceeded",
  "compilation_error",
  "runtime_error",
  "internal_error",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ───────────────────────── Users & auth ─────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    avatarColor: text("avatar_color").notNull().default("#58CC02"),
    role: userRole("role").notNull().default("user"),
    timezone: text("timezone").notNull().default("UTC"),
    // Onboarding answers
    onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
    knowsProgramming: text("knows_programming"),
    knowsCpp: text("knows_cpp"),
    goal: text("goal"),
    dailyMinutes: integer("daily_minutes").notNull().default(10),
    selfLevel: text("self_level"),
    recommendedWorldSlug: text("recommended_world_slug"),
    /** Privacy: appear on the public leaderboards. */
    showOnLeaderboard: boolean("show_on_leaderboard").notNull().default(true),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("users_email_uq").on(t.email),
    uniqueIndex("users_username_uq").on(t.username),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("sessions_token_hash_uq").on(t.tokenHash), index("sessions_user_idx").on(t.userId)],
);

// ───────────────────────── Curriculum ─────────────────────────

export const worlds = pgTable(
  "worlds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull().default("Rocket"),
    color: text("color").notNull().default("#58CC02"),
    position: integer("position").notNull(),
    published: boolean("published").notNull().default(false),
    /** Edited in the admin CMS: `npm run db:seed` leaves locked rows alone so edits are never overwritten. */
    locked: boolean("locked").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("worlds_slug_uq").on(t.slug), index("worlds_position_idx").on(t.position)],
);

export const units = pgTable(
  "units",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    worldId: uuid("world_id")
      .notNull()
      .references(() => worlds.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    icon: text("icon").notNull().default("BookOpen"),
    position: integer("position").notNull(),
    published: boolean("published").notNull().default(false),
    /** What a learner can do after this unit (shown on the Learning Path). */
    objectives: jsonb("objectives").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** Slugs of units that must be completed first. Empty = the previous unit in curriculum order. */
    prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** Slugs of practice problems that apply this unit's skills. */
    practice: jsonb("practice").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    /** Edited in the admin CMS: `npm run db:seed` leaves locked rows alone so edits are never overwritten. */
    locked: boolean("locked").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("units_world_slug_uq").on(t.worldId, t.slug),
    index("units_world_pos_idx").on(t.worldId, t.position),
  ],
);

export type LessonContent = {
  concept: string;
  explanation: string[];
  syntax?: string;
  example?: { code: string; output: string; note?: string };
  commonMistakes?: string[];
};

export const lessons = pgTable(
  "lessons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    position: integer("position").notNull(),
    content: jsonb("content").$type<LessonContent>().notNull(),
    xpReward: integer("xp_reward").notNull().default(20),
    /** "lesson" or "assessment" (the unit checkpoint, always last in its unit). */
    kind: text("kind").notNull().default("lesson"),
    published: boolean("published").notNull().default(true),
    /** Edited in the admin CMS: `npm run db:seed` leaves locked rows alone so edits are never overwritten. */
    locked: boolean("locked").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("lessons_unit_slug_uq").on(t.unitId, t.slug),
    index("lessons_unit_pos_idx").on(t.unitId, t.position),
  ],
);

export const lessonQuestions = pgTable(
  "lesson_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** multiple_choice | true_false | fill_blank | predict_output | find_bug | arrange_code | match_concept */
    type: text("type").notNull(),
    prompt: text("prompt").notNull(),
    code: text("code"),
    /** Client-visible, type-specific payload (options, line list...). Never contains the answer. */
    data: jsonb("data").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    /** Server-only. Never serialised to the client before the question is answered. */
    answer: jsonb("answer").$type<Record<string, unknown>>().notNull(),
    explanation: text("explanation").notNull(),
    xp: integer("xp").notNull().default(2),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("lesson_questions_pos_uq").on(t.lessonId, t.position)],
);

// ───────────────────────── Learner progress ─────────────────────────

export const lessonRuns = pgTable(
  "lesson_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    status: runStatus("status").notNull().default("in_progress"),
    mistakes: integer("mistakes").notNull().default(0),
    xpAwarded: integer("xp_awarded").notNull().default(0),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("lesson_runs_user_lesson_idx").on(t.userId, t.lessonId),
    // At most one in-progress run per user+lesson (resume after reload).
    uniqueIndex("lesson_runs_active_uq")
      .on(t.userId, t.lessonId)
      .where(sql`${t.status} = 'in_progress'`),
  ],
);

export const userQuestionAttempts = pgTable(
  "user_question_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => lessonRuns.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => lessonQuestions.id, { onDelete: "cascade" }),
    isCorrect: boolean("is_correct").notNull(),
    response: jsonb("response").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("attempts_run_idx").on(t.runId), index("attempts_user_question_idx").on(t.userId, t.questionId)],
);

export const userLessonProgress = pgTable(
  "user_lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessons.id, { onDelete: "cascade" }),
    completions: integer("completions").notNull().default(0),
    bestMistakes: integer("best_mistakes"),
    perfected: boolean("perfected").notNull().default(false),
    firstCompletedAt: timestamp("first_completed_at", { withTimezone: true }),
    lastCompletedAt: timestamp("last_completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("progress_user_lesson_uq").on(t.userId, t.lessonId)],
);

// ───────────────────────── Gamification ─────────────────────────

export const userStats = pgTable("user_stats", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Cache of SUM(xp_transactions.amount). Only ever changed together with a ledger row. */
  totalXp: integer("total_xp").notNull().default(0),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  /** Local calendar day (user timezone) of the last learning activity, YYYY-MM-DD. */
  lastActiveDate: date("last_active_date", { mode: "string" }),
  lessonsCompleted: integer("lessons_completed").notNull().default(0),
  /** Stored hearts at `heartsUpdatedAt`. Regeneration is computed lazily (see features/gamification/hearts). */
  hearts: integer("hearts").notNull().default(5),
  heartsUpdatedAt: timestamp("hearts_updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const xpTransactions = pgTable(
  "xp_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    reason: text("reason").notNull(),
    refType: text("ref_type"),
    refId: uuid("ref_id"),
    idempotencyKey: text("idempotency_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("xp_user_idem_uq").on(t.userId, t.idempotencyKey),
    index("xp_user_created_idx").on(t.userId, t.createdAt),
    index("xp_created_idx").on(t.createdAt),
  ],
);

export const userActivity = pgTable(
  "user_activity",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Local calendar day in the user's timezone. */
    day: date("day", { mode: "string" }).notNull(),
    xp: integer("xp").notNull().default(0),
    lessons: integer("lessons").notNull().default(0),
    questions: integer("questions").notNull().default(0),
  },
  (t) => [uniqueIndex("activity_user_day_uq").on(t.userId, t.day)],
);

// ───────────────────────── Competitive programming ─────────────────────────

export type ProblemSample = { input: string; output: string; explanation?: string };

/**
 * Teaching metadata that is not derivable from the other columns. Topics stay in `tags`; difficulty stays in `difficulty`/`rating`.
 * Every field is optional in the database (old rows hold `{}`); readers must go through `parseProblemMeta`.
 */
export type ProblemMetaJson = {
  /** The main technique: must be one of the problem's tags. */
  primarySkill?: string;
  /** One sentence describing the intended approach. Shown only after the learner solves the problem. */
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  commonMistakes?: string[];
  /** Curriculum unit slugs worth knowing first. When absent they are derived from the tags. */
  prerequisites?: string[];
};

export const problems = pgTable(
  "problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    statement: text("statement").notNull(),
    inputFormat: text("input_format").notNull(),
    outputFormat: text("output_format").notNull(),
    constraints: text("constraints").notNull(),
    difficulty: difficulty("difficulty").notNull(),
    /** Reference Codeforces-style rating (800..2000+). Informational only. */
    rating: integer("rating").notNull(),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
    timeLimitMs: integer("time_limit_ms").notNull().default(1000),
    memoryLimitMb: integer("memory_limit_mb").notNull().default(256),
    samples: jsonb("samples").$type<ProblemSample[]>().notNull(),
    /** Exactly 3 hints, revealed one at a time on request. */
    hints: jsonb("hints").$type<string[]>().notNull(),
    /** Shown only after the learner has solved the problem. */
    editorial: text("editorial").notNull(),
    /** Shown only after the learner has solved the problem. */
    referenceSolution: text("reference_solution").notNull(),
    estimatedMinutes: integer("estimated_minutes").notNull().default(15),
    meta: jsonb("meta").$type<ProblemMetaJson>().notNull().default(sql`'{}'::jsonb`),
    published: boolean("published").notNull().default(true),
    /** Edited in the admin CMS: `npm run db:seed` leaves locked rows alone so edits are never overwritten. */
    locked: boolean("locked").notNull().default(false),
    ...timestamps,
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("problems_slug_uq").on(t.slug), index("problems_difficulty_idx").on(t.difficulty, t.rating)],
);

export const problemTestCases = pgTable(
  "problem_test_cases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    /** Server-only. Hidden test data is never serialised to the client. */
    input: text("input").notNull(),
    expectedOutput: text("expected_output").notNull(),
    isSample: boolean("is_sample").notNull().default(false),
  },
  (t) => [uniqueIndex("test_cases_problem_pos_uq").on(t.problemId, t.position)],
);

// ───────────────────────── Contests (Phase 4) ─────────────────────────

export const contests = pgTable(
  "contests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    durationMin: integer("duration_min").notNull(),
    published: boolean("published").notNull().default(true),
    /** Set once rating changes were computed for this contest (exactly once). */
    ratedAt: timestamp("rated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("contests_starts_idx").on(t.startsAt)],
);

export const contestProblems = pgTable(
  "contest_problems",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contestId: uuid("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    /** A, B, C... */
    label: text("label").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [uniqueIndex("contest_problem_label_uq").on(t.contestId, t.label), uniqueIndex("contest_problem_uq").on(t.contestId, t.problemId)],
);

/**
 * mode "live": took part in the official time window (rated, official scoreboard)
 * mode "virtual": replayed an old contest in a personal window of the same length (not rated)
 * mode "practice": untimed practice on a finished contest (not rated, not on any scoreboard)
 */
export const contestParticipants = pgTable(
  "contest_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contestId: uuid("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mode: text("mode").notNull(),
    /** Virtual: when the personal window started. Otherwise the registration time. */
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("contest_participant_uq").on(t.contestId, t.userId, t.mode)],
);

export const userRatings = pgTable("user_ratings", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  rating: integer("rating").notNull().default(1500),
  peak: integer("peak").notNull().default(1500),
  contestsRated: integer("contests_rated").notNull().default(0),
});

export const ratingChanges = pgTable(
  "rating_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contestId: uuid("contest_id")
      .notNull()
      .references(() => contests.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
    oldRating: integer("old_rating").notNull(),
    newRating: integer("new_rating").notNull(),
  },
  (t) => [uniqueIndex("rating_change_uq").on(t.contestId, t.userId)],
);

// ───────────────────────── Spaced repetition (Phase 4) ─────────────────────────

export const questionReviews = pgTable(
  "question_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => lessonQuestions.id, { onDelete: "cascade" }),
    /** Ease factor x1000 (2500 = 2.5). */
    easeMilli: integer("ease_milli").notNull().default(2500),
    intervalDays: integer("interval_days").notNull().default(0),
    repetitions: integer("repetitions").notNull().default(0),
    lapses: integer("lapses").notNull().default(0),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    lastReviewedAt: timestamp("last_reviewed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("review_user_question_uq").on(t.userId, t.questionId), index("review_user_due_idx").on(t.userId, t.dueAt)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    sourceCode: text("source_code").notNull(),
    verdict: verdict("verdict").notNull().default("pending"),
    timeMs: integer("time_ms"),
    memoryKb: integer("memory_kb"),
    testsPassed: integer("tests_passed").notNull().default(0),
    testsTotal: integer("tests_total").notNull().default(0),
    /** 1-based index of the first failing test (never its content). */
    failedTest: integer("failed_test"),
    compileOutput: text("compile_output"),
    /** Set when the submission was made inside a contest (live, virtual or practice). */
    contestParticipantId: uuid("contest_participant_id").references(() => contestParticipants.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    judgedAt: timestamp("judged_at", { withTimezone: true }),
  },
  (t) => [
    index("submissions_participant_idx").on(t.contestParticipantId),
    index("submissions_user_problem_idx").on(t.userId, t.problemId, t.createdAt),
    index("submissions_problem_verdict_idx").on(t.problemId, t.verdict),
    index("submissions_user_created_idx").on(t.userId, t.createdAt),
  ],
);

export const userProblemProgress = pgTable(
  "user_problem_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    problemId: uuid("problem_id")
      .notNull()
      .references(() => problems.id, { onDelete: "cascade" }),
    attempts: integer("attempts").notNull().default(0),
    /** Highest hint level revealed (0..3). */
    hintsUsed: integer("hints_used").notNull().default(0),
    solved: boolean("solved").notNull().default(false),
    solvedAt: timestamp("solved_at", { withTimezone: true }),
    solvedWithoutHints: boolean("solved_without_hints").notNull().default(false),
  },
  (t) => [uniqueIndex("problem_progress_uq").on(t.userId, t.problemId), index("problem_progress_user_idx").on(t.userId, t.solved)],
);

// ───────────────────────── Gamification (Phase 3) ─────────────────────────

export const dailyQuests = pgTable("daily_quests", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  /** What is counted: see QUEST_METRICS in src/content/gamification.ts */
  metric: text("metric").notNull(),
  target: integer("target").notNull(),
  rewardXp: integer("reward_xp").notNull().default(25),
  icon: text("icon").notNull().default("Target"),
  active: boolean("active").notNull().default(true),
});

/** A quest assigned to a user for one local day. Deadline = end of that local day. */
export const userQuests = pgTable(
  "user_quests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questId: uuid("quest_id")
      .notNull()
      .references(() => dailyQuests.id, { onDelete: "cascade" }),
    day: date("day", { mode: "string" }).notNull(),
    progress: integer("progress").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("user_quest_day_uq").on(t.userId, t.questId, t.day), index("user_quest_user_day_idx").on(t.userId, t.day)],
);

export const achievements = pgTable("achievements", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("Medal"),
  /** Which counter is compared with `threshold`: see ACHIEVEMENT_METRICS in src/content/gamification.ts */
  metric: text("metric").notNull(),
  threshold: integer("threshold").notNull(),
  rewardXp: integer("reward_xp").notNull().default(0),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const userAchievements = pgTable(
  "user_achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: uuid("achievement_id")
      .notNull()
      .references(() => achievements.id, { onDelete: "cascade" }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_achievement_uq").on(t.userId, t.achievementId)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_created_idx").on(t.userId, t.createdAt)],
);

// ───────────────────────── Platform (Phase 5) ─────────────────────────

/** Admin-editable configuration (XP rules, heart regeneration...). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Every change made through the admin area. */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_created_idx").on(t.createdAt)],
);

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** pending | accepted */
    status: text("status").notNull().default("pending"),
    /** The two user ids sorted and joined, so a pair can only exist once in either direction. */
    pairKey: text("pair_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("friendship_pair_uq").on(t.pairKey), index("friendship_addressee_idx").on(t.addresseeId, t.status)],
);

export const studyGroups = pgTable(
  "study_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    inviteCode: text("invite_code").notNull(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("study_group_code_uq").on(t.inviteCode)],
);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => studyGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("group_member_uq").on(t.groupId, t.userId), index("group_member_user_idx").on(t.userId)],
);

/** A discussion thread attached to a problem or a lesson. Replies live in discussion_posts. */
export const discussionThreads = pgTable(
  "discussion_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** "problem" | "lesson" */
    scopeType: text("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("thread_scope_idx").on(t.scopeType, t.scopeId, t.createdAt)],
);

export const discussionPosts = pgTable(
  "discussion_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => discussionThreads.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("post_thread_idx").on(t.threadId, t.createdAt)],
);

// ───────────────────────── Relations ─────────────────────────

export const worldsRelations = relations(worlds, ({ many }) => ({ units: many(units) }));
export const unitsRelations = relations(units, ({ one, many }) => ({
  world: one(worlds, { fields: [units.worldId], references: [worlds.id] }),
  lessons: many(lessons),
}));
export const lessonsRelations = relations(lessons, ({ one, many }) => ({
  unit: one(units, { fields: [lessons.unitId], references: [units.id] }),
  questions: many(lessonQuestions),
}));
export const lessonQuestionsRelations = relations(lessonQuestions, ({ one }) => ({
  lesson: one(lessons, { fields: [lessonQuestions.lessonId], references: [lessons.id] }),
}));

export type User = typeof users.$inferSelect;
export type World = typeof worlds.$inferSelect;
export type Unit = typeof units.$inferSelect;
export type Lesson = typeof lessons.$inferSelect;
export type LessonQuestion = typeof lessonQuestions.$inferSelect;
export type DailyQuest = typeof dailyQuests.$inferSelect;
export type Achievement = typeof achievements.$inferSelect;
export type Contest = typeof contests.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Problem = typeof problems.$inferSelect;
export type Submission = typeof submissions.$inferSelect;

// ───────────────────────── Skip-ahead tests ─────────────────────────

/** One attempt at "testing out" of a unit. A unit counts as skipped once an attempt has `passed = true`. */
export const skipAttempts = pgTable(
  "skip_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    unitId: uuid("unit_id")
      .notNull()
      .references(() => units.id, { onDelete: "cascade" }),
    /** The questions drawn for this attempt, in display order. */
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    score: integer("score"),
    total: integer("total").notNull(),
    passed: boolean("passed").notNull().default(false),
  },
  (t) => [index("skip_user_unit_idx").on(t.userId, t.unitId, t.startedAt)],
);

/** Skill placement test attempts. Purely advisory: nothing here changes lessons, XP, hearts or unlocks. */
export type PlacementSkillResult = { skillId: string; correct: number; unknown: number; total: number };
export const placementAttempts = pgTable(
  "placement_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** The questions drawn for this attempt, in display order. */
    questionIds: jsonb("question_ids").$type<string[]>().notNull(),
    /** Which skill each drawn question belongs to (same order as questionIds). */
    skillIds: jsonb("skill_ids").$type<string[]>().notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    /** Per-skill tallies, set on submit. */
    result: jsonb("result").$type<PlacementSkillResult[]>(),
  },
  (t) => [index("placement_user_idx").on(t.userId, t.startedAt)],
);
