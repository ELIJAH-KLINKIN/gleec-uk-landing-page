// RotatingPhrase.jsx — the headline's changing first line.
// All phrases share one grid cell, so the line is always as wide as the
// longest phrase and nothing around it moves. The current phrase rises in
// letter by letter out of a soft blur; the previous one lifts away. Purely
// visual (aria-hidden): the heading carries a stable sentence for screen readers.
import { useEffect, useState } from "react";
import "./RotatingPhrase.css";

export default function RotatingPhrase({ phrases, index }) {
  // Remember which phrase is leaving, updated during render so the old phrase
  // switches to "out" in the same frame the new one switches to "in".
  const [shown, setShown] = useState(index);
  const [previous, setPrevious] = useState(null);
  if (index !== shown) {
    setPrevious(shown);
    setShown(index);
  }

  // Once it has faded out, the old phrase goes back to waiting (invisibly).
  useEffect(() => {
    if (previous === null) return undefined;
    const t = setTimeout(() => setPrevious(null), 900);
    return () => clearTimeout(t);
  }, [previous, shown]);

  return (
    <span className="rot" aria-hidden="true">
      {phrases.map((phrase, i) => {
        const state = i === shown ? "in" : i === previous ? "out" : "wait";
        return (
          <span key={phrase} className="rot-phrase" data-state={state}>
            {Array.from(phrase).map((ch, j) => (
              <span key={j} className="rot-ch" style={{ "--i": j }}>
                {ch === " " ? " " : ch}
              </span>
            ))}
          </span>
        );
      })}
    </span>
  );
}
