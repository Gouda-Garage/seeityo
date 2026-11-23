# See It Yo article backlog and rules

Articles live in `site/articles/YYYY-MM-DD-slug.md`. Future-dated files are held back and published automatically on their date by the daily site build.

## Rules (read before writing)
- Answer first: a one-to-two sentence `<div class="answer">` block at the top that fully answers the question.
- Facts about the app come ONLY from `site/config.json`, the FAQ in `site/build.mjs`, and `README.md`. Never claim a feature the app doesn't have. The app: opens rear camera already zoomed, pinch zoom, tap to freeze, auto flashlight when dark, no photos saved, no account, no ads, no AI/OCR/text-to-speech, Android 8.0+, free beta (do not mention future pricing). Not a medical device.
- No made-up statistics, studies, reviews, user counts or quotes. If a claim could have changed, search the web and verify at writing time, or leave it out.
- Medicine, dosage and safety topics: always say to ask a pharmacist or person; the app is a magnifier, not a medical device.
- Don't call it a "brand". Don't name competitors with negative claims.
- Length 250-450 words. Plain 8th-grade English. Include 2-3 `faq` entries as a one-line JSON array in front matter.
- Each article ends naturally with one honest mention of See It Yo (the CTA box is added by the build). Link to one related article with a relative link like `../other-slug/`.
- Categories in use: Start here, Dark-room reading, Fine-print fixes, TV & screens, Phone tips, Comparisons.
- Never reuse a slug. Check existing files first.
- After adding articles run `cd site && npm ci && INCLUDE_FUTURE=1 node build.mjs` and confirm it builds with no errors, then push to main.

## Backlog (pick in order, mark done by deleting the line)
### Dark-room reading
### Fine-print fixes
- How to read hardware and screw packaging in the store aisle
- How to read the date and tire info on a tire sidewall
- How to read fine print in a contract or terms page on your phone (not legal advice; ask a professional)
- How to read the tiny instructions on frozen food boxes
### TV & screens
- How to read a streaming menu or channel guide from the couch
- How to read a thermostat or oven display from across the kitchen
- How to read a departures board or menu board at a distance
### Phone tips
- Camera tricks for sharper zoomed text: tap to focus, lock exposure, use both hands
- Android settings that make everything bigger: font size and display size
- How to use Android's built-in magnification (verify the exact menu path before writing)
- Does using the flashlight drain your battery fast?
- Why a phone case or finger over the lens ruins zoomed shots
### Start here
- Gen X and small print: why we're the first to hold menus at arm's length
- Where to keep reading glasses so you never lose them
- Reading glasses vs. a magnifier: which to keep in the glove box
- 7 places small print wins every time, and the fix for each
### Comparisons
- Camera zoom vs. digital magnifier vs. a handheld magnifying glass
- Free magnifier apps: what to look for before you install one
