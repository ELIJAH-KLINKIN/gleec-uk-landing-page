// DemoScreen.jsx — one demo in the hero frame: a still (light + dark
// variants) or, once recordings exist, a muted looping video that only plays
// while its tab is showing. Inactive screens fade out and are hidden from
// assistive tech.
import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "../lib/motion.js";

export default function DemoScreen({ media, size, active, eager, alt }) {
  const videoRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const showVideo = Boolean(media.video) && !reducedMotion;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.play().catch(() => {}); // autoplay can be refused; the poster still shows
    } else {
      v.pause();
    }
  }, [active]);

  return (
    <div className={"demo-screen" + (active ? " is-active" : "")} aria-hidden={!active}>
      {showVideo ? (
        <video
          ref={videoRef}
          muted
          loop
          playsInline
          preload={eager ? "auto" : "metadata"}
          poster={media.light}
          width={size.width}
          height={size.height}
          aria-label={alt}
        >
          {media.video.webm ? <source src={media.video.webm} type="video/webm" /> : null}
          <source src={media.video.mp4} type="video/mp4" />
        </video>
      ) : (
        <picture>
          <source srcSet={media.dark} media="(prefers-color-scheme: dark)" />
          <img
            src={media.light}
            alt={alt}
            width={size.width}
            height={size.height}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={eager ? "high" : undefined}
          />
        </picture>
      )}
    </div>
  );
}
