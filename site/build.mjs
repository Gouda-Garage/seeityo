// See It Yo site builder. Zero tracking. Run: node build.mjs  (INCLUDE_FUTURE=1 to preview scheduled articles)
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
if (process.env.SITE_BASE !== undefined) cfg.base = process.env.SITE_BASE;
if (process.env.SITE_ORIGIN) cfg.origin = process.env.SITE_ORIGIN;
const DIST = path.join(ROOT, "dist");
// If the latest APK was fetched into src/static, serve it from the site itself so visitors never see GitHub.
const STATIC = path.join(ROOT, "src/static");
if (fs.existsSync(path.join(STATIC, "SeeItYo.apk"))) cfg.apkUrl = `${cfg.base}/SeeItYo.apk`;
const TODAY = new Date().toISOString().slice(0, 10);
const FUTURE = process.env.INCLUDE_FUTURE === "1";

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const href = (p) => `${cfg.base}${p}`;
const abs = (p) => `${cfg.origin}${cfg.base}${p}`;
const write = (p, s) => { const f = path.join(DIST, p); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };
const copy = (from, to) => { const f = path.join(DIST, to); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(from, f); };
const fmtDate = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// ---------- assets ----------
const fonts = [
  ["inter", "inter-latin-400-normal.woff2"], ["inter", "inter-latin-600-normal.woff2"], ["inter", "inter-latin-800-normal.woff2"], ["inter", "inter-latin-900-normal.woff2"],
  ["rye", "rye-latin-400-normal.woff2"],
  ["shrikhand", "shrikhand-latin-400-normal.woff2"],
  ["space-mono", "space-mono-latin-400-normal.woff2"],
  ["space-mono", "space-mono-latin-700-normal.woff2"],
];
for (const [pkg, file] of fonts) copy(path.join(ROOT, "node_modules/@fontsource", pkg, "files", file), `fonts/${file}`);
if (fs.existsSync(STATIC)) for (const f of fs.readdirSync(STATIC)) copy(path.join(STATIC, f), f);
copy(path.join(ROOT, "src/css/style.css"), "css/style.css");
copy(path.join(ROOT, "src/js/site.js"), "js/site.js");
copy(path.join(ROOT, "src/js/scenes.js"), "js/scenes.js");
// fix relative font URLs: css lives in /css, fonts in /fonts -> ../fonts works as written

// ---------- shared facts (single source of truth) ----------
const FAQ = [
  ["Is it safe to install? My phone is showing a warning.", "The warning is Android being careful about any app that doesn't come from Google Play. It isn't a verdict on this one. See It Yo asks for only two permissions, camera and vibration, and no internet permission, so it can't upload or send anything. No account, no ads, no tracking, and it saves no photos. The source code is public so anyone can check. You can also uninstall it any time like any other app. A Google Play version is coming so this warning goes away."],
  ["Does it save my photos?", "No. Frames exist only while you're looking at them. Close the app and they're gone. There's no gallery, no account and no upload. The app doesn't even ask Android for internet permission."],
  ["Does it read the text out loud or \"understand\" it?", "No. There is no OCR and no AI. It makes things bigger and brighter. That's the whole product."],
  ["Why not just use my camera app?", "You can. But the camera app makes you open it, find the zoom, pinch around and hope the flash is on. See It Yo opens already zoomed in, turns the light on by itself when it's dark, and freezes the picture with one tap."],
  ["Will it work on the TV across the room?", "That's the test we're running right now: reading captions and scores from the couch in a dark room. Try it on your phone and tell us how it went."],
  ["Can I set it for my reading glasses?", "Yes. The first time you open it, pick the strength of readers you normally use (the + number on the sticker, like +1.50 or +2.00). It opens at a zoom that fits and remembers your choice on your phone, so you never set it again. You can change it any time in Settings. It only sets a starting zoom. It isn't a prescription and it isn't medical advice."],
  ["Is it a medical thing?", "No. It's a magnifier. Don't rely on it alone for medicine labels, dosages or safety warnings. If it matters, ask a pharmacist or a person."],
  ["What phones does it work on?", `Android ${cfg.minAndroid} or newer with a rear camera. A flashlight helps in the dark but isn't required.`],
  ["Is it free?", "Yes. It's free while we test. If that ever changes, we'll say so here first."],
  ["Why isn't it on Google Play?", "It's coming. We're testing with real people first so it's good by the time it gets there. For now you install the file directly, and your phone will warn you because the file isn't from the store yet."],
];
const FINE = [
  ["MENU & WINE LIST", "Restaurant menus are printed at a size chosen by a person who has never needed glasses and never will. The wine list, set in a tasteful grey, has been engineered to be read by nobody over forty. Prices are subject to change without notice, and so is your patience. The special of the day is whatever is written on the chalkboard behind the bar, forty feet away, in handwriting that was clearly a dare. Entrees are served with your choice of two sides, which are listed in a font that does not believe in you."],
  ["INGREDIENTS", "Ingredient labels on medicine, soup, glue and sunscreen are set in a typeface so small it should be classified as a rumor. May contain traces of things. Manufactured in a facility that also manufactures other facilities. Best before the date printed on the bottom, in ink the color of the bottom. Do not use if seal is broken, or if you cannot find the seal, or if you cannot find the bottle."],
  ["WARRANTY & RETURNS", "Warranty cards, return policies, assembly instructions, the model number on the back of the router, the cooking time on the frozen pizza: all of it, deliberately, annoyingly, tiny. Void where prohibited, void where permitted, void if you squint. Returns accepted within thirty days with the original receipt, which has faded to the exact shade of the paper it is printed on."],
  ["THE TV ACROSS THE ROOM", "The name of the movie, the score of the game, and the captions on the news are displayed at a size designed for people sitting eleven inches from the screen. Please hold the item at arm's length, squint, tilt your head, ask someone younger, then give up and ask the waiter. Or don't. Open See It Yo. Tap once. Read it like you're twenty-five."],
  ["TERMS OF ABSOLUTELY EVERYTHING", "We do not save a single frame of anything you point it at. No account. No ads. No AI. We just make it bigger. That is the entire product and we are not sorry. Terms of Absolutely Everything continue on the reverse side, which you also cannot read. By continuing to squint you agree to everything above, below, and to the left, including anything you missed."],
  ["DOSAGE & DIRECTIONS", "Take one tablet every four to six hours with a full glass of water. Do not exceed the stated dose. Keep out of reach of children, who can read this just fine because they are children. Consult your physician if symptoms persist, and consult your pharmacist if you cannot read the part about consulting your physician."],
];
const TICKS = ["TINY PRINT. ONE TAP.", "NO PHOTOS SAVED", "NO ACCOUNT", "NO ADS", "NO AI", "READS THE MENU", "READS THE TV", "LIGHTS ITSELF", "SEE IT, YO"];

// ---------- articles ----------
function parseArticle(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("Bad front matter: " + file);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (k === "faq") v = JSON.parse(v);
    meta[k] = v;
  }
  for (const k of ["title", "description", "date", "category"]) if (!meta[k]) throw new Error(`Missing ${k}: ${file}`);
  meta.slug = path.basename(file, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
  meta.body = m[2].trim();
  return meta;
}
const artDir = path.join(ROOT, "articles");
const all = fs.existsSync(artDir) ? fs.readdirSync(artDir).filter((f) => f.endsWith(".md")).map((f) => parseArticle(path.join(artDir, f))) : [];
const articles = all.filter((a) => FUTURE || a.date <= TODAY).sort((a, b) => (a.date < b.date ? 1 : -1));

// ---------- layout ----------
import { createHash } from "node:crypto";
const BUILD_ID = createHash("md5").update(["src/css/style.css","src/js/site.js","src/js/scenes.js"].map(f => fs.readFileSync(path.join(ROOT, f), "utf8")).join("")).digest("hex").slice(0, 8);
function layout({ title, desc, p, body, ld = [], type = "website", showTicker = false, scenes = false }) {
  const canon = abs(p);
  const ldTags = ld.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join("\n");
  const tick = TICKS.concat(TICKS).map((t) => `${esc(t)} &nbsp;✦&nbsp; `).join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canon}">
<meta property="og:site_name" content="${esc(cfg.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="${type}">
<meta property="og:url" content="${canon}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="theme-color" content="#5b21d6">
<link rel="icon" href="data:,">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.name)} articles" href="${href("/feed.xml")}">
<link rel="preload" href="${href("/fonts/inter-latin-800-normal.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${href("/css/style.css")}?v=${BUILD_ID}">
${ldTags}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<div class="topnav"><div class="in"><a class="logo" href="${href("/")}"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M2 16s5-9 14-9 14 9 14 9-5 9-14 9S2 16 2 16z" fill="none" stroke="#5b21d6" stroke-width="2.6"/><circle cx="16" cy="16" r="5.2" fill="#5b21d6"/></svg>See It Yo</a>
<nav><a href="${href("/")}#how">How it works</a><a href="${href("/")}#why">Why See It Yo</a><a href="${href("/articles/")}">Articles</a><a href="${href("/")}#faq">FAQ</a></nav>
<a class="navcta" href="${cfg.apkUrl}">Get the Android beta</a></div></div>
<main id="main">
${body}
</main>
<footer>
<div class="big">See It Yo</div>
<p>Leave the glasses at home.</p>
<p><a href="${href("/articles/")}">Articles</a><a href="${href("/feedback/")}">Feedback</a><a href="#" data-share data-url="${abs("/")}">Share</a><a href="${href("/privacy/")}">Privacy</a><a href="${href("/terms/")}">Terms</a><a href="${cfg.browserUrl}">Browser version</a><a href="${href("/feed.xml")}">RSS</a></p>
<p class="copy">© ${new Date().getFullYear()} See It Yo. All rights reserved. See It Yo is an early build.</p>
</footer>
<script src="${href("/js/site.js")}?v=${BUILD_ID}" defer></script>${scenes ? `\n<script src="${href("/js/scenes.js")}?v=${BUILD_ID}" defer></script>` : ""}
</body>
</html>`;
}

const faqHtml = (items) => items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n");
const faqLd = (items) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

// ---------- landing ----------
const fineHtml = FINE.concat(FINE).map(([h, t]) => `<h3>${esc(h)}</h3><p>${esc(t)}</p>`).join("");
const latest = articles.slice(0, 3).map((a) => `<li><a href="${href(`/articles/${a.slug}/`)}">${esc(a.title)}</a><div class="kicker">${esc(a.category)} · ${fmtDate(a.date)}</div></li>`).join("");

const landing = `
<section class="hero2" id="top" data-stage>
  <div class="wrap hero-grid">
    <div class="hero-copy">
      <div class="eyebrow">Small text shouldn't be a big problem</div>
      <h1>See it.<br>Read it.<br><span>Done.</span></h1>
      <p class="lead">Leave your reading glasses at home. Save See It Yo to your home screen, tap it, and small print blows up big and sharp. No camera hassle.</p>
      <div class="badges"><a class="badge" href="${cfg.apkUrl}"><small>Free beta for</small><b>Android</b></a><span class="badge off"><small>Coming soon to</small><b>Google Play</b></span></div>
      <p class="eyebrow">Early build · free to try · saves nothing</p>
    </div>
    <div class="hero-demo" id="demo">
      <div class="bubble before">BEFORE<span>Hard to read.</span></div>
      <div class="bubble after">AFTER<span>Big, sharp and lit.</span></div>
      <div class="phone">
        <div class="stagebox">
          <canvas data-scene="menu" data-main tabindex="0" role="img" aria-label="Interactive phone demo: a dim blurry camera view that becomes sharp and zoomed when you open See It Yo"></canvas>
          <div class="hud" data-state aria-live="polite"><span class="chip live" data-live>Live</span><span class="chip frozen" data-frozen hidden>Frozen</span><span class="chip zoomread" data-zoom>1.0×</span><span class="torchbtn" data-torch aria-hidden="true">🔦</span></div>
          <div class="hint" data-hint>Your regular camera. Tiny, dim, blurry.</div>
          <div class="zbtns" data-zbtns hidden><button type="button" data-zout aria-label="Zoom out">&minus;</button><button type="button" data-zin aria-label="Zoom in">+</button></div>
          <button class="bigbtn" type="button" data-full aria-pressed="false">Open See It Yo</button>
        </div>
      </div>
      <div class="pills" role="group" aria-label="Pick a scene">
        <button class="tab" type="button" data-pick="menu" aria-pressed="true">Dark restaurant</button>
        <button class="tab" type="button" data-pick="tv" aria-pressed="false">TV across the room</button>
        <button class="tab" type="button" data-pick="label" aria-pressed="false">Tiny label</button>
      </div>
      <p class="dcap"><span data-label>Dark restaurant. Menu print, candle light.</span> Open it, drag to aim, tap to freeze. Then pinch (or scroll, or use + and −) to zoom in and drag to move around. Tap again to go live.</p>
      <p class="dcap dim">Simulation. The real app uses your phone's camera.</p>
    </div>
  </div>
</section>

<section class="easy" id="how"><div class="wrap">
  <div class="eyebrow">It's as easy as</div>
  <h2>One tap. That's it.</h2>
  <div class="steps3">
    <div class="step"><div class="n">1</div><div><h3>Save</h3><p>Put See It Yo on your home screen once.</p></div></div>
    <div class="step"><div class="n">2</div><div><h3>Tap</h3><p>It opens already zoomed in for your reading strength, and turns the light on by itself when it's dark.</p></div></div>
    <div class="step"><div class="n">3</div><div><h3>Read</h3><p>Small print, big and sharp. Tap to freeze it, then pinch and drag around.</p></div></div>
  </div>
</div></section>

<section id="readers"><div class="wrap">
  <div class="eyebrow">Set it once</div>
  <h2>Tuned to your readers.</h2>
  <p class="sub">The first time you open it, pick the strength of readers you normally buy, the + number on the sticker. See It Yo opens at a zoom that fits and remembers it on your phone. Change it any time in Settings.</p>
  <div class="pills"><span class="pill">+1.00</span><span class="pill">+1.50</span><span class="pill">+2.00</span><span class="pill">+2.50</span><span class="pill">+3.00 or more</span><span class="pill">Not sure</span></div>
  <p class="sub" style="font-size:14px">It only sets a starting zoom. It isn't a prescription and it isn't medical advice.</p>
</div></section>

<section><div class="wrap">
  <h2>See It Yo helps you read what matters.</h2>
  <div class="uses"><div class="use"><div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3c-2 2-3 4.5-3 7h3v11"/></svg></div><b>Menus</b><span>Restaurants, bars, coffee shops</span></div><div class="use"><div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v3l2 3v12H7V9l2-3z"/><path d="M7 14h10"/></svg></div><b>Labels</b><span>Ingredients, bottles, packaging</span></div><div class="use"><div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11h7M9 15h7"/></svg></div><b>Instructions</b><span>Appliances, products, manuals</span></div><div class="use"><div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/></svg></div><b>Price tags</b><span>Shopping and everyday labels</span></div><div class="use"><div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/></svg></div><b>TV &amp; screens</b><span>Captions and scores, across the room</span></div><div class="use"><div class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z"/></svg></div><b>Documents</b><span>Receipts, forms, small text</span></div></div>
</div></section>

<section id="why"><div class="wrap">
  <h2>Never get caught needing your glasses.</h2>
  <p class="sub">Menus, labels, receipts, the fine print on everything. You've got your phone on you anyway. Save See It Yo to your home screen and you're covered. No hassling with your camera, nothing to think about.</p>
  <div class="vs">
    <div class="col bad"><h3>Your camera app</h3><ol><li>Unlock phone</li><li>Hunt for the camera</li><li>Pinch to zoom</li><li>Fight the focus</li><li>Dark? Find the flashlight</li><li>Photo saved to your gallery you never wanted</li></ol></div>
    <div class="col good"><h3>See It Yo</h3><ol><li>Tap the icon on your home screen</li><li>Read</li></ol><p class="big">That's it. Already zoomed. Light on when it's dark. Saves nothing.</p></div>
  </div>
</div></section>

<section class="betab" id="try"><div class="wrap"><div class="grid">
  <div>
    <div class="eyebrow">Android beta · try it now</div>
    <h2 style="margin-top:8px">Help us test it.</h2>
    <p>See It Yo is in early testing on Android. Download it free, point it at a menu, a label, or the TV across the room, and tell us if it worked. That's the whole deal.</p>
    <div class="btnrow"><a class="btn" href="${cfg.apkUrl}">Download for Android</a><a class="btn alt" href="${href("/feedback/")}">Tell us how it went</a><button type="button" class="btn alt" data-share data-url="${abs("/")}">Share with a friend</button></div>
    <div class="safe"><strong>Your phone will show a warning. That's normal.</strong> Android warns about every app that doesn't come from Google Play, no matter who made it. It isn't a verdict on this one. Here's what you can check yourself: See It Yo asks for exactly two permissions, camera and vibration. It does not ask for internet access, so it can't send anything anywhere. No account, no ads, no tracking, no photos saved. The source code is public, so anyone can read exactly what it does. We're putting it on Google Play next so the warning goes away.</div>
    <p class="note">Android ${esc(cfg.minAndroid)}+ · version ${esc(cfg.version)} · no photos saved · no account · no ads · no tracking</p>
    <p class="note">Want a heads-up when it hits Google Play? <a href="mailto:${cfg.email}?subject=${encodeURIComponent("Tell me when See It Yo hits Google Play")}">Email us</a>.</p>
  </div>
  <div class="card">
    <h3 style="font-size:22px;margin-bottom:6px">Install in 3 steps</h3>
    <ol>
      <li><strong>Tap Download.</strong> Your browser may say this type of file can harm your device. That's the standard message for any app file. Tap Download anyway (or Keep).</li>
      <li><strong>Open the file.</strong> If Android says it can't install from this source, tap Settings, switch on Allow from this source, then go back and tap Install.</li>
      <li><strong>If Play Protect says "unknown developer" or "unrecognized app,"</strong> tap More details, then Install anyway. That's the same Google Play warning every app outside the store gets.</li>
      <li><strong>Add it to your home screen and read something small.</strong></li>
    </ol>
    <p class="note">iPhone: not yet. A softer <a href="${cfg.browserUrl}">browser version</a> works in a pinch, but a browser can't use your phone's real zoom lens.</p>
  </div>
</div></div></section>

<section id="nos"><div class="wrap">
  <h2>What it won't do.</h2>
  <p class="sub">The list of things we left out is longer than the list of things we put in. On purpose.</p>
  <div class="chips"><span class="chip2">No photos saved</span><span class="chip2">No account</span><span class="chip2">No ads</span><span class="chip2">No AI</span><span class="chip2">No tracking</span><span class="chip2">No tutorial</span></div>
</div></section>

${latest ? `<section><div class="wrap" style="max-width:780px"><h2>Fresh reading.</h2><ul class="list" style="margin-top:20px">${latest}</ul><p style="text-align:center"><a href="${href("/articles/")}">All articles →</a></p></div></section>` : ""}

<section id="faq"><div class="wrap">
  <h2>Questions.</h2>
  ${faqHtml(FAQ)}
</div></section>

<section class="final"><div class="wrap">
  <h2>A clearer world is just a tap away.</h2>
  <p>Download See It Yo and leave your glasses at home.</p>
  <div class="btnrow"><a class="btn" href="${cfg.apkUrl}">Get the Android beta</a></div>
</div></section>
<div class="sticky"><a class="btn" href="${cfg.apkUrl}">Get the free Android beta</a></div>`;

const appLd = {
  "@context": "https://schema.org",
  "@type": "MobileApplication",
  name: cfg.name,
  alternateName: "SeeItYo",
  description: cfg.summary,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: `Android ${cfg.minAndroid}+`,
  softwareVersion: cfg.version,
  downloadUrl: cfg.apkUrl,
  url: abs("/"),
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD", description: "Free during the Android beta" },
  featureList: ["Opens the rear camera already zoomed in", "Pick your reading glasses strength once and it remembers", "Automatic flashlight in the dark", "Tap to freeze the frame", "Pinch and drag the frozen frame", "No photos saved", "No account", "No ads", "No AI"],
};
const siteLd = { "@context": "https://schema.org", "@type": "WebSite", name: cfg.name, url: abs("/") };

write("index.html", layout({
  title: "See It Yo: Free Android Magnifier App for Small Print | Leave the glasses at home.",
  desc: "Free Android beta that turns your phone into reading glasses. One tap opens the camera already zoomed in, light on automatically. No photos saved.",
  p: "/", body: landing, ld: [siteLd, appLd, faqLd(FAQ)], showTicker: true, scenes: true,
}));

// ---------- feedback ----------
const radios = (name, opts) => opts.map((o) => `<label><input type="radio" name="${name}" value="${esc(o)}"> ${esc(o)}</label>`).join("");
write("feedback/index.html", layout({
  title: "Tell us how it went | See It Yo beta feedback",
  desc: "Five quick questions about the See It Yo Android beta. Your answers open in your own email app. Nothing is tracked.",
  p: "/feedback/",
  body: `<section><div class="wrap prose"><div class="crumbs"><a href="${href("/")}">Home</a> / Feedback</div>
<h1>Tell us how it went.</h1>
<p>Five quick questions. When you tap send, your own email app opens with your answers filled in. Nothing is tracked and the website doesn't collect anything.</p>
<form class="fb" id="fb" data-to="${esc(cfg.email)}">
<fieldset><legend>1. Could you read the small print?</legend>${radios("read", ["Yes", "Sort of", "No"])}</fieldset>
<fieldset><legend>2. What did you point it at?</legend>${radios("target", ["A menu", "The TV", "A label or receipt", "Something else"])}</fieldset>
<fieldset><legend>3. After tapping the icon, how fast was it readable?</legend>${radios("speed", ["Under 2 seconds", "A few seconds", "Too slow"])}</fieldset>
<fieldset><legend>4. What phone do you have?</legend><input type="text" name="phone" placeholder="Example: Samsung Galaxy S23"></fieldset>
<fieldset><legend>5. Would you pay for an app like this?</legend>${radios("pay", ["Yes", "Maybe", "No"])}<label>What annoyed you?<textarea name="annoy" rows="3"></textarea></label></fieldset>
<button class="btn" type="submit">Send it</button>
</form>
<p class="fine" style="text-align:left;margin-top:18px">Or just email <a href="mailto:${esc(cfg.email)}">${esc(cfg.email)}</a>.</p>
</div></section>`,
}));

// ---------- legal pages (fragments live in site/pages) ----------
for (const [slug, title, desc] of [["privacy", "Privacy", "See It Yo collects no data. No photos saved, no account, no ads, no tracking."], ["terms", "Terms", "Plain-English terms for the See It Yo early Android build."]]) {
  const f = path.join(ROOT, "pages", `${slug}.html`);
  if (!fs.existsSync(f)) continue;
  write(`${slug}/index.html`, layout({
    title: `${title} | See It Yo`, desc, p: `/${slug}/`,
    body: `<section><div class="wrap prose"><div class="crumbs"><a href="${href("/")}">Home</a> / ${title}</div>${fs.readFileSync(f, "utf8")}</div></section>`,
  }));
}

// ---------- articles ----------
const cats = [...new Set(articles.map((a) => a.category))];
write("articles/index.html", layout({
  title: "Articles: reading small print, menus, labels and screens | See It Yo",
  desc: "Plain answers to everyday small-print problems: dark restaurants, tiny labels, TV captions and blurry phone zoom.",
  p: "/articles/",
  ld: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: "See It Yo articles", url: abs("/articles/") }],
  body: `<section><div class="wrap prose"><div class="crumbs"><a href="${href("/")}">Home</a> / Articles</div>
<h1>Small print, solved.</h1>
<p>Plain answers to everyday small-print problems. New article every day.</p>
${cats.map((c) => `<h2>${esc(c)}</h2><ul class="list">${articles.filter((a) => a.category === c).map((a) => `<li><a href="${href(`/articles/${a.slug}/`)}">${esc(a.title)}</a><div class="kicker">${fmtDate(a.date)}</div><div>${esc(a.description)}</div></li>`).join("")}</ul>`).join("")}
</div></section>`,
}));

for (const a of articles) {
  const html = marked.parse(a.body);
  const related = articles.filter((x) => x.slug !== a.slug).slice(0, 3);
  const ld = [{
    "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.description,
    datePublished: a.date, dateModified: a.updated || a.date,
    mainEntityOfPage: abs(`/articles/${a.slug}/`), url: abs(`/articles/${a.slug}/`),
    author: { "@type": "Organization", name: cfg.name }, publisher: { "@type": "Organization", name: cfg.name },
  }];
  if (a.faq && a.faq.length) ld.push(faqLd(a.faq));
  write(`articles/${a.slug}/index.html`, layout({
    title: `${a.title} | See It Yo`, desc: a.description, p: `/articles/${a.slug}/`, type: "article", ld,
    body: `<article><section><div class="wrap prose"><div class="crumbs"><a href="${href("/")}">Home</a> / <a href="${href("/articles/")}">Articles</a> / ${esc(a.category)}</div>
<h1>${esc(a.title)}</h1><div class="meta">${esc(a.category)} · ${fmtDate(a.date)}</div>
${html}
<div class="cta"><p>Small print still winning? See It Yo is a free Android beta that opens already zoomed in and lights itself in the dark.</p><a class="btn" href="${cfg.apkUrl}">Try it now: free Android beta</a></div>
${a.faq && a.faq.length ? `<h2>Quick answers</h2>${faqHtml(a.faq)}` : ""}
${related.length ? `<h2>More reading</h2><ul class="list">${related.map((r) => `<li><a href="${href(`/articles/${r.slug}/`)}">${esc(r.title)}</a></li>`).join("")}</ul>` : ""}
</div></section></article>`,
  }));
}

// ---------- 404 ----------
write("404.html", layout({ title: "Page not found | See It Yo", desc: "Page not found.", p: "/404.html", body: `<section><div class="wrap prose"><h1>Can't find that.</h1><p>Wrong turn. <a href="${href("/")}">Back to the home page</a> or <a href="${href("/articles/")}">read an article</a>.</p></div></section>` }));

// ---------- sitemap, robots, llms.txt, feed ----------
const pages = ["/", "/articles/", "/feedback/", ...["privacy", "terms"].filter((s) => fs.existsSync(path.join(ROOT, "pages", `${s}.html`))).map((s) => `/${s}/`), ...articles.map((a) => `/articles/${a.slug}/`)];
const lastmod = (p) => { const a = articles.find((x) => p === `/articles/${x.slug}/`); return a ? a.updated || a.date : TODAY; };
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map((p) => `  <url><loc>${abs(p)}</loc><lastmod>${lastmod(p)}</lastmod></url>`).join("\n")}\n</urlset>\n`);

const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "Googlebot"];
write("robots.txt", `User-agent: *\nAllow: /\n\n${bots.map((b) => `User-agent: ${b}\nAllow: /\n`).join("\n")}\nSitemap: ${abs("/sitemap.xml")}\n`);

write("llms.txt", `# ${cfg.name}

> ${cfg.summary}

## Facts
- What it is: a free Android beta magnifier app. It opens the rear camera already zoomed in, turns the flashlight on automatically in the dark, and freezes the frame with one tap.
- Platform: Android ${cfg.minAndroid} or newer, rear camera required. iPhone is not available yet (a softer browser version exists at ${cfg.browserUrl}).
- Price: free during the beta.
- Privacy: saves no photos or video, no account, no ads, no analytics. The app does not request internet permission.
- What it does not do: no OCR, no AI, no text-to-speech, no medical interpretation. It is a magnifier, not a medical device.
- Install: direct APK download from the website (${cfg.apkUrl.startsWith("http") ? cfg.apkUrl : abs(cfg.apkUrl.replace(cfg.base, ""))}). Google Play listing is coming soon.
- Current version: ${cfg.version}
- Made by: one person in a garage. Contact: ${cfg.email}

## Key pages
- [Home](${abs("/")}): what it is, how to install, FAQ
- [Articles](${abs("/articles/")}): plain answers to everyday small-print problems
- [Feedback](${abs("/feedback/")}): tell us how the beta worked for you

## Articles
${articles.map((a) => `- [${a.title}](${abs(`/articles/${a.slug}/`)}): ${a.description}`).join("\n")}
`);

write("feed.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(cfg.name)} articles</title><link>${abs("/articles/")}</link><description>Plain answers to everyday small-print problems.</description>\n${articles.slice(0, 30).map((a) => `<item><title>${esc(a.title)}</title><link>${abs(`/articles/${a.slug}/`)}</link><guid>${abs(`/articles/${a.slug}/`)}</guid><pubDate>${new Date(a.date + "T12:00:00Z").toUTCString()}</pubDate><description>${esc(a.description)}</description></item>`).join("\n")}\n</channel></rss>\n`);

console.log(`Built ${pages.length} pages, ${articles.length} articles live (${all.length - articles.length} scheduled) -> ${DIST}`);
