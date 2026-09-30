// PhoneFrame.jsx — the phone drawn in HTML/CSS, shared by the product art: body,
// buttons, screen, camera island and a status bar. A generic phone (no maker's
// logo). The parent sets its width with --pw and font-size: calc(var(--pw) / 30).
// Pass `side` to make the side button a real control (the wallet does).
import "./PhoneFrame.css";

export default function PhoneFrame({ side, className = "", children }) {
  return (
    <div className={`wp-body ${className}`}>
      <span className="wp-vol wp-vol-1" aria-hidden="true" />
      <span className="wp-vol wp-vol-2" aria-hidden="true" />
      {side ?? <span className="wp-side" aria-hidden="true" />}
      <div className="wp-screen">
        <div className="wp-island" aria-hidden="true" />
        <StatusBar />
        {children}
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="wp-status" aria-hidden="true">
      <span>9:41</span>
      <span className="wp-status-icons">
        <svg viewBox="0 0 18 12" width="1.6em" height="1.05em" fill="currentColor">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" width="1.45em" height="1.05em" fill="currentColor">
          <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3C13.5 1.5 10.8.4 8 .4S2.5 1.5.5 3.4l1.2 1.3C3.4 3.1 5.6 2.2 8 2.2Zm0 3.6c1.4 0 2.7.5 3.7 1.4l1.2-1.3C11.6 4.7 9.9 4 8 4s-3.6.7-4.9 1.9l1.2 1.3c1-.9 2.3-1.4 3.7-1.4Zm0 3.6c.5 0 1 .2 1.3.5L8 11.6 6.7 9.9c.3-.3.8-.5 1.3-.5Z" />
        </svg>
        <svg viewBox="0 0 27 12" width="2.4em" height="1.05em">
          <rect x="0.5" y="0.5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" opacity="0.4" />
          <rect x="2" y="2" width="16" height="8" rx="2" fill="currentColor" />
          <path d="M25 4v4c.8-.3 1.3-1.1 1.3-2S25.8 4.3 25 4Z" fill="currentColor" opacity="0.4" />
        </svg>
      </span>
    </div>
  );
}
