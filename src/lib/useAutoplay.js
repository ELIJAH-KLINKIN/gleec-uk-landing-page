// useAutoplay — shared timing logic for the auto-advancing carousels.
//
// The carousels draw their countdown as a CSS animation and advance on
// `animationend`, so this hook only decides whether that animation should be
// running. It runs when all of these hold:
//   • the user hasn't paused it (and, by default, the OS isn't set to reduce motion),
//   • the carousel is on screen,
//   • the pointer / keyboard focus isn't inside it,
//   • the browser tab is visible.
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange) {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function subscribeVisibility(onChange) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

export function useAutoplay({ threshold = 0.3 } = {}) {
  const ref = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  // null = follow the default (play unless reduced motion); true/false = user choice.
  const [userPlaying, setUserPlaying] = useState(null);
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
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return undefined;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  const playing = userPlaying ?? !reducedMotion;
  const running = playing && inView && !hovered && !focused && pageVisible;

  const setPlaying = useCallback(
    (next) => {
      setUserPlaying((prev) => (typeof next === "function" ? next(prev ?? !reducedMotion) : next));
    },
    [reducedMotion],
  );

  // Spread onto the element whose hover / keyboard focus should pause the timer.
  // Mouse clicks on the controls don't count as "focus" (they'd otherwise keep
  // the carousel paused until the user clicked elsewhere), and neither does the
  // play/pause toggle itself.
  const pauseProps = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
    onFocus: (e) => {
      const t = e.target;
      setFocused(Boolean(t.matches?.(":focus-visible") && !t.closest?.("[data-autoplay-toggle]")));
    },
    onBlur: (e) => {
      if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false);
    },
  };

  return { ref, playing, running, setPlaying, pauseProps };
}
