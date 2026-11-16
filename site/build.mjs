// See It Yo site builder. Zero tracking. Run: node build.mjs  (INCLUDE_FUTURE=1 to preview scheduled articles)
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, "config.json"), "utf8"));
if (process.env.SITE_BASE !== undefined) cfg.base = process.env.SITE_BASE;
if (process.env.SITE_ORIGIN) cfg.origin = process.env.SITE_ORIGIN;
const DIST = path.join(ROOT, "dist");
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
  ["rye", "rye-latin-400-normal.woff2"],
  ["shrikhand", "shrikhand-latin-400-normal.woff2"],
  ["space-mono", "space-mono-latin-400-normal.woff2"],
  ["space-mono", "space-mono-latin-700-normal.woff2"],
];
for (const [pkg, file] of fonts) copy(path.join(ROOT, "node_modules/@fontsource", pkg, "files", file), `fonts/${file}`);
copy(path.join(ROOT, "src/css/style.css"), "css/style.css");
copy(path.join(ROOT, "src/js/site.js"), "js/site.js");
copy(path.join(ROOT, "src/js/scenes.js"), "js/scenes.js");
// fix relative font URLs: css lives in /css, fonts in /fonts -> ../fonts works as written

// ---------- shared facts (single source of truth) ----------
const FAQ = [
  ["Does it save my photos?", "No. Frames exist only while you're looking at them. Close the app and they're gone. There's no gallery, no account and no upload. The app doesn't even ask Android for internet permission."],
  ["Does it read the text out loud or \"understand\" it?", "No. There is no OCR and no AI. It makes things bigger and brighter. That's the whole product."],
  ["Why not just use my camera app?", "You can. But the camera app makes you open it, find the zoom, pinch around and hope the flash is on. See It Yo opens already zoomed in, turns the light on by itself when it's dark, and freezes the picture with one tap."],
  ["Will it work on the TV across the room?", "That's the test we're running right now: reading captions and scores from the couch in a dark room. Try it on your phone and tell us how it went."],
  ["Is it a medical thing?", "No. It's a magnifier. Don't rely on it alone for medicine labels, dosages or safety warnings. If it matters, ask a pharmacist or a person."],
  ["What phones does it work on?", `Android ${cfg.minAndroid} or newer with a rear camera. A flashlight helps in the dark but isn't required.`],
  ["Is it free?", "Free while we test. When it leaves testing the plan is 3 free reads a month, then $1.99 once to unlock it forever. No subscription, and never a paywall in the middle of reading something."],
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
<meta name="theme-color" content="#e4571d">
<link rel="icon" href="data:,">
<link rel="alternate" type="application/rss+xml" title="${esc(cfg.name)} articles" href="${href("/feed.xml")}">
<link rel="preload" href="${href("/fonts/rye-latin-400-normal.woff2")}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${href("/css/style.css")}">
${ldTags}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${showTicker ? `<div class="ticker" aria-hidden="true"><span>${tick}</span></div>` : ""}
<div class="topnav"><a class="logo" href="${href("/")}">See It Yo</a>
<nav><a href="${href("/articles/")}">Articles</a><a href="${href("/feedback/")}">Feedback</a><a href="${cfg.releasesUrl}">Download</a></nav></div>
<main id="main">
${body}
</main>
<footer>
<div class="big">See It Yo.</div>
<p>Save it. Tap it. Read it. Built in a Denver garage.</p>
<p><a href="${href("/articles/")}">Articles</a><a href="${href("/feedback/")}">Feedback</a><a href="${href("/privacy/")}">Privacy</a><a href="${href("/terms/")}">Terms</a><a href="${cfg.browserUrl}">Browser version</a><a href="${cfg.repoUrl}">Source</a><a href="${href("/feed.xml")}">RSS</a></p>
</footer>
<script src="${href("/js/site.js")}" defer></script>${scenes ? `\n<script src="${href("/js/scenes.js")}" defer></script>` : ""}
</body>
</html>`;
}

const faqHtml = (items) => items.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("\n");
const faqLd = (items) => ({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: items.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) });

// ---------- landing ----------
const fineHtml = FINE.concat(FINE).map(([h, t]) => `<h3>${esc(h)}</h3><p>${esc(t)}</p>`).join("");
const latest = articles.slice(0, 3).map((a) => `<li><a href="${href(`/articles/${a.slug}/`)}">${esc(a.title)}</a><div class="kicker">${esc(a.category)} · ${fmtDate(a.date)}</div></li>`).join("");

const landing = `
<header class="hero cine" id="top" data-stage>
  <canvas data-scene="menu" data-lens="115" aria-hidden="true"></canvas>
  <div class="shade"></div>
  <div class="hero-in">
    <div class="tag">Save it. Tap it. Read it.</div>
    <h1>See It<span>Yo.</span></h1>
    <p class="lede">Put it on your home screen. Press one big button. Read whatever you need. No digging through your camera, no pinching, no fiddling.</p>
    <div class="strip"><span class="pill live">Android beta: live now</span><span class="pill soon">Google Play: coming soon</span><span class="pill">iPhone: later</span></div>
    <div class="btnrow"><a class="btn" href="${cfg.apkUrl}">Try it now: free Android beta</a><a class="btn alt" href="#demo">See it work</a></div>
    <p class="fine" style="margin-top:14px">Early build · free to try · saves nothing</p>
  </div>
</header>

<section class="show" id="demo" data-stage>
  <div class="wrap">
    <div class="kicker">Simulated camera view</div>
    <h2>Go on. Try to read that.</h2>
    <p class="sub">This is what small print looks like through a phone camera in real life: dim, grainy, out of focus. Now press the button. That's the whole app: the screen goes big, sharp and lit. Nothing to pinch, nothing to focus.</p>
    <div class="tabs" role="group" aria-label="Pick a scene">
      <button class="tab" type="button" data-pick="menu" aria-pressed="true">Dark restaurant</button>
      <button class="tab" type="button" data-pick="tv" aria-pressed="false">TV across the room</button>
      <button class="tab" type="button" data-pick="label" aria-pressed="false">Tiny label</button>
    </div>
    <div class="stagebox">
      <canvas data-scene="menu" data-main tabindex="0" role="img" aria-label="Interactive demo: a blurry, dim camera view of small print with a lens you can move to read it"></canvas>
      <button class="bigbtn" type="button" data-full aria-pressed="false">Press the button</button>
      <div class="hud" data-state aria-live="polite"><span class="chip" data-live>Live</span><span class="chip frozen" data-frozen hidden>Frozen · drag to pan</span><span class="chip torch on" data-torch>Auto light</span></div>
    </div>
    <p class="fine caption"><span data-label>Dark restaurant. Menu print, candle light.</span></p>
    <p class="fine caption">Move to look around · Click to freeze · Click again to go live</p>
    <p class="fine caption dim">Simulation. The real app uses your phone's camera.</p>
  </div>
</section>

<section class="beta" id="try">
  <div class="wrap">
    <div class="kicker">Android beta · try it now</div>
    <h2>Help us test it.</h2>
    <p>See It Yo is in early testing on Android. Download it free, point it at a menu, a label, or the TV across the room, and tell us if it worked. That's the whole deal.</p>
    <ol class="steps">
      <li><div><strong>Tap the download button.</strong> Your phone may say this type of file can harm your device. That's the standard warning for any app that isn't from Google Play yet.</div></li>
      <li><div><strong>Open the file.</strong> If it asks, allow installs from your browser or Files app one time, go back, and tap Install.</div></li>
      <li><div><strong>Open See It Yo and read something small.</strong> Point, pinch, tap to freeze.</div></li>
    </ol>
    <div class="btnrow" style="justify-content:flex-start"><a class="btn" href="${cfg.apkUrl}">Download for Android</a><a class="btn alt" href="${href("/feedback/")}">Tell us how it went</a></div>
    <p class="fine" style="text-align:left;margin-top:14px">Android ${esc(cfg.minAndroid)}+ · version ${esc(cfg.version)} · no photos saved · no account · no ads · no tracking</p>
    <p>Want a heads-up when it hits Google Play? <a href="mailto:${cfg.email}?subject=${encodeURIComponent("Tell me when See It Yo hits Google Play")}">Email us</a> and we'll tell you.</p>
  </div>
</section>

<section class="demo nogl-only" id="demo-fallback" hidden>
  <div class="wrap">
    <h2>Go on. Try to read that.</h2>
    <div class="tools"><button class="btn small" data-lights type="button">Kill the lights</button></div>
    <div class="lensbox" id="lensbox" role="img" aria-label="Demo: a block of tiny print with a magnifying lens you can drag over it">
      <div class="fineprint">${fineHtml}</div>
    </div>
    <p class="fine hint">Drag the lens over the print</p>
  </div>
</section>

<section class="why" id="why"><div class="wrap">
<div class="kicker">Why this exists</div>
<h2>Reading small print should be easy.</h2>
<p class="sub">Your phone can already zoom in. Getting it to do that is the pain. See It Yo skips the pain. It's made for convenience, so you can get on with your day.</p>
<div class="vs">
<div class="col bad"><h3>Your camera app</h3><ol><li>Unlock phone</li><li>Hunt for the camera</li><li>Pinch to zoom</li><li>Fight the focus</li><li>Dark? Find the flashlight</li><li>Photo saved to your gallery you never wanted</li></ol></div>
<div class="col good"><h3>See It Yo</h3><ol><li>Press the button on your home screen</li><li>Read</li></ol><p style="margin:14px 0 0"><strong>That's it.</strong> It opens already zoomed in, turns the light on when it's dark, and saves nothing.</p></div>
</div></div></section>

<section id="how"><div class="wrap">
  <h2>Three moves.<br>That's the app.</h2>
  <p>No splash screen. No menu. No tutorial. You open it, it's already zoomed, you read.</p>
  <div class="three">
    <div class="card"><div class="n">1</div><h3>Tap the icon</h3><p>The rear camera opens already zoomed in. Works from the lock screen too.</p></div>
    <div class="card"><div class="n">2</div><h3>Point &amp; read</h3><p>Menu. Label. Receipt. The TV across the room. Pinch to go bigger. It turns the flashlight on by itself when it's dark.</p></div>
    <div class="card"><div class="n">3</div><h3>Tap to freeze</h3><p>Hold it still, pinch and drag around the frozen frame, tap again to go live. Close it and it's gone.</p></div>
  </div>
</div></section>

<section class="dark-sec" id="dark"><div class="wrap">
  <h2>Dark restaurant?<br>Handled.</h2>
  <p>The flashlight comes on when the room says so. You never hunt for a button, and you never wave your phone around at the table like a flare gun.</p>
  <button class="btn" data-lights type="button">Kill the lights</button>
  <p class="fine" style="margin-top:12px">Scroll back up. Same lens. Different mood.</p>
</div></section>

<section id="nos"><div class="wrap">
  <h2>What it won't do.</h2>
  <p>The list of things we left out is longer than the list of things we put in. On purpose.</p>
  <div class="stamps"><span class="stamp">No photos saved</span><span class="stamp">No account</span><span class="stamp">No ads</span><span class="stamp">No AI</span><span class="stamp">No tracking</span><span class="stamp">No paywall mid-read</span><span class="stamp">No tutorial</span></div>
</div></section>

<section id="install"><div class="wrap">
  <h2>Get it.</h2>
  <div class="two">
    <div class="card"><div class="kicker">Android · ready to test</div><h3 style="font-family:Shrikhand,serif;font-weight:400;font-size:28px;margin:6px 0">Android</h3>
      <ol><li>Tap the big button. It downloads SeeItYo.apk.</li><li>Open it. If your phone grumbles about "unknown apps," allow it this once.</li><li>Tap the icon. Read something small.</li></ol>
      <a class="btn" href="${cfg.apkUrl}">Download for Android</a>
      <p class="fine" style="text-align:left;margin-top:12px">Early build, made to be tested. If it sucks somewhere, <a href="${href("/feedback/")}">tell us</a>.</p></div>
    <div class="card"><div class="kicker">iPhone · not yet</div><h3 style="font-family:Shrikhand,serif;font-weight:400;font-size:28px;margin:6px 0">iPhone</h3>
      <p>Apple charges a toll before anyone can install an app without a cable. We're proving this thing works on Android first, then we pay the toll.</p>
      <p>In the meantime there's a browser version. It works, but a browser can't use your phone's real zoom lens, so it's softer. Fine in a pinch, not the real thing.</p>
      <a class="btn alt" href="${cfg.browserUrl}">Open browser version</a></div>
  </div>
</div></section>

<section id="price"><div class="wrap">
  <h2>Cheap. Once.</h2>
  <p>When it leaves testing: no subscription, ever, and never a paywall in the middle of reading something.</p>
  <div class="price">
    <div class="card"><div class="kicker">Free</div><div class="amt">3</div><p>reads a month. Enough to find out if it's for you.</p></div>
    <div class="card"><div class="kicker">Forever</div><div class="amt">$1.99</div><p>one time. Unlimited reading. That's the whole price list.</p></div>
  </div>
</div></section>

${latest ? `<section><div class="wrap"><h2>Fresh reading.</h2><ul class="list">${latest}</ul><p><a href="${href("/articles/")}">All articles →</a></p></div></section>` : ""}

<section id="faq"><div class="wrap">
  <h2>Questions.</h2>
  ${faqHtml(FAQ)}
</div></section>
<div class="sticky"><a class="btn" href="${cfg.apkUrl}">Try it: free Android beta</a></div>`;

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
  featureList: ["Opens the rear camera already zoomed in", "Automatic flashlight in the dark", "Tap to freeze the frame", "Pinch and drag the frozen frame", "No photos saved", "No account", "No ads", "No AI"],
};
const siteLd = { "@context": "https://schema.org", "@type": "WebSite", name: cfg.name, url: abs("/") };

write("index.html", layout({
  title: "See It Yo: Free Android Magnifier App for Small Print | Save it. Tap it. Read it.",
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
<fieldset><legend>5. Would you pay $1.99 once to keep it?</legend>${radios("pay", ["Yes", "Maybe", "No"])}<label>What annoyed you?<textarea name="annoy" rows="3"></textarea></label></fieldset>
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
- Price: free during the beta. Planned: 3 free reads a month, then a one-time $1.99 unlock. No subscription.
- Privacy: saves no photos or video, no account, no ads, no analytics. The app does not request internet permission.
- What it does not do: no OCR, no AI, no text-to-speech, no medical interpretation. It is a magnifier, not a medical device.
- Install: direct APK download from GitHub Releases (${cfg.releasesUrl}). Google Play listing is coming soon.
- Current version: ${cfg.version}
- Made by: one person in a Denver garage. Contact: ${cfg.email}

## Key pages
- [Home](${abs("/")}): what it is, how to install, FAQ
- [Articles](${abs("/articles/")}): plain answers to everyday small-print problems
- [Feedback](${abs("/feedback/")}): tell us how the beta worked for you
- [Source code](${cfg.repoUrl})

## Articles
${articles.map((a) => `- [${a.title}](${abs(`/articles/${a.slug}/`)}): ${a.description}`).join("\n")}
`);

write("feed.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(cfg.name)} articles</title><link>${abs("/articles/")}</link><description>Plain answers to everyday small-print problems.</description>\n${articles.slice(0, 30).map((a) => `<item><title>${esc(a.title)}</title><link>${abs(`/articles/${a.slug}/`)}</link><guid>${abs(`/articles/${a.slug}/`)}</guid><pubDate>${new Date(a.date + "T12:00:00Z").toUTCString()}</pubDate><description>${esc(a.description)}</description></item>`).join("\n")}\n</channel></rss>\n`);

console.log(`Built ${pages.length} pages, ${articles.length} articles live (${all.length - articles.length} scheduled) -> ${DIST}`);
