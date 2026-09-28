// SegmentedControl.jsx — Apple-style segmented control: equal-width segments
// on a grey track, with a sliding thumb behind the selected one.
//
// mode="tabs"  → role=tablist/tab; pass `controls` (id of the tabpanel).
// mode="radio" → role=radiogroup/radio, for choosing a value inside a form.
// Arrow keys move and select (automatic activation); Home/End jump to the ends.
import { useRef } from "react";
import "./SegmentedControl.css";

export default function SegmentedControl({ label, options, value, onChange, mode = "tabs", controls, idPrefix, size }) {
  const ref = useRef(null);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const isTabs = mode === "tabs";
  const selectedIndex = options.findIndex((o) => o.value === value);

  const onKeyDown = (e) => {
    const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
    const buttons = Array.from(ref.current?.querySelectorAll("button") ?? []);
    const from = Math.max(0, buttons.indexOf(document.activeElement)); // move from the focused segment
    let next = null;
    if (e.key in keys) next = (from + keys[e.key] + options.length) % options.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = options.length - 1;
    if (next === null) return;
    e.preventDefault();
    onChange(options[next].value);
    buttons[next]?.focus();
  };

  return (
    <div
      ref={ref}
      className={"segmented" + (size === "large" ? " segmented-large" : "")}
      role={isTabs ? "tablist" : "radiogroup"}
      aria-label={label}
      style={{ "--count": options.length, "--index": index }}
      onKeyDown={onKeyDown}
    >
      <span className={"segmented-thumb" + (selectedIndex === -1 ? " is-empty" : "")} aria-hidden="true" />
      {options.map((o, i) => {
        const selected = o.value === value;
        const focusable = selectedIndex === -1 ? i === 0 : selected;
        return (
          <button
            key={o.value}
            type="button"
            id={idPrefix ? `${idPrefix}-${o.value}` : undefined}
            role={isTabs ? "tab" : "radio"}
            aria-selected={isTabs ? selected : undefined}
            aria-checked={isTabs ? undefined : selected}
            aria-controls={isTabs ? controls : undefined}
            tabIndex={focusable ? 0 : -1}
            className={"segmented-item" + (selected ? " is-selected" : "")}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
