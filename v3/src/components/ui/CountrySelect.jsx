// CountrySelect.jsx — a pop-up button that opens a list of countries with round flags
// (a native <select> can't show images). Button + listbox pattern:
//   button: Enter / Space / ↓ / ↑ open the list;
//   list:   ↑ ↓ Home End move, a letter jumps to the next country starting with it,
//           Enter / Space choose, Esc / Tab close. Clicking outside closes.
import { useEffect, useId, useRef, useState } from "react";
import { COUNTRIES } from "../../lib/countries.js";
import Flag from "./Flag.jsx";
import Icon from "./Icon.jsx";
import "./CountrySelect.css";

export default function CountrySelect({ id, name, labelId, value, onChange, placeholder = "Choose…" }) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const buttonRef = useRef(null);
  const listRef = useRef(null);
  const wrapRef = useRef(null);
  const selected = COUNTRIES.find((c) => c.name === value);
  const optionId = (i) => `${uid}-opt-${i}`;

  const openList = (index) => {
    setActive(index ?? Math.max(0, COUNTRIES.indexOf(selected)));
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };
  const choose = (i) => {
    onChange(COUNTRIES[i].name);
    close();
  };

  // Focus the list when it opens and keep the active option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus({ preventScroll: true });
    listRef.current?.scrollIntoView({ block: "nearest" });
  }, [open]);
  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  });

  // Click or tap outside closes without choosing.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) close(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const onButtonKey = (e) => {
    if (["ArrowDown", "ArrowUp"].includes(e.key)) {
      e.preventDefault();
      openList();
    }
  };

  const onListKey = (e) => {
    const last = COUNTRIES.length - 1;
    const move = { ArrowDown: active + 1, ArrowUp: active - 1, Home: 0, End: last }[e.key];
    if (move !== undefined) {
      e.preventDefault();
      setActive(Math.min(last, Math.max(0, move)));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "Tab") {
      close(false);
    } else if (/^\p{L}$/u.test(e.key)) {
      const letter = e.key.toLowerCase();
      const order = [...COUNTRIES.keys()].map((k) => (active + 1 + k) % COUNTRIES.length);
      const next = order.find((i) => COUNTRIES[i].name.toLowerCase().startsWith(letter));
      if (next !== undefined) setActive(next);
    }
  };

  return (
    <div className="cs" ref={wrapRef}>
      <button
        ref={buttonRef}
        id={id}
        name={name}
        type="button"
        className={"cs-button" + (selected ? "" : " is-empty")}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${id}`}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onButtonKey}
      >
        {selected ? <Flag code={selected.code} size={22} /> : null}
        <span className="cs-value">{selected ? selected.name : placeholder}</span>
        <Icon name="chevron-down" size={16} strokeWidth={2.4} className="cs-chevron" />
      </button>

      {open ? (
        <ul
          ref={listRef}
          className="cs-list"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={optionId(active)}
          onKeyDown={onListKey}
        >
          {COUNTRIES.map((c, i) => (
            // Keys are handled once on the listbox (aria-activedescendant), not per option.
            // eslint-disable-next-line jsx-a11y/click-events-have-key-events
            <li
              key={c.code}
              id={optionId(i)}
              role="option"
              aria-selected={c === selected}
              className={"cs-option" + (i === active ? " is-active" : "")}
              onPointerMove={() => i !== active && setActive(i)}
              onClick={() => choose(i)}
            >
              <Flag code={c.code} size={22} />
              <span className="cs-name">{c.name}</span>
              {c === selected ? <Icon name="check" size={16} strokeWidth={2.6} className="cs-check" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
