# Phase 5.1: Production and educational quality audit

Scope: the Algorithm Repair Workshop (commit `6eeaa2a`) and the judge, rate-limit, session and storage code it relies on.
Method: read the real code, reproduce each concern before fixing it, add a test for each confirmed issue, and say plainly what could not be verified.
"Confirmed" means reproduced or demonstrated by a test. "Theoretical" means reasoned about but not demonstrable here.

## Confirmed findings

| # | Issue | Severity | Evidence | Fix | Verification |
|---|---|---|---|---|---|
| F1 | Rate limits are per serverless instance, so the real ceiling is limit x warm instances, and counters reset on cold start. | Medium | `src/server/rate-limit.ts` is a module-level `Map`; no Redis client in `package.json`; `REDIS_URL` appears only in `.env.example`. A test imports two fresh module graphs (two instances) and gets 16 accepted submits for a limit of 8. | `rateLimitShared`: optional Upstash REST store (atomic MULTI/EXEC INCR+PEXPIRE, hashed keys, fixed windows with expiry); falls back to the local limiter if unset or unreachable (never fails open, one warning per minute, no secrets in the log). Used by repair Run/Submit and practice Run/Submit. Per-user in-flight cap of 2 (per instance). | Unit tests against a fake Upstash REST server: one limit across two instances, exactly `limit` allowed under 60 parallel calls, window rollover, key hashing, outage/garbage/401/refused fallbacks, no secret in logs. **Not tested against a real Redis. Production is not configured with the variables, so production remains per-instance until they are set.** |
| F2 | Hint and reveal gating existed only in the UI. | Medium (educational integrity) | Reproduced on the Phase 5 build: `POST /api/repair/greedy-coins/hint {"level":3}` and `/solution` returned the hint and the full reference solution for a fresh session with no activity. | Signed httpOnly progress cookie per challenge (HMAC keyed from the password hash): hint n needs n-1; solution needs a judged Submit, all three hints, or Accepted. No migration. | 17 tests call the real route handlers: 401s, skipped hints, repeated requests, forged / other-user / other-challenge / expired / pre-password-change cookies, run-only and two-hint cases, invalid submit not counted. A mutation check (policy removed) made 7 of them fail. |
| F3 | Judge errors showed upstream detail to learners (`Judge0 responded with HTTP 401`). | Low | `JudgeUnavailableError.message` was passed straight into the 503 response. | Learners get one generic message; the operational reason is logged server-side and never contains the URL, headers or token. | Mocked-HTTP tests for 401/403/422/429/500, network failure, bad JSON: message is generic and no secret or host appears in message or detail. |
| F4 | Malformed Judge0 replies (non-JSON, missing `submissions`, wrong token count) would surface as a generic 500. | Low | Code read: `res.json()` and `res.submissions.map` were unguarded. | Mapped to "judge unavailable" (503). | Mocked-HTTP tests. |
| F5 | The repair routes read the whole request body with `req.json()` before validating its size. | Low to Medium | Code read; the 64 KB source cap was applied after parsing. | `readJsonLimited` (160 KB, streamed, rejects with 413 even without a Content-Length). | Route-level tests: declared-size, streamed and just-over-limit bodies. The practice routes still use `req.json()` (outside this phase; Vercel also caps request bodies at the platform level). |
| F6 | The learner's code draft was stored under `cq:repair:<challenge>` with no user scope: on a shared device a second user would see the first user's draft. | Low | Code read. | Versioned, per-user, per-challenge envelope `cq:repair:v1:<userId>:<challengeId>`; invalid data ignored, never deleted. The old ownerless key is never read (its owner is unknown) and never deleted. | 9 tests with a fake storage: refresh, switching, two users, logout/login, invalid JSON, old format, empty, large, unavailable storage, envelope contents. |
| F7 | An invalid `JUDGE0_*` value caused a generic 500 with no operator signal. | Low | Code read (`env()` throws inside `getJudge()`). | `requireJudge` reports 503 "misconfigured" and logs the problem without echoing values. | Test sets an invalid `JUDGE0_URL`. |
| F8 | Educational errors (see the review table). Most important: the two-pointers reflection claimed sums "above 2^31" and "need long long", which is false for the stated limits (2 x 10^9 < 2^31 - 1). | Medium (misleading) | Arithmetic. | Claim removed and replaced by the accurate statement; related wording fixed. | Content tests, including one that rejects overflow claims and checks the arithmetic. |

## Checked, no defect found

- **Identity for rate limits** comes from the database-backed session (`getCurrentUser`), not from client input. Keys are `api:<bucket>:<user uuid>`: fixed bucket names and a uuid cannot collide.
- **Parallel requests inside one instance** cannot slip past the local limiter: the check and increment are synchronous.
- **Hidden tests, references, hints, reflections and reference solutions** stay on the server: only counts and the kind of the first hidden failure are returned; a test scans the client bundle sources, and the production client chunks were searched for hidden text and reference code (none found). Source maps for the browser are not enabled (`productionBrowserSourceMaps` is not set).
- **Error responses** use fixed messages; stack traces go to server logs only (a test checks the response text).
- **Duplicate submissions** are idempotent: nothing is stored, so repeats give the same verdict and record nothing.
- **Judge0 payload**: base64 source and stdin, language id, `cpu_time_limit`, `wall_time_limit`, `memory_limit` in KB, `enable_network: false`, no learner-controlled options. Statuses 3, 5, 6, 7-12 and unknown are mapped; memory above the limit is reported even if Judge0 said Accepted.

## Theoretical concerns (not demonstrable here)

- The progress cookie key is derived from the password hash. Someone who can already read the database could forge progress, but they would have far more access than that. `REPAIR_PROGRESS_SECRET` adds a server-side component if wanted. Deleting or replaying a cookie can only lose or keep what was earned, never raise it.
- Progress is per browser, not per account: a learner on a new device starts again at hint 1 (the policy only ever makes things stricter, never looser).
- Drafts remain on the device after logout (they are private to the user's own key but not erased).
- The in-flight cap is per instance, like the old limiter.

## Educational review

| Challenge | Correctness | Hints | Reflection | Complexity | Issues found and fixed |
|---|---|---|---|---|---|
| Fewest coins | Statement unambiguous; DP matches the limits (n 50, m 10 000); sample 3 (1, 3, 4; 6) exposes greedy; hidden tests include 1,5,12/15, 1,10,25/30 and impossible cases; reference checked against exhaustive search. | Hint 1 told learners to "try small coin sets of your own", but the workshop only runs the visible tests. Reworded to working them out by hand. Hints 2 and 3 are fine. | Accurate (4+1+1 versus 3+3). | O(n x m) = at most 500 000 steps: correct. | Hint wording; the "learn" pointer now names the real lessons "The Greedy Choice (and When It Fails)" and "Tabulation: Fill a Table Bottom-Up". |
| Best stretch of numbers | Statement says non-empty; all-negative case is sample 3 and several hidden tests; long long is needed (sums reach 10^14) and used; reference equals O(n^3) brute force. | Hint 1 said "Test ..." (same issue). Reworded to "Think about". | Accurate. | O(n) / O(1): correct. | Hint wording; pointer fixed (the curriculum has no Kadane lesson, so it points at prefix sums and tabulation). |
| Two numbers that add up | Only YES/NO is asked, so sorting and losing positions is allowed (now stated in the output format); i != j handled (a single 5 with target 10 is NO); reference equals all-pairs. | Hint 2 said the pointer move "only makes sense if the numbers to its right are bigger", which is imprecise. Rewritten to the actual justification (every other number still in range is at most a[r]). | **Wrong claim removed** (overflow). The explanation of why a pointer move is safe was imprecise ("numbers beside l") and was rewritten. | O(n log n), or O(n) with a hash set: correct. | Overflow claim; imprecise invariant; lesson pointer. |
| Longest cheap stretch | O(n^2) is right for n 2 000 (about 2 million additions); K may be negative; the reference equals a prefix-sum recomputation. | Fine. | Accurate; "monotonic" jargon replaced; no advanced algorithm is recommended any more. | O(n^2) / O(1): correct. | Jargon; unnecessary mention of faster methods; lesson pointer. |

Terminology: the application UI is English-only (no Vietnamese strings exist in the workshop, Lab or curriculum), so there is no bilingual terminology to reconcile; a test asserts the workshop files contain no Vietnamese text. The explanations use words a grade-9 beginner can follow ("block", "pointer", "window"); a few terms (invariant, monotonic) were removed from learner-facing text.

## What could not be verified

- **A real Judge0**: no `JUDGE0_URL` is configured in this environment and the public instance is not reachable from the sandbox. Everything above about Judge0 uses a local test server that compiles with g++ (application logic) or mocked HTTP (client behaviour). Neither is a real Judge0. The verification matrix needs an authorized instance (see the final report).
- **Vercel configuration and deployment status**: the Vercel connection requires the owner's approval for team `tu-fcca`.
- **A real Upstash Redis**: the shared limiter was tested only against a fake REST server.
- **Credential rotation**: see the final report. Neon's recent operation history shows only compute start and suspend events; absence of a password-reset event is not proof either way.
