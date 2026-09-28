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
  Globe,
  LoaderCircle,
  Search,
  Send,
  ShieldCheck,
  TriangleAlert,
  Vault,
  X,
  Zap,
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
  globe: Globe,
  loader: LoaderCircle,
  search: Search,
  send: Send,
  "shield-check": ShieldCheck,
  "triangle-alert": TriangleAlert,
  vault: Vault,
  x: X,
  zap: Zap,
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
