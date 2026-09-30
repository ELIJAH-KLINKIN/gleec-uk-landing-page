// BrandMetal.jsx — the Gleec G in liquid metal (Paper Shaders), used once as a
// brand moment. A still frame (speed 0), so it never moves; transparent
// background, so it sits on either colour scheme. Decorative.
import { LiquidMetal } from "@paper-design/shaders-react";
import mask from "../../assets/logo-g-mask.png";

export default function BrandMetal({ size = 96, className = "" }) {
  return (
    <div className={`brand-metal ${className}`} aria-hidden="true" style={{ width: size, height: size * 1.35 }}>
      <LiquidMetal
        image={mask}
        colorBack="#00000000"
        colorTint="#ffffff"
        repetition={2}
        softness={0.12}
        shiftRed={0.25}
        shiftBlue={0.35}
        distortion={0.08}
        contour={0.45}
        angle={70}
        fit="contain"
        scale={0.92}
        speed={0}
        frame={4200}
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
