// demoMedia.js — the media shown for each hero demo tab.
// Stills now; add `video` ({ mp4, webm }) per demo when the screen recordings
// arrive — DemoScreen plays the video and uses the still as its poster.
import accountsLight from "../assets/demo/accounts-light.webp";
import accountsDark from "../assets/demo/accounts-dark.webp";
import cardsLight from "../assets/demo/cards-light.webp";
import cardsDark from "../assets/demo/cards-dark.webp";
import paymentsLight from "../assets/demo/payments-light.webp";
import paymentsDark from "../assets/demo/payments-dark.webp";

export const DEMO_MEDIA = {
  accounts: { light: accountsLight, dark: accountsDark, video: null },
  cards: { light: cardsLight, dark: cardsDark, video: null },
  payments: { light: paymentsLight, dark: paymentsDark, video: null },
};

// Pixel size of the stills (2× the largest size the frame is drawn at).
export const DEMO_SIZE = { width: 2000, height: 1250 };
