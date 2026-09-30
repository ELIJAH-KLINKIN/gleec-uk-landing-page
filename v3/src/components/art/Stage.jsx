// Stage.jsx — a still, Apple-style stage behind product visuals: a soft mesh
// gradient in Gleec purple and graphite with a little grain (Paper Shaders,
// Apache 2.0). Speed 0, so it never moves; the CSS background underneath shows
// until the GPU has drawn it, and stays if WebGL is unavailable.
import { useEffect, useState } from "react";
import { StaticMeshGradient } from "@paper-design/shaders-react";
import "./Stage.css";

// One palette per colour scheme; the stage reads as the same object in both.
// Quiet on purpose ("use shaders more concisely"): near-black graphite (or pale
// grey) with only a faint purple glow, so the phone and the cards carry the colour.
const PALETTES = {
  dark: ["#050507", "#08080b", "#0c0b10", "#170b3a"],
  light: ["#fbfbfd", "#f8f8fa", "#f4f1fb", "#ebe4fb"],
};

function useColorScheme() {
  const [scheme, setScheme] = useState("dark");
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setScheme(mq.matches ? "dark" : "light");
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return scheme;
}

export default function Stage({ className = "", children }) {
  const scheme = useColorScheme();
  return (
    <div className={`stage stage-${scheme} ${className}`}>
      <StaticMeshGradient
        className="stage-bg"
        aria-hidden="true"
        colors={PALETTES[scheme]}
        positions={70}
        waveX={0.6}
        waveXShift={0.2}
        waveY={0.9}
        waveYShift={0.35}
        mixing={0.85}
        grainMixer={0.06}
        grainOverlay={0.03}
        rotation={300}
        speed={0}
        maxPixelCount={1920 * 1080}
      />
      <div className="stage-content">{children}</div>
    </div>
  );
}
