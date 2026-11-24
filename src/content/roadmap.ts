import type { WorldSeed } from "./types";

/**
 * Worlds 5-6 from the product spec. They have no authored lessons yet, so they are stored UNPUBLISHED
 * and shown on the Learning Path as "Coming soon" - never as playable content.
 */
export const ROADMAP: WorldSeed[] = [
  { slug: "dynamic-programming", title: "Dynamic Programming", description: "Memoisation, knapsack, LIS, LCS, tree and bitmask DP.", icon: "Grid3x3", color: "#FF4B4B", published: false, units: [] },
  { slug: "advanced-cp", title: "Advanced Competitive Programming", description: "Number theory, combinatorics, LCA, SCC, MST and string algorithms.", icon: "Trophy", color: "#FFC800", published: false, units: [] },
];
