// Flag.jsx — small circular flags (decorative; the adjacent text is the label).
// Artwork: circle-flags (MIT, github.com/HatScripts/circle-flags), inlined at build
// time for the codes the site uses. GL is our own globe for "other / global".
import { useId } from "react";

// Only these flags are bundled; add a code here to use it anywhere on the site.
const RAW = import.meta.glob(
  "/node_modules/circle-flags/flags/{gb,eu,us,ch,ca,au,dk,se,no,pl,cz,hu,jp,at,be,bg,hr,cy,ee,fi,fr,de,gr,is,ie,it,lv,li,lt,lu,mt,nl,pt,ro,sk,si,es}.svg",
  { query: "?raw", import: "default", eager: true },
);

// Each file is a 512×512 SVG masked to a circle by `<mask id="a">`; keep only the artwork
// (Flag clips it itself, so ids never clash when many flags share a page).
const ART = Object.fromEntries(
  Object.entries(RAW).map(([path, svg]) => [
    path.slice(-6, -4).toUpperCase(),
    svg
      .replace(/^<svg[^>]*>/, "")
      .replace(/<\/svg>\s*$/, "")
      .replace(/<mask id="a">[\s\S]*?<\/mask>/, "")
      .replace(' mask="url(#a)"', ""),
  ]),
);

const GLOBE = (
  <>
    <rect width="60" height="60" fill="#5E5CE6" />
    <g fill="none" stroke="#fff" strokeWidth="2.4" opacity="0.95">
      <circle cx="30" cy="30" r="17" />
      <ellipse cx="30" cy="30" rx="7.5" ry="17" />
      <path d="M13 30 H47" />
    </g>
  </>
);

export default function Flag({ code, size = 24, className = "flag" }) {
  const clip = useId();
  const art = ART[code];
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" aria-hidden="true" className={className}>
      <defs>
        <clipPath id={clip}>
          <circle cx="30" cy="30" r="30" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {art ? <g transform="scale(0.1171875)" dangerouslySetInnerHTML={{ __html: art }} /> : GLOBE}
      </g>
      <circle cx="30" cy="30" r="29.5" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
    </svg>
  );
}
