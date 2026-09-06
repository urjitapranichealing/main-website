# Urjita Yog ani Pranic Upchar Kendra — website

Static site. No build step, no framework, no dependencies. Drop the folder on any host and it works.

```
index.html      Home
about.html      Kshipra's story, credentials, lineage
services.html   Healings + how a session works
workshops.html  Course, free meditation, programmes
contact.html    Locations + WhatsApp enquiry form
styles.css      All styling
app.js          Language toggle, Marathi dictionary, WhatsApp, nav, reveals
```

## Before it goes live — the replacements list

**1. Shop link.** Open `app.js`, line 7:
```js
const SHOP_URL = 'https://your-shop-domain.com';
```
Change it to the real domain. Every "Shop" link across all five pages updates automatically.

**2. Photos.** Two placeholders are marked in the HTML with `<!-- REPLACE -->`:
- `index.html` and `about.html` — Kshipra's portrait. Make a folder called `images`, drop in `kshipra.jpg`, then swap:
```html
<div class="placeholder">…</div>
```
for
```html
<img src="images/kshipra.jpg" alt="Kshipra Lokare">
```
A portrait in portrait orientation (taller than wide, roughly 4:5) fits the frame best.

**3. Testimonials.** `index.html`, three cards marked `<!-- REPLACE these three -->`. Real names and towns beat "Client, Mumbai" every time. Add the Marathi versions to `app.js` under keys `testi.1`, `testi.2`, `testi.3` and their `.1w / .2w / .3w` attributions.

**4. Map pins.** `contact.html` — the two "Get directions" links currently search for the area name. Open Google Maps, find the exact pin for each centre, use Share → copy link, and paste it in.

**5. Workshop dates.** Currently the page routes people to WhatsApp for dates, which is deliberate — it captures a contact instead of just informing. If you'd rather publish a schedule, tell me and I'll add a dates block.

## The Marathi toggle

English lives in the HTML. Marathi lives in `app.js` in the `MR` object, keyed to the `data-i18n` attributes. To change any Marathi wording, find the key and edit the string — nothing else needs touching.

The choice persists in the visitor's browser, so a Marathi reader who comes back lands in Marathi.

## The enquiry form

There is no backend, so nothing is stored on the site and there's nothing to maintain or secure. The form builds a pre-written message and opens WhatsApp with it ready to send. On mobile that's one tap. If you later want submissions in your inbox instead, Formspree or Google Forms can be wired in without changing the design.

## Deploying to Vercel

1. Put this folder in a GitHub repo and push it.
2. vercel.com → **Add New → Project** → import the repo.
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Deploy. It'll be live in under a minute.
5. Project → **Settings → Domains** to point your domain at it.

Any change you push to GitHub redeploys automatically.

## To preview locally

Open a terminal in this folder and run:
```
python3 -m http.server 8000
```
Then visit `http://localhost:8000`. (Opening `index.html` by double-clicking also mostly works, but a local server is closer to the real thing.)

## A note on claims

Copy throughout is written as complementary wellbeing support, and a disclaimer sits in the footer of every page. Two claims from the printed flyer were deliberately left off the site: "healings for all types of physical and psychological ailments", and body sculpting / weight loss. Both are the kind of thing that invites regulatory attention and puts off exactly the educated, sceptical audience most likely to pay well. The psychology credential does far more persuasive work than any cure claim would.
