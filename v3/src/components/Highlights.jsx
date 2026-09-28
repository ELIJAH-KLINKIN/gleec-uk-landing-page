// Highlights.jsx — horizontally scrolling gallery of product highlights.
// Native scroll + snap, so swipe, trackpad and arrow keys just work; paddles
// and a page control for pointer users. It never advances on its own (the HIG
// lists self-playing carousels as an anti-pattern): people move at their pace.
import { useCallback, useEffect, useRef, useState } from "react";
import { HIGHLIGHTS } from "../content.js";
import { usePrefersReducedMotion } from "../lib/motion.js";
import SectionHeader from "./ui/SectionHeader.jsx";
import Icon from "./ui/Icon.jsx";
import Flag from "./ui/Flag.jsx";
import "./Highlights.css";

export default function Highlights() {
  const items = HIGHLIGHTS.items;
  const N = items.length;
  const scrollerRef = useRef(null);
  const [active, setActive] = useState(0);
  const reducedMotion = usePrefersReducedMotion();

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

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return undefined;
    let frame = 0;
    const onScroll = () => {
      if (lockRef.current.index !== null) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => measure());
    };
    const onScrollEnd = () => {
      const requested = lockRef.current.index;
      clearTimeout(lockRef.current.timer);
      lockRef.current.index = null;
      measure(requested);
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("scrollend", onScrollEnd);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("scrollend", onScrollEnd);
      cancelAnimationFrame(frame);
    };
  }, [measure]);

  return (
    <section id="highlights" className="section alt highlights" aria-labelledby="highlights-title">
      <div className="container">
        <SectionHeader
          id="highlights-title"
          eyebrow={HIGHLIGHTS.eyebrow}
          title={HIGHLIGHTS.title}
          lead={HIGHLIGHTS.lead}
        />
      </div>

      <div className="hl">
        <div
          ref={scrollerRef}
          className="hl-scroller"
          role="region"
          aria-roledescription="carousel"
          aria-label="Product highlights"
          // Focusable so keyboard users can scroll it with the arrow keys.
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
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
              <Notice notice={item.notice} />
            </article>
          ))}
        </div>

        <div className="hl-controls container-wide">
          <div className="hl-dots" role="group" aria-label="Choose a highlight">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                className={"hl-dot" + (i === active ? " is-current" : "")}
                aria-label={`Go to highlight ${i + 1}: ${item.title}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => goTo(i)}
              />
            ))}
          </div>
          <div className="hl-paddles">
            <button
              type="button"
              className="hl-paddle"
              aria-label="Previous highlight"
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
            >
              <Icon name="chevron-left" size={20} />
            </button>
            <button
              type="button"
              className="hl-paddle"
              aria-label="Next highlight"
              disabled={active === N - 1}
              onClick={() => goTo(active + 1)}
            >
              <Icon name="chevron-right" size={20} />
            </button>
          </div>
        </div>
        <p className="visually-hidden" aria-live="polite" aria-atomic="true">
          Highlight {active + 1} of {N}: {items[active].title}
        </p>
      </div>
    </section>
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
      <span className={"hl-notice-icon " + notice.tone}>
        <Icon name={notice.icon} size={18} />
      </span>
      <span className="hl-notice-text">
        <strong>{notice.title}</strong>
        <span>{notice.detail}</span>
      </span>
    </div>
  );
}
