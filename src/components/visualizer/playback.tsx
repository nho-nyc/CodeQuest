"use client";

import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useReducer, type Dispatch, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { atEnd, delayFor, initialPlayer, playerReducer, SPEEDS, type Player, type PlayerAction, type Speed } from "@/features/visualizer/engine";

/** Playback state for a trace of `total` steps. `resetKey` changes whenever a new trace is loaded. Shared by the visualizer and the Counterexample Lab. */
export function usePlayer(total: number, resetKey: unknown): [Player, Dispatch<PlayerAction>] {
  const [player, dispatch] = useReducer(playerReducer, total, (n: number) => initialPlayer(n));
  useEffect(() => {
    dispatch({ type: "load", total: Math.max(1, total) });
  }, [resetKey, total]);
  useEffect(() => {
    if (!player.playing) return;
    const t = window.setTimeout(() => dispatch({ type: "tick" }), delayFor(player.speed));
    return () => window.clearTimeout(t);
  }, [player.playing, player.index, player.speed]);
  return [player, dispatch];
}

/** Arrow keys step, Home resets, End jumps to the last step. Typing in a form field is never intercepted. */
export function playbackKeys(e: KeyboardEvent, dispatch: Dispatch<PlayerAction>, total: number) {
  const t = e.target as HTMLElement;
  if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) && t.getAttribute("type") !== "range") return;
  if (e.key === "ArrowRight") dispatch({ type: "next" });
  else if (e.key === "ArrowLeft") dispatch({ type: "prev" });
  else if (e.key === "Home") dispatch({ type: "reset" });
  else if (e.key === "End") dispatch({ type: "seek", index: total - 1 });
  else return;
  e.preventDefault();
}

export function PlaybackControls({ player, dispatch, total }: { player: Player; dispatch: Dispatch<PlayerAction>; total: number }) {
  const label = player.playing ? "Pause" : atEnd(player) && total > 1 ? "Replay" : "Play";
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="w-24 shrink-0 text-sm font-extrabold" data-testid="progress-label">
          Step {player.index + 1} / {total}
        </span>
        <input type="range" min={0} max={Math.max(0, total - 1)} value={player.index} onChange={(e) => dispatch({ type: "seek", index: Number(e.target.value) })} aria-label="Step" aria-valuetext={`Step ${player.index + 1} of ${total}`} className="h-2 w-full min-w-0 accent-[var(--color-sky)]" />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: "reset" })} aria-label="Reset to the first step">
          <RotateCcw size={16} /> Reset
        </Button>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: "prev" })} disabled={player.index === 0} aria-label="Previous step">
          <ChevronLeft size={18} /> Prev
        </Button>
        <Button size="sm" variant="blue" onClick={() => dispatch({ type: "toggle" })} disabled={total < 2} aria-label={label} aria-pressed={player.playing}>
          {player.playing ? <Pause size={16} /> : <Play size={16} />} {label}
        </Button>
        <Button size="sm" variant="outline" onClick={() => dispatch({ type: "next" })} disabled={atEnd(player)} aria-label="Next step">
          Next <ChevronRight size={18} />
        </Button>
        <label className="ml-auto flex items-center gap-2 text-sm font-bold">
          Speed
          <select value={player.speed} onChange={(e) => dispatch({ type: "speed", speed: Number(e.target.value) as Speed })} className="rounded-xl border-2 border-line bg-surface px-2 py-1.5 text-sm font-bold">
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="mt-2 text-xs text-muted">Keyboard: left and right arrows step, Home resets, End jumps to the last step.</p>
    </div>
  );
}
