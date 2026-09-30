// Stage.jsx — a still, Apple-style stage behind product visuals: a soft mesh
// gradient in Gleec purple and graphite with a little grain (Paper Shaders,
// Apache 2.0). Speed 0, so it never moves; the CSS background underneath shows
// until the GPU has drawn it, and stays if WebGL is unavailable.
import { useEffect, useState } from "react";
import { StaticMeshGradient } from "@paper-design/shaders-react";
import "./Stage.css";

// One palette per colour scheme; the stage reads as the same object in both.
// Mostly graphite (or pale grey) with a quiet purple glow, so a purple card on
// top still stands out. Picked from four variants side by side.
const PALETTES = {
  dark: ["#050507", "#121116", "#1d1a24", "#4a1fb0"],
  light: ["#fbfbfd", "#f2f2f7", "#ece4ff", "#c9adff"],
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
        grainMixer={0.12}
        grainOverlay={0.08}
        rotation={300}
        speed={0}
        maxPixelCount={1920 * 1080}
      />
      <div className="stage-content">{children}</div>
    </div>
  );
}
