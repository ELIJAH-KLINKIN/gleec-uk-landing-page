// PhoneFrame.jsx — the phone drawn in HTML/CSS, shared by the product art: body,
// buttons (Action, volume up and down on the left; side button and Camera Control
// on the right), screen, camera island and a status bar showing the visitor's
// own time. A generic phone (no maker's logo). The parent sets its width with
// --pw and font-size: calc(var(--pw) / 30). Pass `side` to make the side button
// a real control (the wallet does).
import { useEffect, useState } from "react";
import "./PhoneFrame.css";

export default function PhoneFrame({ side, className = "", children }) {
  return (
    <div className={`wp-body ${className}`}>
      <span className="wp-btn wp-action" aria-hidden="true" />
      <span className="wp-btn wp-vol wp-vol-1" aria-hidden="true" />
      <span className="wp-btn wp-vol wp-vol-2" aria-hidden="true" />
      {side ?? <span className="wp-btn wp-side" aria-hidden="true" />}
      <span className="wp-btn wp-camera" aria-hidden="true" />
      <div className="wp-screen">
        <div className="wp-island" aria-hidden="true" />
        <StatusBar />
        {children}
      </div>
    </div>
  );
}

// The visitor's local time, as a phone shows it: no AM/PM; a leading zero only
// on a 24-hour clock. The prerendered page shows 9:41 until it loads.
function useDeviceTime() {
  const [time, setTime] = useState("9:41");
  useEffect(() => {
    const h12 = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hour12;
    let id = 0;
    const tick = () => {
      const d = new Date();
      const h = h12 ? d.getHours() % 12 || 12 : String(d.getHours()).padStart(2, "0");
      setTime(`${h}:${String(d.getMinutes()).padStart(2, "0")}`);
      id = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50); // on the minute
    };
    tick();
    return () => clearTimeout(id);
  }, []);
  return time;
}

function StatusBar() {
  const time = useDeviceTime();
  return (
    <div className="wp-status" aria-hidden="true">
      <span>{time}</span>
      <span className="wp-status-icons">
        <svg viewBox="0 0 18 12" width="1.6em" height="1.05em" fill="currentColor">
          <rect x="0" y="7.5" width="3.2" height="4.5" rx="1" />
          <rect x="4.9" y="5" width="3.2" height="7" rx="1" />
          <rect x="9.8" y="2.5" width="3.2" height="9.5" rx="1" />
          <rect x="14.7" y="0" width="3.2" height="12" rx="1" />
        </svg>
        {/* Wi-Fi at full strength: two arcs over a small fan, three bars in all. */}
        <svg viewBox="0 0 17 12" width="1.5em" height="1.05em" fill="currentColor" stroke="currentColor">
          <path d="M1.71 4.41a9.6 9.6 0 0 1 13.58 0" fill="none" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M4.19 6.89a6.1 6.1 0 0 1 8.62 0" fill="none" strokeWidth="1.9" strokeLinecap="round" />
          <path d="M8.5 11.2 6.2 8.9a3.25 3.25 0 0 1 4.6 0Z" strokeWidth="0.9" strokeLinejoin="round" />
        </svg>
        {/* The current battery: a solid pill (full), with a small cap. */}
        <svg viewBox="0 0 28 13" width="2.5em" height="1.1em" fill="currentColor">
          <rect x="0" y="0.5" width="24.6" height="12" rx="4.2" />
          <path d="M26 4.6c.9.3 1.5 1 1.5 1.9s-.6 1.6-1.5 1.9Z" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}
