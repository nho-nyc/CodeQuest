import { canonicalTags } from "./tags";
import type { ProblemSeed } from "./types";
import { aPlusB, countEvens, digitSum, helloName, primeCheck, reverseArray } from "./set1";
import { lowerBound, longestRun, maxSubarray, pairWithSum, prefixQueries } from "./set2";
import { problems as setA } from "./setA";
import { problems as setB } from "./setB";
import { problems as setC } from "./setC";
import { problems as setD } from "./setD";
import { problems as setE } from "./setE";
import { problems as setF } from "./setF";
import { problems as setG } from "./setG";
import { problems as setH } from "./setH";
import { brackets, gridPath, inversions, lis, minCoins, subarrayCount } from "./set3";

/** Ordered roughly by difficulty; the list order is the default order in the Practice page. */
const RAW: ProblemSeed[] = [
  helloName, aPlusB, countEvens, reverseArray, digitSum,
  primeCheck, longestRun, prefixQueries, brackets, pairWithSum,
  lowerBound, maxSubarray, subarrayCount, minCoins, gridPath,
  lis, inversions,
  ...setA,
  ...setB,
  ...setC,
  ...setD,
  ...setE,
  ...setF,
  ...setG,
  ...setH,
];

export const PROBLEMS: ProblemSeed[] = RAW.map((p) => ({ ...p, tags: canonicalTags(p.tags) }));
