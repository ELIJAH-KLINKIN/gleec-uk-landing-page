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
  Code,
  CreditCard,
  FileSpreadsheet,
  FileText,
  LoaderCircle,
  Pause,
  Play,
  Search,
  ShieldCheck,
  TriangleAlert,
  Users,
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
  code: Code,
  "credit-card": CreditCard,
  "file-spreadsheet": FileSpreadsheet,
  "file-text": FileText,
  loader: LoaderCircle,
  pause: Pause,
  play: Play,
  search: Search,
  "shield-check": ShieldCheck,
  "triangle-alert": TriangleAlert,
  users: Users,
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
