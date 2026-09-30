// Highlights.jsx — horizontally scrolling gallery of product highlights.
// Native scroll + snap, so swipe, trackpad and arrow keys just work; paddles
// and a page control for pointer users. It plays on its own, like the hero
// demo, with the time left shown as a fill in the current dot, and a Pause
// button between the paddles (WCAG 2.2.2). Each tile stays for its reading
// time. It holds while the pointer is over the tiles, keyboard focus is in
// them, it is off screen or the tab is hidden, never plays under Reduce
// Motion, and stops once the visitor moves it themselves (dot, paddle, swipe).
import { useCallback, useEffect, useRef, useState } from "react";
import { HIGHLIGHTS } from "../content.js";
import { usePrefersReducedMotion } from "../lib/motion.js";
import { useAutoAdvance } from "../lib/useAutoAdvance.js";
import { GalleryPaused } from "../lib/galleryMotion.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import Flag from "./ui/Flag.jsx";
import { PRODUCT_ART } from "./art/ProductArt.jsx";
import "./Highlights.css";

// Time on a tile: about 250 ms a word (an average reading pace) plus a moment
// for the drawing, never under 7 s. The tiles come out at 7–8.5 s.
const readMs = (item) => {
  const words = `${item.title} ${item.body}`.split(/\s+/).filter(Boolean).length;
  return Math.min(11000, Math.max(7000, 2000 + words * 250));
};

export default function Highlights() {
  const items = HIGHLIGHTS.items;
  const N = items.length;
  const scrollerRef = useRef(null);
  const [active, setActive] = useState(0);
  const reducedMotion = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(true);
  // Pause pressed (not just the visitor moving the gallery): animated art holds still too.
  const [paused, setPaused] = useState(false);
  const [runId, setRunId] = useState(0); // restarts the fill in the current dot
  // Hover and keyboard focus pause only over the tiles, so Play works at once.
  const { ref: autoRef, running, autoplayAllowed, pauseProps } = useAutoAdvance({ enabled: playing });
  const autoplay = playing && autoplayAllowed;
  const touchingRef = useRef(false);

  // While a paddle / dot / autoplay scroll is animating, ignore the tiles it
  // passes on the way so the page control doesn't flicker through them.
  const lockRef = useRef({ index: null, timer: 0 });

  const tiles = () => Array.from(scrollerRef.current?.querySelectorAll(".hl-tile") ?? []);

  // Work out which tile sits at the leading edge. Once the gallery can't
  // scroll any further, the last tiles can't reach that edge: keep the tile
  // that was asked for (dot / paddle), otherwise mark the last one.
  const measure = useCallback((requested = null) => {
    const scroller = scrollerRef.current;
    const all = tiles();
    if (!scroller || !all.length) return;
    const start = scroller.scrollLeft + all[0].offsetLeft;
    let best = 0;
    let bestDist = Infinity;
    all.forEach((t, i) => {
      const d = Math.abs(t.offsetLeft - start);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const atEnd = scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 4;
    if (atEnd) setActive(requested !== null && requested >= best ? requested : all.length - 1);
    else setActive(best);
  }, []);

  const goTo = useCallback(
    (i) => {
      const scroller = scrollerRef.current;
      const tile = tiles()[i];
      if (!scroller || !tile) return;
      const left = tile.offsetLeft - tiles()[0].offsetLeft;
      clearTimeout(lockRef.current.timer);
      // Fallback for browsers without the scrollend event.
      const timer = setTimeout(() => {
        lockRef.current.index = null;
        measure(i);
      }, 900);
      lockRef.current = { index: i, timer };
      scroller.scrollTo({ left, behavior: reducedMotion ? "auto" : "smooth" });
      setActive(i);
    },
    [reducedMotion, measure],
  );

  // The visitor moved it: stop playing (Play resumes it).
  const pick = (i) => {
    setPlaying(false);
    goTo(i);
  };
  // Next tile when the fill runs out; back to the first once the gallery can't
  // scroll any further (on wide screens the last tiles are already in view).
  const advance = () => {
    const scroller = scrollerRef.current;
    const atEnd = scroller && scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 4;
    goTo(atEnd || active === N - 1 ? 0 : active + 1);
    setRunId((r) => r + 1);
  };
  const togglePlay = () => {
    setPaused(playing);
    setPlaying((p) => !p);
    setRunId((r) => r + 1);
  };

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    let frame = 0;
    const onScroll = () => {
      if (lockRef.current.index !== null) return;
      if (touchingRef.current) setPlaying(false); // a swipe
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measure());
    };
    // A sideways trackpad swipe, or a touch that scrolls the tiles.
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) setPlaying(false);
    };
    const onTouchStart = () => {
      touchingRef.current = true;
    };
    const onTouchEnd = () => {
      touchingRef.current = false;
    };
    const onScrollEnd = () => {
      const requested = lockRef.current.index;
      clearTimeout(lockRef.current.timer);
      lockRef.current.index = null;
      measure(requested);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    scroller.addEventListener("wheel", onWheel, { passive: true });
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchend", onTouchEnd, { passive: true });
    scroller.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchend", onTouchEnd);
      scroller.removeEventListener("touchcancel", onTouchEnd);
      cancelAnimationFrame(frame);
    };
  }, [measure]);

  return (
    <section id="product" className="section alt highlights" aria-labelledby="highlights-title">
      <div className="container">
        <SectionHeader
          id="highlights-title"
          eyebrow={HIGHLIGHTS.eyebrow}
          title={HIGHLIGHTS.title}
          lead={HIGHLIGHTS.lead}
        />
      </div>

      <GalleryPaused.Provider value={paused}>
      <div className="hl">
        <div
          ref={(el) => {
            scrollerRef.current = el;
            autoRef.current = el;
          }}
          className="hl-scroller"
          role="region"
          aria-roledescription="carousel"
          aria-label="Product highlights"
          // Focusable so keyboard users can scroll it with the arrow keys.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          {...pauseProps}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown"].includes(e.key)) setPlaying(false);
          }}
        >
          {items.map((item, i) => (
            <article
              key={item.id}
              className="hl-tile squircle"
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${N}: ${item.title}`}
            >
              <div className="hl-tile-copy">
                <p className="hl-tile-eyebrow">{item.eyebrow}</p>
                <h3 className="title-3">{item.title}</h3>
                <p className="hl-tile-body">{item.body}</p>
              </div>
              {item.art ? <Art name={item.art} /> : null}
              {item.notice ? <Notice notice={item.notice} /> : null}
            </article>
          ))}
        </div>

        <div className="hl-controls container-wide">
          <div className="hl-dots" role="group" aria-label="Choose a highlight">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={"hl-dot" + (i === active ? " is-current" : "") + (i === active && autoplay ? " is-playing" : "")}
                aria-label={`Go to highlight ${i + 1}: ${item.title}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => pick(i)}
              >
                {i === active && autoplay ? (
                  <span
                    key={runId}
                    className="hl-dot-progress"
                    aria-hidden="true"
                    onAnimationEnd={advance}
                    style={{
                      animationDuration: `${readMs(item)}ms`,
                      animationPlayState: running ? "running" : "paused",
                    }}
                  />
                ) : null}
              </button>
            ))}
          </div>
          <div className="hl-paddles">
            <button
              type="button"
              className="hl-paddle hl-arrow"
              aria-label="Previous highlight"
              disabled={active === 0}
              onClick={() => pick(active - 1)}
            >
              <Icon name="chevron-left" size={20} />
            </button>
            {autoplayAllowed ? (
              <button
                type="button"
                className="hl-paddle hl-play"
                aria-label={playing ? "Pause highlights" : "Play highlights"}
                onClick={togglePlay}
              >
                <Icon name={playing ? "pause" : "play"} size={16} />
              </button>
            ) : null}
            <button
              type="button"
              className="hl-paddle hl-arrow"
              aria-label="Next highlight"
              disabled={active === N - 1}
              onClick={() => pick(active + 1)}
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
        </div>
        {HIGHLIGHTS.note ? <p className="footnote hl-note container-wide">{HIGHLIGHTS.note}</p> : null}
        {/* Quiet while it plays, so a screen reader isn't interrupted every few seconds. */}
        <p className="visually-hidden" aria-live={autoplay ? "off" : "polite"} aria-atomic="true">
          Highlight {active + 1} of {N}: {items[active].title}
        </p>
      </div>
      </GalleryPaused.Provider>
    </section>
  );
}

// Card art. Drawn in HTML/CSS (a piece of the product), or pre-rendered 3D for
// real objects (scripts/art), one image per colour scheme. Decorative: the
// card's own text says what it shows.
const DRAWN = PRODUCT_ART;
// Art that runs off the bottom edge of the tile (a phone rising from below).
const BLEED = new Set(["add-account"]);

function Art({ name }) {
  const Drawn = DRAWN[name];
  if (Drawn) {
    return (
      <div className={"hl-art" + (BLEED.has(name) ? " hl-art-bleed" : "")} aria-hidden="true">
        <Drawn />
      </div>
    );
  }
  return (
    <picture className="hl-art">
      <source srcSet={`/art/${name}-dark.webp`} media="(prefers-color-scheme: dark)" />
      <img src={`/art/${name}-light.webp`} alt="" width="1200" height="743" loading="lazy" decoding="async" />
    </picture>
  );
}

// The small illustrative "product surface" at the foot of each tile.
function Notice({ notice }) {
  if (notice.kind === "balance") {
    return (
      <div className="hl-notice" aria-hidden="true">
        <Flag code={notice.flag} size={36} />
        <span className="hl-notice-text">
          <strong>{notice.title}</strong>
          <span>{notice.detail}</span>
        </span>
        <span className="hl-notice-amount">{notice.amount}</span>
      </div>
    );
  }
  if (notice.kind === "details") {
    return (
      <dl className="hl-notice hl-notice-details" aria-hidden="true">
        {notice.rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <div className="hl-notice" aria-hidden="true">
      {notice.flag ? (
        <Flag code={notice.flag} size={36} />
      ) : (
        <span className={"hl-notice-icon " + notice.tone}>
          <Icon name={notice.icon} size={18} />
        </span>
      )}
      <span className="hl-notice-text">
        <strong>{notice.title}</strong>
        <span>{notice.detail}</span>
      </span>
    </div>
  );
}
