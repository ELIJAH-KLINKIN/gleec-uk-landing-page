// demoMedia.js — the media shown for each hero demo tab.
//   desktop: full app window stills (light + dark), 2000 × 1250
//   mobile:  the app's detail panel for that area (light + dark), 760 × 1292 —
//            phone-shaped and readable at phone width (≤600px)
// `video`: a screen recording per colour scheme ({ mp4, poster }) and its length
// in seconds. It plays on wider screens only (phones keep the stills to save
// data), and the hero keeps that tab up for the whole recording. Recorded from
// the banking app by scripts/demo/record-accounts.cjs (2000 × 1250, ~0.4 MB).
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
import accountsVideoDark from "../assets/demo/accounts-dark.mp4";
import accountsVideoLight from "../assets/demo/accounts-light.mp4";
import accountsPosterDark from "../assets/demo/accounts-dark-poster.webp";
import accountsPosterLight from "../assets/demo/accounts-light-poster.webp";

export const DEMO_MEDIA = {
  accounts: {
    light: accountsLight,
    dark: accountsDark,
    mobile: { light: accountsLightMobile, dark: accountsDarkMobile },
    video: {
      dark: { mp4: accountsVideoDark, poster: accountsPosterDark },
      light: { mp4: accountsVideoLight, poster: accountsPosterLight },
      seconds: 17,
    },
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
// Wider than a phone: where recordings play instead of stills.
export const VIDEO_QUERY = "(min-width: 601px)";
