# GLEEC Business: landing page v3 (product-demo hero)

Version 3 is [v2](../v2/README.md), the Apple HIG redesign, with a different
hero. Under the headline sits a framed **product demo** with a pill tab bar:
**Accounts · Cards · Payments**. It uses the same content and the same lead
API (`../leads-api`).

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # prerendered production build → dist/
npm run check      # lint + format + build + end-to-end tests
```

## The demo

- It advances every **7 seconds**, with a progress fill inside the current pill.
- Once a visitor picks a tab, it stays on their choice and stops auto-advancing.
- It doesn't advance while hovered, keyboard-focused, off screen, in a
  background browser tab, or when Reduce Motion is on.
- Keyboard: the arrow keys and Home/End move between tabs (WAI-ARIA tabs).

### Media

The stills live in `src/assets/demo/{accounts,cards,payments}-{light,dark}.webp`
at 2000 × 1250. Dark-mode visitors get the `-dark` variant.

To switch to screen recordings, add them per demo in `src/lib/demoMedia.js`:

```js
import accountsMp4 from "../assets/demo/accounts.mp4";
accounts: { light: accountsLight, dark: accountsDark, video: { mp4: accountsMp4 } },
```

`DemoScreen` plays the video muted and looping, only while its tab is showing,
with the still as its poster. Under Reduce Motion it shows the still instead.
Aim for about 7-second loops, 16:10 framing, a 1440 × 900 app window, H.264
MP4 under ~2 MB each.

The screens come from the crypto-free branch (`no-crypto`) of the banking app.
