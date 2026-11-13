// middleware.ts — password gate for the whole site. One personal password per person, kept only in the
// env var SITE_PASSWORDS ("name:password,name:password"). Spec: ~/*design-guidelines/passwordpage.md
export const config = {
  matcher: ["/((?!favicon\\.ico|favicon-32\\.png|apple-touch-icon\\.png|icon-192\\.png).*)"], // the sign-in page's own icons stay public
};

const COOKIE = "site_access";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const LOGIN = "/__login";
const LOGOUT = "/__logout";
const KEY = "GLEEC-PAY-UK/v1"; // any constant per site; change it to sign everyone out

type Person = { name: string; token: string };

async function token(password: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(KEY), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(password));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}
function same(a: string, b: string): boolean {
  // constant-time compare
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
async function people(): Promise<Person[]> {
  // none set: nothing opens (fail closed)
  const out: Person[] = [];
  for (const part of (process.env.SITE_PASSWORDS || "").split(",")) {
    const i = part.indexOf(":");
    const name = part.slice(0, i).trim(),
      pw = part.slice(i + 1).trim();
    if (i > 0 && pw) out.push({ name, token: await token(pw) });
  }
  return out;
}
function who(list: Person[], t: string): Person | undefined {
  // compares against everyone, no early exit
  let hit: Person | undefined;
  for (const p of list) if (same(p.token, t)) hit = p;
  return hit;
}
function cookie(req: Request, name: string): string {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : "";
}
function safeNext(v: unknown): string {
  // only same-site paths, never the login routes
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/__") ? s : "/";
}

export default async function middleware(req: Request) {
  const url = new URL(req.url);
  const list = await people();

  if (url.pathname === LOGOUT) {
    return new Response(null, {
      status: 303,
      headers: { Location: "/", "Set-Cookie": `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` },
    });
  }
  if (url.pathname === LOGIN && req.method === "POST") {
    const form = new URLSearchParams(await req.text()); // parse the body as text; formData() is unreliable here
    const next = safeNext(form.get("next"));
    const t = await token(form.get("password") || "");
    const person = who(list, t);
    if (person) {
      console.log(`sign-in: ${person.name}`); // shows in the project's runtime logs, who opened the site
      return new Response(null, {
        status: 303,
        headers: {
          Location: next,
          "Set-Cookie": `${COOKIE}=${t}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`,
        },
      });
    }
    await new Promise((r) => setTimeout(r, 700)); // slows down guessing
    return page(401, true, next);
  }
  if (who(list, cookie(req, COOKIE))) {
    if (url.pathname === LOGIN) return Response.redirect(new URL("/", req.url), 303);
    return; // signed in: carry on to the page
  }
  if (url.pathname.startsWith("/api/"))
    return new Response("Password required", { status: 401, headers: { "Cache-Control": "no-store" } });
  return page(401, false, url.pathname === LOGIN ? "/" : url.pathname + url.search);
}

function page(status: number, wrong: boolean, next: string): Response {
  const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);
  const html = PAGE_HTML.replace("{{NEXT}}", esc(next))
    .replace('<div class="field">', `<div class="field${wrong ? " err" : ""}">`)
    .replace('aria-describedby="msg">', `aria-describedby="msg"${wrong ? ' aria-invalid="true"' : ""}>`)
    .replace(
      '<p class="msg" id="msg" role="alert"></p>',
      `<p class="msg" id="msg" role="alert">${wrong ? "Incorrect password. Try again." : ""}</p>`,
    );
  return new Response(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

const PAGE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow">
<meta name="color-scheme" content="light dark">
<title>Gleec Pay</title>
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<style>
:root {
  --bg: #f5f5f7; --card: #fff; --ink: #1d1d1f; --ink2: #6e6e73; --line: #d2d2d7; --focus: #0071e3; --err: #e30000;
  --sf: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --sfd: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #000; --card: #1c1c1e; --ink: #f5f5f7; --ink2: #a1a1a6; --line: #424245; --focus: #2997ff; --err: #ff453a; }
}
* { box-sizing: border-box; margin: 0; }
html, body { height: 100%; }
body { background: var(--bg); color: var(--ink); font: 400 17px/1.47 var(--sf); letter-spacing: -0.022em; -webkit-font-smoothing: antialiased;
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; min-height: 100dvh; padding: 24px 16px; }
main { width: 100%; max-width: 480px; text-align: center; animation: rise .6s cubic-bezier(.2,.8,.2,1) both; }
@keyframes rise { from { opacity: 0; transform: translateY(12px); } }
.mark { width: 72px; height: 72px; margin: 0 auto 28px; display: block; border-radius: 16px; box-shadow: 0 8px 24px rgba(230, 30, 30, .25); }
h1 { font: 600 40px/1.1 var(--sfd); letter-spacing: -0.003em; }
.grad { background: linear-gradient(90deg, #ff6a4d 0%, #e61e1e 55%, #b3121f 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { margin-top: 14px; color: var(--ink2); font-size: 19px; line-height: 1.42; letter-spacing: 0.012em; }
form { margin: 36px auto 0; max-width: 360px; }
.field { position: relative; display: flex; align-items: center; background: var(--card); border: 1px solid var(--line); border-radius: 12px; height: 56px;
  transition: border-color .2s, box-shadow .2s; }
.field:focus-within { border-color: var(--focus); box-shadow: 0 0 0 4px color-mix(in srgb, var(--focus) 22%, transparent); }
.field.err { border-color: var(--err); animation: shake .4s; }
.field.err:focus-within { box-shadow: 0 0 0 4px color-mix(in srgb, var(--err) 18%, transparent); }
@keyframes shake { 20%, 60% { transform: translateX(-8px); } 40%, 80% { transform: translateX(8px); } }
label { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--ink2); font-size: 17px; pointer-events: none; transition: all .15s ease; }
input { flex: 1; min-width: 0; height: 100%; border: 0; outline: 0; background: transparent; color: var(--ink); font: 400 17px var(--sf); padding: 18px 8px 0 16px; border-radius: 12px; }
input:focus + label, input:not(:placeholder-shown) + label { top: 16px; font-size: 12px; }
button { flex: none; width: 36px; height: 36px; margin-right: 10px; border: 0; border-radius: 50%; background: transparent; color: var(--ink2); cursor: pointer;
  display: grid; place-items: center; transition: color .2s, background .2s; position: relative; }
button::after { content: ""; position: absolute; inset: -4px; }
input:not(:placeholder-shown) ~ button { color: var(--focus); }
@media (hover: hover) { button:hover { background: color-mix(in srgb, var(--ink2) 12%, transparent); } }
button svg { width: 26px; height: 26px; }
.msg { min-height: 22px; margin-top: 12px; font-size: 14px; color: var(--err); }
footer { margin-top: 56px; font-size: 12px; color: var(--ink2); letter-spacing: -0.01em; }
@media (max-width: 734px) { h1 { font-size: 32px; line-height: 1.125; } .sub { font-size: 17px; } .mark { width: 64px; height: 64px; } }
@media (prefers-reduced-motion: reduce) { main, .field.err { animation: none; } }
</style>
</head>
<body>
<main>
  <img class="mark" src="/icon-192.png" alt="Gleec Pay">
  <h1>Gleec <span class="grad">Pay.</span></h1>
  <p class="sub">Internal to Gleec. Enter your password to continue.</p>
  <form method="post" action="/__login">
    <input type="hidden" name="next" id="next" value="{{NEXT}}">
    <div class="field">
      <input type="password" name="password" id="pw" placeholder=" " autocomplete="current-password" required autofocus aria-describedby="msg">
      <label for="pw">Password</label>
      <button type="submit" aria-label="Continue"><svg viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12.2 9.2 17 14l-4.8 4.8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
    </div>
    <p class="msg" id="msg" role="alert"></p>
  </form>
  <footer>Gleec · Internal · Nov 2026</footer>
</main>
<script>
  // Keep the section the link pointed to (#…) after signing in
  if (location.hash) { var n = document.getElementById('next'); n.value = n.value.split('#')[0] + location.hash; }
</script>
</body>
</html>`;
