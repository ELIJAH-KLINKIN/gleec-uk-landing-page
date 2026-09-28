// Nav.jsx — translucent global navigation bar. On narrow screens the links
// collapse into a full-width menu opened by a two-line button.
import { useEffect, useRef, useState } from "react";
import { NAV } from "../content.js";
import logo from "../assets/logo-g.png";
import "./Nav.css";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef(null);

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

  return (
    <header id="top" className={"nav" + (open ? " is-open" : "")}>
      <nav className="nav-bar container-wide" aria-label="Main">
        <a className="nav-brand" href="#top" aria-label="GLEEC Business, back to top">
          <img src={logo} alt="" width="15" height="20" />
          <span>
            GLEEC <span className="nav-brand-accent">Business</span>
          </span>
        </a>
        <ul className="nav-links">
          {NAV.map((l) => (
            <li key={l.href}>
              <a href={l.href}>{l.label}</a>
            </li>
          ))}
        </ul>
        <a className="btn btn-filled btn-small nav-cta" href="#waitlist">
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
              <a href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a href="#waitlist" onClick={() => setOpen(false)}>
              Join the Waitlist
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}
