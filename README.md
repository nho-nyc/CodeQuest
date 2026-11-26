# CodeQuest

https://code-quest-seven-lake.vercel.app/dashboard

> Learn C++. Think Algorithmically. Become a Problem Solver.

CodeQuest is a Duolingo-style web app for learning C++ and, eventually, competitive programming. This repository contains **Phase 1 (MVP)**, **Phase 2 (coding practice)** and **Phase 3 (gamification)**, **Phase 4 (advanced CP)** and **Phase 5 (admin CMS, social, mobile, performance)**.

## Status: what is real and what is not

**Implemented and tested against a real PostgreSQL database**

| Area | Notes |
| --- | --- |
| Landing page | Shows the real curriculum read from the database. No fake testimonials. |
| Auth | Sign up, log in, log out. bcrypt hashes, hashed server-side sessions, httpOnly cookie, rate limiting. |
| Onboarding | 5 questions, skippable, stores a recommended world. |
| Dashboard | Continue Learning, level, daily goal, 7-day chart, recent activity. All from the database. |
| Learning Path | Skill-tree map. States: locked / available / in progress / completed / perfected. |
| Lesson engine | 7 question types, immediate feedback, explanations, missed questions return at the end. Progress survives reloads and logout. Grading happens **on the server**; answers are never sent to the browser. |
| XP | Append-only `xp_transactions` ledger with idempotency keys. `user_stats.total_xp` is only a cache written in the same transaction. Replaying a lesson cannot farm XP. |
| Levels | 100-level curve with the titles from the spec. |
| Streaks | Per-user local calendar day (timezone captured at sign-up), milestone bonuses. |
| Profile | Stats and an activity calendar. |
| Practice (Phase 2) | `/practice` list with difficulty/topic/status/search filters, and a workspace with a self-hosted Monaco editor (C++17/20, font size, reset, Ctrl+Enter run, Ctrl+Shift+Enter submit, local draft). **17 problems**, 229 tests, hints revealed 1 to 3, editorial and reference solution only after solving. Run checks samples (plus optional custom input); Submit judges all hidden tests. Hidden tests never leave the server. First accepted solve earns XP once through the ledger. |
| Judge | Judge0 client (`src/server/judge/`). **Without `JUDGE0_URL` Run and Submit are disabled and say so; nothing is faked.** The client was tested against a Judge0-protocol fake backed by real `g++`, not against a live Judge0 server. |
| Hearts (Phase 3) | 5 hearts. A wrong answer in a **first-time** lesson costs one; one regenerates every 30 minutes (computed lazily from a timestamp, no cron). At 0 hearts nothing is lost: the run and every correct answer stay saved and the learner is offered recovery. Replaying a finished lesson is free and earns a heart back on completion. Constants in `src/features/gamification/hearts.ts` (admin-configurable in Phase 5). |
| Daily quests | **12 quest definitions**, 3 assigned per learner per day (deterministic, distinct metrics). Progress comes from real events (lessons, review answers, judged submissions, XP). Each pays +25 XP once per quest per day through the ledger. Deadline is the end of the learner's local day. |
| Achievements | **19 achievements** with real progress bars, each unlocked once and paid once. |
| Leaderboard | Daily, weekly, monthly (UTC boundaries) and all-time, ranked by XP summed from the ledger. Because rewards are idempotent, replaying finished work cannot climb the board. Shows display name, username, level and XP only. |
| Notifications | Bell with unread count, `/notifications` page. Created in the same transaction as the event (quest, achievement, level-up). |
| Activity heatmap | 17-week calendar on the profile page, from `user_activity`. |
| Contests (Phase 4) | Upcoming / live / past contests with countdown, ICPC scoring (solved, then penalty = minutes + 20 per wrong attempt), scoreboard recomputed from stored submissions, your submission history. Contest problems are hidden until the contest starts and stay locked in normal practice until it ends. Contest submissions never give XP, hints or practice progress. Time-window rules are enforced on the server. |
| Social (Phase 5) | Friends (request by username, accept/decline, auto-accept when both sides asked, remove), friends leaderboard (`/leaderboard?scope=friends`), study groups (invite code, max 50 members, 5 owned groups per user, group weekly leaderboard, owner can remove members or delete), per-problem and per-lesson discussions (threads and replies, plain text only, author or staff can delete, 8 posts per minute limit, problem discussions stay closed while the problem is in a running contest), public profiles at `/u/<username>` (XP, level, streak, solved count, achievements, rating; no email), and a privacy switch that hides you from the public leaderboards (friends and groups still see you). |
| Admin CMS (Phase 5) | `/admin`, for roles `admin` and `content_editor`. Editors manage worlds, units, lessons, questions (7 types, validated by a dry-run grade so the stored answer is consistent and never leaks to learners), problems (draft, hints, editorial, hidden test cases pasted or uploaded as `.in`/`.out` pairs, publish needs at least one hidden test), contests (editable only until someone participates). Admins also manage users (role, deactivate which signs them out), XP rules (perfect bonus, first-solve XP by difficulty, streak milestones), quest and achievement on/off switches, the audit log and see an analytics overview (users, DAU/WAU/MAU, submissions, acceptance, hardest problems). Every change is written to `audit_log`. |
| Mobile and resilience (Phase 5) | Responsive layouts checked at 375 px, web app manifest (installable to the home screen), error boundaries (`error.tsx`), `not-found`, loading skeletons. |
| Virtual / practice contests | A finished contest can be replayed once in a personal window of the same length (shows where you would have placed; not rated) or practised without a timer (not on any scoreboard). |
| Contest rating | Internal Elo-style rating (start 1500). Computed exactly once when a live contest ends (row lock + `rated_at`), only from live participants, with a notification and a ratings table. |
| Statistics | Totals, acceptance rate, weekly and monthly activity, XP over time, problems solved per day, topic and difficulty distributions, heatmap. **Study time is not tracked, so it is not shown.** |
| Topic mastery and weakness analysis | Mastery per problem tag = 60% success rate (solved vs attempted weight) + 40% coverage; lesson accuracy per unit. Text insights ("strong at X, needs practice with Y") are only generated when there is enough data, otherwise the page says so. |
| Recommendations | Unsolved, open problems ranked by difficulty fit (a bit above your median solved rating) and topic need. Shown on the dashboard and statistics page with the reason. |
| Spaced repetition | Every lesson question you answer correctly joins a review schedule (1 day, 3 days, then growing by ease; a miss retries in 10 minutes). `/review` serves only due questions, so reviews cannot be farmed. Reviews count for the streak and review quests but give no XP by themselves. |
| Content | **World 1, C++ Foundations: 6 units, 18 lessons, 101 questions.** Every code sample is compiled with `g++`, and every "predict the output" answer is checked against the real program output (`npm run content:verify`). |

**Not built yet (nothing fakes them; the UI marks them as roadmap)**

- Worlds 2 to 6 have titles only and are stored unpublished ("Coming soon").
- More than 17 practice problems (the spec asks for 30+). Nothing is ever marked "Accepted" without a real judge.
- Streak freeze (optional in the spec, not built).
- "Practice for 15 minutes" quests: time on task cannot be measured honestly, so no such quest exists.
- Google OAuth and "forgot password" (need external services: Google credentials and an email provider).
- Settings page. Light/dark theme toggle exists in the top bar.

## Deviations from the spec (and why)

- **Drizzle ORM instead of Prisma.** Prisma downloads native engine binaries from `binaries.prisma.sh` during `generate`/`migrate`. That host was blocked in the environment this was built in, so Prisma could not run. Drizzle is pure JavaScript, fully typed, uses plain SQL migrations (`drizzle/`) and is equally at home on Vercel and Supabase. The schema is in `src/server/db/schema.ts`.
- **Custom session auth instead of Auth.js.** Small, auditable and sufficient for email/password. Auth.js can be added when Google OAuth is needed.
- **Geist Mono instead of JetBrains Mono** for code, bundled through the `geist` npm package so builds work offline.
- Next.js 16 and Tailwind CSS v4 (the current releases).

## Tech stack

Next.js 16 (App Router) · TypeScript (strict) · Tailwind CSS v4 · Framer Motion · Lucide · PostgreSQL · Drizzle ORM · Zod · Vitest.

## Run locally

Requirements: Node.js 20+, PostgreSQL 14+, and `g++` only if you want to run `content:verify`.

```bash
# 1. Install
npm install

# 2. Create a database (example for a local Postgres)
sudo -u postgres psql -c "CREATE USER codequest WITH PASSWORD 'choose-a-password' CREATEDB;"
sudo -u postgres psql -c "CREATE DATABASE codequest OWNER codequest;"

# 3. Configure environment
cp .env.example .env.local
# edit .env.local and set DATABASE_URL

# 4. Create tables and load the curriculum (safe to re-run)
npm run db:setup

# 5. Start
npm run dev          # http://localhost:3000
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (no `any` allowed) |
| `npm test` | Unit tests. Integration tests run when `TEST_DATABASE_URL` is set |
| `npm run content:verify` | Compiles and runs every C++ sample and checks marked answers |
| `npm run db:generate` | Generate a SQL migration after editing the schema |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed` | Upsert curriculum, daily quests and achievements. Keeps learner progress |
| `npm run db:seed:contests` | Demo contests (one finished, one upcoming) from the problem library, dated relative to now. Only when no contest exists |
| `npm run contest:create -- <slug> "<title>" <startISO> <minutes> <problem-slug>...` | Create or update a contest (the admin UI at `/admin/contests` does the same) |
| `npm run db:seed:problems` | Compile reference solutions with `g++` and seed problems and tests (needs `g++` on the machine running it) |
| `npm run problems:verify` | Re-checks every problem's samples and tests against its reference solution |

### Integration tests

They use a real database and **truncate users**, so point them at an empty, separate database:

```bash
sudo -u postgres psql -c "CREATE DATABASE codequest_test OWNER codequest;"
TEST_DATABASE_URL=postgresql://codequest:YOUR_PASSWORD@localhost:5432/codequest_test npm test
```

## Code judging (Judge0)

Run a Judge0 CE instance (self-hosted with Docker, see the Judge0 docs) and set in `.env.local`:

```
JUDGE0_URL=http://localhost:2358
# JUDGE0_AUTH_TOKEN=...            (if your instance requires one)
# JUDGE0_RAPIDAPI_KEY / JUDGE0_RAPIDAPI_HOST  (for the RapidAPI-hosted version)
# JUDGE0_CPP17_ID=54  JUDGE0_CPP20_ID=105     (language ids, defaults shown)
```

User code is never executed in the Next.js process. Run/Submit are rate limited per user, one judging at a time per user, and a judge failure is reported as an internal error rather than a verdict. Run `npm run db:seed:problems` once after `db:setup`.

### Known gaps in Phase 4

- Contests can be created in the admin UI or with `contest:create`. Contest scoring is ICPC only.
- A user gets one virtual run per contest. People who registered but never submitted are not shown or rated.
- No Codeforces integration (the spec says it can come later; the contest tables do not depend on it).
- The statistics page has no study-time metric because time on task is not measured.
- The recommendation and mastery models are simple, documented formulas, not machine learning.

### Known gaps and deliberate deviations in Phase 3

- **Century** (solve 100 problems) can now be reached: the library has 206 problems.
- **Bug Hunter** needs 5 "find the bug" questions instead of the spec's 10, because World 1 contains only 7 such questions. Raise the threshold in `src/content/gamification.ts` when more content exists.
- Quest and achievement rewards are not counted by the "earn XP" quest, so they cannot chain into each other.
- Leaderboard usernames are visible to all signed-in learners. A privacy toggle is not built yet.

## Architecture

```
src/
  app/                 routes: (marketing), (auth), (app) dashboard/learn/profile, lesson, onboarding, api
  components/          ui (design system), layout, learning, lesson, dashboard, gamification
  features/            pure domain logic: gamification (xp, streak), learning (grader, recommend), auth
  server/              db (schema, client), services (path, lesson-run, xp, snapshot), auth, rate-limit
  content/             curriculum as typed TypeScript (world1/, roadmap.ts) + builders
scripts/               migrate, seed, verify-content
tests/                 unit + real-database integration tests
drizzle/               SQL migrations
```

Key design decisions:

- **Answers never reach the client.** `lesson_questions.data` is the public payload, `answer` is server-only. `publicData()` re-validates shapes so a bad content entry cannot leak an answer.
- **XP ledger.** Every award goes through `awardXp()` with a unique `(user_id, idempotency_key)`, for example `lesson:<id>:complete`. A second award with the same key is a no-op.
- **Lesson completion is one transaction** that locks the user's stats row, verifies every question was answered correctly, awards XP, updates streak, progress and activity.
- **Rules:** first completion earns the lesson XP; a first-time perfect run adds +10; a later perfect replay can claim the +10 once; other replays earn nothing but count for the streak.
- **Adding a question type:** add it to `QUESTION_TYPES`, to `grade()` and `publicData()` in `features/learning/grader.ts`, and add a renderer in `components/lesson/question-views.tsx`. No migration needed.
- **Adding content:** add a lesson to a unit file in `src/content/`, run `npm run content:verify`, then `npm run db:seed`.

## Security notes

- Passwords: bcrypt (cost 12). Sessions: random 256-bit token, only its SHA-256 is stored.
- All inputs validated with Zod. All SQL goes through Drizzle (parameterised).
- Security headers are set in `next.config.ts`.
- **Rate limiting is in-memory** (`src/server/rate-limit.ts`). On a multi-instance host such as Vercel it is per instance. Back it with Redis before relying on it in production.
- User code runs only inside the external Judge0 sandbox, never in the Next.js process. Hidden test cases and expected outputs are never sent to the browser.
- Secrets live only in `.env.local` (git-ignored). `.env.example` contains placeholders.

## Deploy

1. Create a managed PostgreSQL database (for example Supabase). Copy its connection string.
2. Create a Vercel project from your GitHub repository.
3. Set environment variables in Vercel: `DATABASE_URL`, `DATABASE_SSL=true`, `NEXT_PUBLIC_APP_URL`.
4. From your machine, with `DATABASE_URL` pointing at the production database, run `npm run db:setup` once. Re-run `npm run db:seed` after content changes.
5. Deploy. Pages that read the database are rendered dynamically, so the build does not need database access.

## Assumptions

- XP curve: 100 XP for level 2, each next level needs 20 XP more. Values live in `src/features/gamification/xp.ts` and are ready to move into an admin-configurable table.
- Daily XP goal comes from the onboarding "minutes per day" answer (20/40/60/80 XP).
- Lessons unlock strictly in order across the whole path.

### Phase 5 notes and known gaps

- **Roles.** New accounts are `user`. There is deliberately no sign-up path to a higher role. Promote the first admin in the database: `update users set role = 'admin' where username = '...';` Then use `/admin/users`.
- **Seed vs CMS.** Anything edited in the CMS is marked `locked`. `npm run db:seed` and `db:seed:problems` never overwrite or retire locked rows, and CMS-created content is never retired by the seed.
- **Not configurable in the CMS:** heart regeneration time (constant in code), quest and achievement titles/targets/rewards (code, re-applied by the seed; only on/off is editable), per-lesson XP is editable on the lesson. Lessons need at least one question to be playable.
- **Discussions** have no reporting queue, likes, notifications or edit; moderation is delete only. Group chat does not exist.
- **Performance.** Pages are server-rendered with indexed queries; XP rules are cached for 15 seconds per instance. No load test has been run, and there is no CDN, Redis or queue. Rate limiting for Run/Submit and auth is in memory per instance. Discussion flood control is database-backed.
- **Mobile.** The manifest makes the site installable, but there is no service worker, so there is no offline mode and no push notifications.
- Study time and "forgot password" / Google sign-in remain unbuilt (see above).

## Phase 6 notes: skip-ahead, more lessons, external practice links

- **Skip-ahead ("test out")**: every unit with at least 6 questions shows "Already know this? Test out". The test draws up to 10 questions across the unit's lessons, needs 80% to pass, costs no hearts and gives no XP, with a 30-minute cooldown after a failed attempt. Passing counts the unit's lessons as completed for unlocking; no progress rows are created, so replaying a lesson later still earns its XP once. Correct answers are only shown after passing. Migration: `drizzle/0005_skip_tests.sql`.
- **Content**: World 2 *C++ Intermediate* (arrays, strings, vectors, sorting/searching, references/pointers) and World 3 *Data Structures* (stack/queue/deque, set/map, priority_queue/pair/complexity) are now published: 41 lessons / 235 questions in total. `npm run content:verify` compiles and runs every predict-output program with g++. Worlds 4-6 are still "Coming soon".
- **External practice links** (`/practice/links`, `src/content/external-problems.ts`): CSES task ids were taken from the CSES problem set; the few Codeforces, AtCoder and VNOJ links are pages confirmed to exist. They open on the other site, are not judged by CodeQuest and give no XP. Add more by editing that file.
- On Vercel the `vercel-build` script runs the (idempotent) seed before `next build`, so every deploy loads new content into Neon. It also runs `scripts/seed-problems-lite.ts`, which adds any missing practice problems with small pre-generated test cases (no g++ needed; regenerate with `tsx scripts/gen-problem-tests.ts`). Run `npm run db:seed:problems` on a machine with g++ for the full hidden test sets. Locally run `npm run db:setup` after pulling.

## Deploying to the web (Vercel + Neon)

GitHub Pages cannot host this app (it needs a Node server and PostgreSQL). Vercel runs the app and Neon provides a free Postgres. The address will look like `https://codequest-xxxx.vercel.app`.

1. **Database.** Create a project at https://neon.tech. Copy the **pooled** connection string (host contains `-pooler`). It already ends with `?sslmode=require`.
2. **Create the tables once, from your computer.** In `.env.local` set `DATABASE_URL` to the Neon string and `DATABASE_SSL=true`, then run `npm run db:setup`. Run `npm run db:seed:problems` too if you have `g++`. Remove the Neon string from `.env.local` afterwards if you want to keep using the local database.
3. **Vercel.** Add New, Project, import the GitHub repo. Framework is detected as Next.js, keep the defaults. Under Environment Variables add:
   - `DATABASE_URL` = the Neon pooled string
   - `DATABASE_SSL` = `true`
   - `NEXT_PUBLIC_APP_URL` = your Vercel address (set it after the first deploy, then redeploy)
   - `JUDGE0_URL` and its key variables, only if you have a Judge0 server (see `.env.example`). Without them Run/Submit say "judge unavailable".
4. Deploy. Sign up on the site, then make yourself admin with the SQL in "Phase 5 notes" (run it in the Neon SQL editor).

Notes: Run and Submit are limited to 60 seconds per request on serverless. Rate limits are kept in memory per instance, so on a serverless host they are best effort, not a hard guarantee. The database pool is capped at 3 connections per instance on Vercel. Never put the database string or any key in the repository.


## Curriculum architecture (prerequisite graph)

- `src/content/curriculum-meta.ts` declares, per unit, learning **objectives**, **prerequisite units** (slugs) and **practice problems**. They are stored on `units` (migration 0006) by `npm run db:seed`.
- A unit is **mastered** when all its lessons and its assessment are done. A unit **opens** when every prerequisite unit is mastered (no declared prerequisite = the previous unit). Lessons inside a unit stay sequential. Pure logic: `src/server/services/curriculum-graph.ts`.
- Lesson kinds: `lesson`, `assessment` (required, last in the unit, gates dependents) and `checkpoint` (optional, never gates).
- Passing a skip test marks a unit mastered. XP never opens a unit.
- UI: unit cards (objectives, prerequisites, locked reason, assessment status, practice) on `/learn`, and the prerequisite map on `/learn/map`.
- Tests: `tests/curriculum-graph.test.ts` (pure), `tests/curriculum-path.test.ts` (real database).

## Content integrity & placement (notes)

- **Answer shuffle** happens deterministically at content-build time (`src/content/shuffle.ts`), so a question's stored `data.options` and `answer.index` always change together. Grading is index-based on what is stored; there is no runtime remapping.
- **Seeding** upserts by slug and now *skips lessons whose questions are unchanged* (compared field by field). Re-seeding an unchanged database therefore touches nothing. When a question really changes, `lesson_questions.updated_at` moves, and any in-flight lesson run, skip test or placement attempt that started earlier is invalidated with a `content_updated` (409) response instead of being graded against different options. The client reloads into a fresh attempt. One-time effect of the shuffle deploy: runs that were mid-way through a reshuffled lesson restart once.
- **Assessments** pass with at most 25% mistakes (minimum 1). They never use hearts; a failed attempt is marked `abandoned` and credits no XP or progress.
- **Placement test** (`/placement`) is optional and advisory. It writes only to `placement_attempts` (migration `0007`, additive, no data changes). It never unlocks units, marks lessons done, awards XP or touches hearts. Skip tests remain the only way to test out of a unit.

## Problem intelligence foundation (metadata, hints, audit)

- **Where things live.** Topics stay in `problems.tags` (canonical, see `src/content/problems/tags.ts`), difficulty in `difficulty`/`rating`. The only new column is `problems.meta` (jsonb, default `{}`, migration `0008`, additive): `primarySkill` (one of the tags), `approach`, `timeComplexity`, `spaceComplexity`, `commonMistakes` (1-4) and optional `prerequisites` (curriculum unit slugs). When `prerequisites` is absent they are derived from the tags through `TAG_TO_UNIT`, so every problem gets a "Good to know first" line without per-problem work.
- **Hand-written, not generated.** `src/content/problems/meta-data.ts` holds reviewed entries (every curriculum practice problem except the trivial first one). Problems without an entry simply show less; invalid stored metadata is ignored by `parseProblemMeta`, never rendered half-way. Tests check each entry against the problem's tags, its editorial's stated complexity and the curriculum.
- **Spoilers.** The main skill and prerequisites show before solving. Approach, expected complexity and common mistakes appear only in the Editorial tab after the learner solves the problem, and never inside contests.
- **Hints.** Every problem has exactly three, labelled 1 Understand, 2 Algorithmic direction, 3 Implementation. `validateHints` enforces the structure (length, distinct, no code in hints 1-2) for the seed bank and the CMS; whether a hint leaks too much still needs a human (see `npm run problems:audit`, which only flags).
- **CMS.** The problem form has a "Teaching metadata" block. All blank = no metadata; otherwise every field except prerequisites is required and validated, and tags are normalised.
- **Shipping content changes without re-seeding tests.** `npm run db:sync:problem-meta` (`--dry` to preview) updates only tags, difficulty/rating, hints and metadata of existing, unlocked problems. It never touches statements, test cases, submissions or progress, and skips CMS-edited rows. The full `db:seed:problems` still works and now writes `meta` too.

## Skill-aware problem recommendations

The problem page shows **What to practise next** (up to 3 suggestions). Code: `src/features/learning/problem-recs.ts` (pure ranking), `src/server/services/recommendations.ts` (read-only loader). Suggestions never unlock units, change mastery, award XP, spend hearts or mark anything solved.

**Categories.** *Ready for this*: prerequisites known and mastered, and the problem's main skill is the one being practised. *Review first*: a prerequisite unit is not mastered; the card names those units. *Related practice*: shares a skill, but it is a different main skill or readiness is unknown; it is never described as a prerequisite.

**Ranking** (deterministic, ties break by slug; audited in Phase 2.1, see `docs/recommendation-quality-review.md`). Hard filters: not the current problem, not solved, within 500 rating of the target (median solved rating + 100, or 800), and sharing a skill with the current problem. Generic tags (implementation, math, simulation, constructive, counting, data-structures) never count as a shared skill. Score = relevance (30 reviewed main skill; 20 unreviewed problem carrying the focus tag; otherwise 12, +4 per further shared skill, at most 2; with an unreviewed current problem nobody gets the main-skill bonus) + readiness (explicit prerequisites 20, tag-estimated 12, unknown 8, each scaled by the share of mastered units) + difficulty fit (20) + actionable Review bonus (10, only when the unit to review belongs to the practised skill and is open or a learning goal) + practice of an open unit (5) + already attempted (5). There is no bonus for having metadata. Reviewed metadata without a prerequisite list claims only its primary skill's unit as "review first". Selection prefers at most 2 per skill and 1 "Review first", then backfills in rank order so the list is as full as the candidates allow (up to 3 Review items when nothing else exists). A current problem with no usable relevant candidate shows the older tag-based "Related problems".

**Metadata reliability.** *explicit* = reviewed `meta` (57 problems); *derived* = no metadata, prerequisites estimated from tags (can say Review, never Ready, and the card says "based on topic tags"); *missing* = nothing mapped, readiness unknown.

Learning goals come from the latest placement result (units still to study) or, without one, the next open unit. Tests: `tests/problem-recs.test.ts`, `tests/problem-recs-profiles.test.ts`, `tests/problem-recs-db.test.ts`.

## Algorithm visualizer

Page: `/visualizer` (sidebar entry; `?a=two-pointers|sliding-window|stack|queue|bfs` selects one). Code: `src/features/visualizer/` (pure, no React/timers) and `src/components/visualizer/`.

- **Engine** (`engine.ts`): an algorithm turns validated input into a deterministic trace, a list of steps. Each step holds the full state, the C++ line it maps to, and plain text: what happens, why, and what to notice. Playback is a separate reducer (`playerReducer`: next, prev, reset, seek, play, pause, speed, tick). Algorithm code never uses timers or randomness, so traces can be tested without a browser. Traces are capped at 300 steps.
- **Algorithms**: `two-pointers.ts`, `sliding-window.ts`, `containers.ts` (stack and queue), `bfs.ts` (adjacency list), registered in `registry.ts` with input fields, code listing, explanation text and complexity.
- **Safety**: it does not run user code, calls no API and writes nothing to the database. Viewing it gives no XP, hearts or progress. Inputs are bounded (arrays of 2-12 or 2-14 numbers, 20 operations, 10 stored values, 8 vertices, 14 edges).
- **Lessons**: the lessons `two-pointers`, `sliding-window`, `stack`, `queue` and `bfs` show a plain "See it step by step" link (`VISUALIZER_BY_LESSON`, keyed by lesson slug; a test checks the slugs are unique). Mastery and prerequisite logic is unchanged.
- **Accessibility**: the controls are labelled buttons, there is a keyboard shortcut set (arrow keys, Home, End), the explanation is an `aria-live` region, the current code line uses `aria-current`, and transitions are disabled under `prefers-reduced-motion` (global rule in `globals.css`). Playback never starts by itself.
- Tests: `tests/visualizer.test.ts`.
