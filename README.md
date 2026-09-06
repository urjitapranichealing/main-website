# Urjita Yog ani Pranic Upchar Kendra — website

Mobile-first static site. No build step, no framework, no dependencies.

```
index.html       Home
about.html       Kshipra's story, credentials, lineage
services.html    Healings + how a session works
workshops.html   Course, free meditation, programmes
contact.html     Locations + WhatsApp enquiry form
policies.html    Privacy + Terms + Refund, one page
styles.css       All styling (mobile-first)
app.js           Language toggle, Marathi dictionary, counters, WhatsApp
vercel.json      Clean URLs
images/          Logo files — put your photos here too
```

## Deploy: GitHub → Vercel

1. Put **all these files at the root** of a GitHub repo — `index.html` at the top level, `images/` beside it. Push.
2. Vercel → Add New → Project → import the repo.
3. Framework Preset: **Other**. Leave Build Command and Output Directory blank.
4. Deploy, then Settings → Domains to attach your domain.

Filenames are case-sensitive on Vercel. Keep everything lowercase, including any images you add.

## Before it goes live

**1. Shop link.** `app.js`, line 7:
```js
const SHOP_URL = 'https://your-shop-domain.com';
```
Change it once; every "Shop" link across all six pages updates.

**2. Kshipra's portrait.** Save it as `images/kshipra.jpg` (portrait orientation, roughly 4:5). In `index.html` and `about.html`, replace:
```html
<div class="placeholder" data-i18n="ph.portrait">…</div>
```
with:
```html
<img src="/images/kshipra.jpg" alt="Kshipra Lokare">
```

**3. Testimonial screenshots.** Save your WhatsApp screenshots as `images/testimonial-1.jpg` through `testimonial-5.jpg`. In `index.html`, replace each:
```html
<div class="drop" data-i18n="shot.1">Screenshot 1<br>add image here</div>
```
with:
```html
<img src="/images/testimonial-1.jpg" alt="Client message">
```
Then edit the caption below it (`First name · City`) and its Marathi twin in `app.js` under `who.1` … `who.5`.

Screenshots display whole, never cropped. Crop out phone numbers and profile photos before uploading — those are other people's private details.

**4. Map pins.** `contact.html` — the two "Get directions" links currently search by area name. Open Google Maps, find each centre, Share → copy link, paste in.

## What changed in this version

- **Mobile-first throughout.** Base CSS is phone; `@media (min-width: 640px)` and `(min-width: 900px)` scale up. Copy was tightened across every page so nothing reads long on a phone.
- **Logo** in the header, and a light version in the footer. Both are transparent PNGs cut from your original file, so no white box on either background.
- **Header on mobile** is logo → language toggle (full width) → menu. The "Book a Session" button appears only from 900px up; on mobile the sticky WhatsApp button and in-page CTAs carry that job.
- **Hero animation** rebuilt: a seated figure, seven chakras firing root-to-crown in sequence, prana rising through the central channel, a cleansing sweep passing down the body, aura ripples radiating outward, two counter-rotating gold rings. Roughly twice as fast as before and far more visible. It sits below the headline, subheadline and buttons on mobile; beside them on desktop.
- **Impact numbers** — 1,000+ / 125+ / 5,000+ — as a dark gold-gradient band that counts up when scrolled into view. On home and about.
- **Testimonials** are a five-card horizontal swipe rail on mobile with snap points, becoming a grid on desktop.
- **Footer on mobile**: logo and blurb across the top, Explore bottom-left, Visit us and Reach us stacked bottom-right.
- **Policies page** added, linked from every footer.
- The brown top strip is gone.

## The Marathi toggle

English lives in the HTML. Marathi lives in `app.js` in the `MR` object, keyed to the `data-i18n` attributes. 304 strings, all translated, including the full policies page. To reword anything in Marathi, find the key and edit the string.

The visitor's choice is remembered in their browser, so a Marathi reader returns to Marathi.

## The enquiry form

No backend. The form composes a message and opens WhatsApp with it ready to send — one tap on mobile — so nothing is stored on the site and there's nothing to secure or maintain.

## Preview locally

```
npx vercel dev
```
mimics production exactly, clean URLs included. `python3 -m http.server 8000` also works but won't resolve `/about` without the `.html`.

## Two things worth knowing

**The policies are a solid starting draft, not legal advice.** They're written to fit how you actually work and they cover the important ground — no cure claims, medical care continues, clear cancellation windows. Have a lawyer read them before you rely on them, and check the refund windows match what you're willing to honour. Two spots need your input: the governing jurisdiction currently says Thane district, and the products section assumes returns are handled by your shop domain.

**Two claims from the printed flyer are deliberately absent:** "healings for all types of physical and psychological ailments", and body sculpting / weight loss. Both invite regulatory attention and put off the educated, sceptical audience most likely to pay well. The psychology credential and the impact numbers do far more persuasive work than a cure claim would.
