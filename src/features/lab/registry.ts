import type { Challenge } from "./challenge";
import { COINS } from "./coins";
import { MAX_SUBARRAY } from "./max-subarray";
import { UNSORTED_POINTERS } from "./two-pointers-unsorted";
import { WINDOW_NEGATIVES } from "./window-negatives";

/** Order matters: the four challenges show four different kinds of reasoning failure. */
export const CHALLENGES: Challenge[] = [COINS, MAX_SUBARRAY, UNSORTED_POINTERS, WINDOW_NEGATIVES];
export const CHALLENGE_BY_ID: Record<string, Challenge> = Object.fromEntries(CHALLENGES.map((c) => [c.id, c]));
export const isChallengeId = (s: unknown): s is string => typeof s === "string" && s in CHALLENGE_BY_ID;
