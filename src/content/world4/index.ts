import type { WorldSeed } from "../types";
import { w4unit1 } from "./unit1";
import { w4unit2 } from "./unit2";
import { w4unit3 } from "./unit3";
import { w4unit4 } from "./unit4";
import { w4unit5 } from "./unit5";

export const world4: WorldSeed = {
  slug: "algorithms",
  title: "Algorithms",
  description: "Recursion, backtracking, greedy, graph search and first steps in dynamic programming.",
  icon: "Network",
  color: "#FF9600",
  published: true,
  units: [w4unit1, w4unit2, w4unit3, w4unit4, w4unit5],
};
