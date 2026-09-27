// Flag.jsx — small circular flags (decorative; the market name is the label).
import { useId } from "react";

export default function Flag({ code, size = 24 }) {
  const clip = useId();
  const ring = <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />;
  let art;
  if (code === "GB") {
    art = (
      <>
        <rect width="60" height="60" fill="#012169" />
        <path d="M0 0 L60 60 M60 0 L0 60" stroke="#fff" strokeWidth="12" />
        <path d="M0 0 L60 60 M60 0 L0 60" stroke="#C8102E" strokeWidth="4" />
        <path d="M30 0 V60 M0 30 H60" stroke="#fff" strokeWidth="20" />
        <path d="M30 0 V60 M0 30 H60" stroke="#C8102E" strokeWidth="12" />
      </>
    );
  } else if (code === "EU") {
    art = (
      <>
        <rect width="60" height="60" fill="#003399" />
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
          return <circle key={i} cx={30 + Math.cos(a) * 18} cy={30 + Math.sin(a) * 18} r="2.6" fill="#FFCC00" />;
        })}
      </>
    );
  } else if (code === "US") {
    art = (
      <>
        {Array.from({ length: 13 }, (_, i) => (
          <rect key={i} y={(i * 60) / 13} width="60" height={60 / 13 + 0.2} fill={i % 2 ? "#fff" : "#B22234"} />
        ))}
        <rect width="30" height={(60 * 7) / 13} fill="#3C3B6E" />
      </>
    );
  } else {
    art = (
      <>
        <rect width="60" height="60" fill="#5E5CE6" />
        <g fill="none" stroke="#fff" strokeWidth="2.4" opacity="0.95">
          <circle cx="30" cy="30" r="17" />
          <ellipse cx="30" cy="30" rx="7.5" ry="17" />
          <path d="M13 30 H47" />
        </g>
      </>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" className="flag">
      <defs>
        <clipPath id={clip}>
          <circle cx="30" cy="30" r="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>{art}</g>
      {ring}
    </svg>
  );
}
