// galleryMotion.js — tells animated tile art that the visitor pressed the
// gallery's Pause (WCAG 2.2.2): true while paused, so the drawings hold still.
import { createContext } from "react";

export const GalleryPaused = createContext(false);
