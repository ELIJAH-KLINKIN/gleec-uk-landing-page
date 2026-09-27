// Nav.jsx — Floating glass top navigation, with a disclosure menu on small screens.
import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import logoG from "../assets/logo-g.png";
import "./Nav.css";

const LINKS = [
  { label: "Product", href: "#product" },
  { label: "Accounts", href: "#accounts" },
  { label: "Payments", href: "#payments" },
  { label: "Cards", href: "#cards" },
  { label: "Pricing", href: "#plans" },
  { label: "FAQ", href: "#faq" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile menu on Escape, on a click outside the nav, or when the
  // viewport grows past the breakpoint where the inline links come back.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        navRef.current?.querySelector(".gl-nav-toggle")?.focus();
      }
    };
    const onPointer = (e) => {
      if (!navRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const mq = window.matchMedia("(min-width: 861px)");
    const onBreakpoint = (e) => e.matches && setMenuOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    mq.addEventListener("change", onBreakpoint);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      mq.removeEventListener("change", onBreakpoint);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header id="top" className={"gl-nav-wrap" + (scrolled ? " gl-nav-scrolled" : "") + (menuOpen ? " is-open" : "")}>
      <nav className="gl-nav" aria-label="Main" ref={navRef}>
        <a href="#top" className="gl-brand" aria-label="GLEEC Business — back to top">
          <img src={logoG} alt="" width="21" height="28" />
          <span>
            GLEEC <span style={{ color: "var(--gleec-purple)" }}>Business</span>
          </span>
        </a>
        <div className="gl-nav-links">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
        <div className="gl-nav-actions">
          <a href="#waitlist" className="gl-btn gl-btn-primary gl-btn-sm">
            Join waitlist <Icon name="arrow-right" size={14} />
          </a>
          <button
            type="button"
            className="gl-nav-toggle"
            aria-expanded={menuOpen}
            aria-controls="gl-nav-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? "x" : "menu"} size={18} strokeWidth={2} />
          </button>
        </div>

        <div id="gl-nav-menu" className="gl-nav-menu" hidden={!menuOpen}>
          <ul>
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={closeMenu}>
                  {l.label}
                  <Icon name="arrow-right" size={14} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </header>
  );
}
