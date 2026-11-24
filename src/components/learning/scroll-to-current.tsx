"use client";
import { useEffect, useRef, type ReactNode } from "react";

/** Horizontal scroller that centres the element marked data-current on first paint (the learner's next unit). */
export function ScrollToCurrent({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = ref.current;
    const el = box?.querySelector<HTMLElement>("[data-current]");
    if (!box || !el) return;
    box.scrollLeft = Math.max(0, el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2);
  }, []);
  return (
    <div ref={ref} className={className} tabIndex={0} role="region" aria-label="Skill map, scrolls horizontally">
      {children}
    </div>
  );
}
