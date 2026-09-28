// Flag.jsx — small circular flags (decorative; the adjacent text is the label).
// Simplified artwork drawn on a 60×60 grid and clipped to a circle.
import { useId } from "react";

const UNION_JACK = (
  <>
    <rect width="60" height="60" fill="#012169" />
    <path d="M0 0 L60 60 M60 0 L0 60" stroke="#fff" strokeWidth="12" />
    <path d="M0 0 L60 60 M60 0 L0 60" stroke="#C8102E" strokeWidth="4" />
    <path d="M30 0 V60 M0 30 H60" stroke="#fff" strokeWidth="20" />
    <path d="M30 0 V60 M0 30 H60" stroke="#C8102E" strokeWidth="12" />
  </>
);

// Nordic cross: field colour, cross colour, optional inner cross colour.
const nordic = (field, cross, inner) => (
  <>
    <rect width="60" height="60" fill={field} />
    <path d="M22 0 V60 M0 30 H60" stroke={cross} strokeWidth={inner ? 12 : 8} />
    {inner ? <path d="M22 0 V60 M0 30 H60" stroke={inner} strokeWidth="6" /> : null}
  </>
);

const ART = {
  GB: UNION_JACK,
  EU: (
    <>
      <rect width="60" height="60" fill="#003399" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
        return <circle key={i} cx={30 + Math.cos(a) * 18} cy={30 + Math.sin(a) * 18} r="2.6" fill="#FFCC00" />;
      })}
    </>
  ),
  US: (
    <>
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} y={(i * 60) / 13} width="60" height={60 / 13 + 0.2} fill={i % 2 ? "#fff" : "#B22234"} />
      ))}
      <rect width="30" height={(60 * 7) / 13} fill="#3C3B6E" />
    </>
  ),
  CH: (
    <>
      <rect width="60" height="60" fill="#DA291C" />
      <path d="M30 14 V46 M14 30 H46" stroke="#fff" strokeWidth="10" />
    </>
  ),
  CA: (
    <>
      <rect width="60" height="60" fill="#fff" />
      <rect width="15" height="60" fill="#D80621" />
      <rect x="45" width="15" height="60" fill="#D80621" />
      <path
        d="M30 15 L33 23 L38 20 L36 30 L42 28 L39 35 L32.5 34 L31.2 45 L28.8 45 L27.5 34 L21 35 L18 28 L24 30 L22 20 L27 23 Z"
        fill="#D80621"
      />
    </>
  ),
  AU: (
    <>
      <rect width="60" height="60" fill="#012169" />
      <g transform="scale(0.5)">{UNION_JACK}</g>
      <g fill="#fff">
        <circle cx="15" cy="45" r="3.4" />
        <circle cx="45" cy="47" r="2" />
        <circle cx="40" cy="30" r="2" />
        <circle cx="51" cy="24" r="2" />
        <circle cx="46" cy="14" r="1.8" />
      </g>
    </>
  ),
  DK: nordic("#C8102E", "#fff"),
  SE: nordic("#006AA7", "#FECC00"),
  NO: nordic("#BA0C2F", "#fff", "#00205B"),
  PL: (
    <>
      <rect width="60" height="30" fill="#fff" />
      <rect y="30" width="60" height="30" fill="#DC143C" />
    </>
  ),
  CZ: (
    <>
      <rect width="60" height="30" fill="#fff" />
      <rect y="30" width="60" height="30" fill="#D7141A" />
      <path d="M0 0 L32 30 L0 60 Z" fill="#11457E" />
    </>
  ),
  HU: (
    <>
      <rect width="60" height="20" fill="#CD2A3E" />
      <rect y="20" width="60" height="20" fill="#fff" />
      <rect y="40" width="60" height="20" fill="#436F4D" />
    </>
  ),
  JP: (
    <>
      <rect width="60" height="60" fill="#fff" />
      <circle cx="30" cy="30" r="12" fill="#BC002D" />
    </>
  ),
  GL: (
    <>
      <rect width="60" height="60" fill="#5E5CE6" />
      <g fill="none" stroke="#fff" strokeWidth="2.4" opacity="0.95">
        <circle cx="30" cy="30" r="17" />
        <ellipse cx="30" cy="30" rx="7.5" ry="17" />
        <path d="M13 30 H47" />
      </g>
    </>
  ),
};

export default function Flag({ code, size = 24, className = "flag" }) {
  const clip = useId();
  const ring = <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />;
  const art = ART[code] ?? ART.GL;
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" className={className}>
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
