// Icon.jsx — Lucide icons, tree-shaken: only the icons listed here ship.
// Usage: <Icon name="arrow-right" size={14} />
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  CircleAlert,
  Copy,
  CreditCard,
  Globe,
  LoaderCircle,
  Menu,
  Minus,
  Pause,
  Play,
  Plus,
  Search,
  Send,
  Share,
  ShieldCheck,
  Vault,
  X,
  Zap,
} from "lucide-react";

const ICONS = {
  activity: Activity,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  bell: Bell,
  check: Check,
  "chevron-down": ChevronDown,
  "circle-alert": CircleAlert,
  copy: Copy,
  "credit-card": CreditCard,
  globe: Globe,
  loader: LoaderCircle,
  menu: Menu,
  minus: Minus,
  pause: Pause,
  play: Play,
  plus: Plus,
  search: Search,
  send: Send,
  share: Share,
  "shield-check": ShieldCheck,
  vault: Vault,
  x: X,
  zap: Zap,
};

export default function Icon({ name, size = 20, color = "currentColor", strokeWidth = 1.75, className = "", style }) {
  const Glyph = ICONS[name];
  if (!Glyph) {
    if (import.meta.env.DEV) console.warn(`<Icon>: unknown icon "${name}"`);
    return null;
  }
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", ...style }} aria-hidden="true">
      <Glyph size={size} color={color} strokeWidth={strokeWidth} focusable="false" />
    </span>
  );
}
