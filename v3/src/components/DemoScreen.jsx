// DemoScreen.jsx — one demo in the hero frame.
// Phones get a phone-shaped crop of the app's detail panel; wider screens get
// the full app window. Both have light + dark variants (art-directed <picture>).
// When a screen recording exists it plays — muted, looping, only while its tab
// is showing, in the visitor's colour scheme — on wider screens without Reduce
// Motion; phones keep the still.
import { useEffect, useRef } from "react";
import { PHONE_QUERY, VIDEO_QUERY } from "../lib/demoMedia.js";
import { usePrefersReducedMotion } from "../lib/motion.js";
import { useMediaQuery } from "../lib/useMediaQuery.js";

export default function DemoScreen({ media, size, active, eager, alt }) {
  const videoRef = useRef(null);
  const reducedMotion = usePrefersReducedMotion();
  const phone = useMediaQuery(PHONE_QUERY);
  const wide = useMediaQuery(VIDEO_QUERY); // false until hydrated, so SSR renders the still
  const dark = useMediaQuery("(prefers-color-scheme: dark)");
  const showVideo = Boolean(media.video) && wide && !phone && !reducedMotion;
  const clip = media.video ? (dark ? media.video.dark : media.video.light) : null;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.currentTime = 0;
      v.play().catch(() => {}); // autoplay can be refused; the poster still shows
    } else {
      v.pause();
    }
  }, [active, showVideo, dark]);

  return (
    <div className={"demo-screen" + (active ? " is-active" : "")} aria-hidden={!active}>
      {showVideo ? (
        <video
          key={clip.mp4} // a new colour scheme loads its own recording
          ref={videoRef}
          muted
          loop
          playsInline
          preload={eager ? "auto" : "metadata"}
          poster={clip.poster}
          width={size.width}
          height={size.height}
          aria-label={alt}
        >
          <source src={clip.mp4} type="video/mp4" />
        </video>
      ) : (
        <picture>
          <source srcSet={media.mobile.dark} media={`${PHONE_QUERY} and (prefers-color-scheme: dark)`} />
          <source srcSet={media.mobile.light} media={PHONE_QUERY} />
          <source srcSet={media.dark} media="(prefers-color-scheme: dark)" />
          <img
            src={media.light}
            alt={alt}
            width={size.width}
            height={size.height}
            loading={eager ? "eager" : "lazy"}
            decoding={eager ? "sync" : "async"}
            fetchPriority={eager ? "high" : undefined}
          />
        </picture>
      )}
    </div>
  );
}
