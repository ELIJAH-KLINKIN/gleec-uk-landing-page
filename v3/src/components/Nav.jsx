// Nav.jsx — translucent global navigation bar. On narrow screens the links
// collapse into a full-width menu opened by a two-line button. On the legal
// pages (home={false}) the section links point back to the home page.
// On the landing page a purple underline slides to the section being read
// (scroll spy): the active item is the last section whose top has passed a line
// a quarter of the way down the screen.
import { useEffect, useRef, useState } from "react";
import { NAV } from "../content.js";
import logo from "../assets/logo-g.png";
import "./Nav.css";

export default function Nav({ home = true }) {
  const to = (hash) => (home ? hash : `/${hash}`);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null); // "#accounts" etc., or null above the first section
  const toggleRef = useRef(null);
  const linksRef = useRef(null);
  const indicatorRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 834px)");
    const onWide = (e) => e.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    document.documentElement.classList.add("menu-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
      document.documentElement.classList.remove("menu-open");
    };
  }, [open]);

  // Scroll spy. The underline is positioned directly on the element (no React
  // state per frame); React only tracks which link is current.
  useEffect(() => {
    if (!home) return undefined;
    const hrefs = NAV.map((l) => l.href);
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = 72 + window.innerHeight * 0.25;
      let current = null;
      for (const href of hrefs) {
        const el = document.querySelector(href);
        if (el && el.getBoundingClientRect().top <= line) current = href;
      }
      setActive(current);
      const bar = indicatorRef.current;
      const link = current && linksRef.current?.querySelector(`a[href="${current}"]`);
      if (!bar) return;
      if (link) {
        // Under the label, not the whole padded hit area.
        const inset = parseFloat(getComputedStyle(link).paddingLeft) || 0;
        bar.style.transform = `translateX(${link.offsetLeft + inset}px)`;
        bar.style.width = `${link.offsetWidth - inset * 2}px`;
        bar.classList.add("is-visible");
      } else {
        bar.classList.remove("is-visible");
      }
      // Slide only after the first placement, so it doesn't fly in from the left on load.
      if (!bar.classList.contains("is-ready")) requestAnimationFrame(() => bar.classList.add("is-ready"));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // Re-measure on scroll, and whenever the layout may have moved without a
    // scroll event: resizes, the initial jump to a #section, fonts, late content.
    const resize = new ResizeObserver(schedule);
    resize.observe(document.body);
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    window.addEventListener("load", schedule);
    document.fonts?.ready.then(schedule);
    return () => {
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      window.removeEventListener("load", schedule);
      cancelAnimationFrame(frame);
    };
  }, [home]);

  const current = (href) => (home && active === href ? "location" : undefined);

  return (
    <header className={"nav" + (open ? " is-open" : "")}>
      <nav className="nav-bar container-wide" aria-label="Main">
        <a
          className="nav-brand"
          href={home ? "#top" : "/"}
          aria-label={home ? "GLEEC Business, back to top" : "GLEEC Business, home"}
          onClick={() => setOpen(false)}
        >
          <img src={logo} alt="" width="15" height="20" />
          <span>
            GLEEC <span className="nav-brand-accent">Business</span>
          </span>
        </a>
        <ul className="nav-links" ref={linksRef}>
          {NAV.map((l) => (
            <li key={l.href}>
              <a href={to(l.href)} aria-current={current(l.href)}>
                {l.label}
              </a>
            </li>
          ))}
          {home ? <li className="nav-indicator" ref={indicatorRef} aria-hidden="true" /> : null}
        </ul>
        <a className="btn btn-filled btn-small nav-cta" href={to("#waitlist")}>
          Join the Waitlist
        </a>
        <button
          ref={toggleRef}
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="nav-menu"
          aria-label={open ? "Close menu" : "Menu"}
          onClick={() => setOpen((o) => !o)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
      </nav>
      <div id="nav-menu" className="nav-menu" hidden={!open}>
        <ul className="container-wide">
          {NAV.map((l) => (
            <li key={l.href}>
              <a href={to(l.href)} aria-current={current(l.href)} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a href={to("#waitlist")} onClick={() => setOpen(false)}>
              Join the Waitlist
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
