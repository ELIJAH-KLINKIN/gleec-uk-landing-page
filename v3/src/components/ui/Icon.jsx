// Icon.jsx — SF Symbols stand-ins from lucide (tree-shaken: only these ship).
// Icons are decorative by default; give the control around them a label.
import {
  Activity,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CreditCard,
  LoaderCircle,
  Search,
  ShieldCheck,
  TriangleAlert,
  Vault,
  X,
} from "lucide-react";

const ICONS = {
  activity: Activity,
  "arrow-down-left": ArrowDownLeft,
  "arrow-left-right": ArrowLeftRight,
  "arrow-up-right": ArrowUpRight,
  check: Check,
  "chevron-down": ChevronDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "circle-alert": CircleAlert,
  "credit-card": CreditCard,
  loader: LoaderCircle,
  search: Search,
  "shield-check": ShieldCheck,
  "triangle-alert": TriangleAlert,
  vault: Vault,
  x: X,
};

export default function Icon({ name, size = 20, strokeWidth = 2, className }) {
  const Glyph = ICONS[name];
  if (!Glyph) {
    if (import.meta.env.DEV) console.warn(`<Icon>: unknown icon "${name}"`);
    return null;
  }
  return (
    <Glyph
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden="true"
      focusable="false"
      absoluteStrokeWidth={false}
    />
  );
}
