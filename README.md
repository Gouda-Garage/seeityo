# See It Yo — Tiny print. One tap.

Android prototype. Every push to `main` builds `SeeItYo.apk` and publishes it under **Releases**.

## Install on Android
1. On your phone, open the latest Release and download `SeeItYo.apk`.
2. Tap the download. If asked, allow installs from Chrome/Files.
3. Open See It Yo, allow camera. Done.

Direct link: https://github.com/Gouda-Garage/seeityo/releases/latest/download/SeeItYo.apk

## iPhone
Not yet. A browser version lives at https://bigread.pages.dev/app/ (softer, no real lens zoom).

Nothing is saved, no account, no tracking.

## Website
The website lives in `site/` and is rebuilt and published by GitHub Actions on every push and every morning.
- Articles: add a markdown file to `site/articles/` named `YYYY-MM-DD-slug.md`. Articles dated in the future are held back and go live automatically on their date.
- Site facts (name, email, version, links): `site/config.json`
- Preview locally: `cd site && npm ci && INCLUDE_FUTURE=1 node build.mjs`
- No analytics, no trackers, no third-party scripts.
