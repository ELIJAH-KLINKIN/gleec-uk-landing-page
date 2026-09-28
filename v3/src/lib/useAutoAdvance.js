// useAutoAdvance — decides whether an auto-advancing timer should run.
// It runs only while: enabled (the visitor hasn't picked a tab), Reduce
// Motion is off, the element is on screen, the pointer isn't over it, no
// keyboard focus is inside it, and the browser tab is visible.
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePrefersReducedMotion } from "./motion.js";

function subscribeVisibility(onChange) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function useAutoAdvance({ enabled, threshold = 0.35 }) {
  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const [inView, setInView] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const pageVisible = useSyncExternalStore(
    subscribeVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );

  useEffect(() => {
    const el = ref.current;
    // Without IntersectionObserver (very old browsers) it simply never auto-advances.
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  const running = enabled && !reducedMotion && inView && !hovered && !focused && pageVisible;

  // Hover pauses; so does keyboard focus (a mouse click doesn't count as focus).
  const pauseProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: (e) => setFocused(Boolean(e.target.matches?.(":focus-visible"))),
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
    },
  };

  return { ref, running, autoplayAllowed: !reducedMotion, pauseProps };
}
