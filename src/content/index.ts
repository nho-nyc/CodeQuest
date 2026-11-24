import type { WorldSeed } from "./types";
import { world1 } from "./world1";
import { world2 } from "./world2";
import { world3 } from "./world3";
import { world4 } from "./world4";
import { shuffleWorld } from "./shuffle";

/** All curriculum content. Worlds without authored lessons are not listed here (see README). */
export const WORLDS: WorldSeed[] = [world1, world2, world3, world4].map(shuffleWorld);
