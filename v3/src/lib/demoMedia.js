// demoMedia.js — the media shown for each hero demo tab.
//   desktop: full app window stills (light + dark), 2000 × 1250
//   mobile:  the app's detail panel for that area (light + dark), 760 × 1292 —
//            phone-shaped and readable at phone width (≤600px)
// Add `video` ({ mp4, webm? }) per demo when screen recordings arrive: it plays
// on wider screens only (phones keep the stills to save data), with the
// desktop still as its poster.
import accountsLight from "../assets/demo/accounts-light.webp";
import accountsDark from "../assets/demo/accounts-dark.webp";
import accountsLightMobile from "../assets/demo/accounts-light-mobile.webp";
import accountsDarkMobile from "../assets/demo/accounts-dark-mobile.webp";
import cardsLight from "../assets/demo/cards-light.webp";
import cardsDark from "../assets/demo/cards-dark.webp";
import cardsLightMobile from "../assets/demo/cards-light-mobile.webp";
import cardsDarkMobile from "../assets/demo/cards-dark-mobile.webp";
import paymentsLight from "../assets/demo/payments-light.webp";
import paymentsDark from "../assets/demo/payments-dark.webp";
import paymentsLightMobile from "../assets/demo/payments-light-mobile.webp";
import paymentsDarkMobile from "../assets/demo/payments-dark-mobile.webp";

export const DEMO_MEDIA = {
  accounts: {
    light: accountsLight,
    dark: accountsDark,
    mobile: { light: accountsLightMobile, dark: accountsDarkMobile },
    video: null,
  },
  cards: {
    light: cardsLight,
    dark: cardsDark,
    mobile: { light: cardsLightMobile, dark: cardsDarkMobile },
    video: null,
  },
  payments: {
    light: paymentsLight,
    dark: paymentsDark,
    mobile: { light: paymentsLightMobile, dark: paymentsDarkMobile },
    video: null,
  },
};

export const DEMO_SIZE = { width: 2000, height: 1250 };
export const DEMO_SIZE_MOBILE = { width: 760, height: 1292 };

// Must match the phone breakpoint in Hero.css.
export const PHONE_QUERY = "(max-width: 600px)";
