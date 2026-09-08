# Urjita Yog ani Pranic Upchar Kendra — website

Mobile-first static site. No build step, no framework, no dependencies.

```
index.html       Home
about.html       All three practitioner profiles + lineage
services.html    Healings + how a session works
workshops.html   Course, free meditation, programmes
contact.html     Locations + WhatsApp enquiry form
policies.html    Privacy + Terms + Refund
styles.css       All styling (mobile-first)
app.js           Language toggle, Marathi dictionary, counters, WhatsApp
vercel.json      Clean URLs
images/          Logos, portraits — put testimonial screenshots here too
```

## Fixing the broken logo

The logo path is `/images/urjita-logo.png`. It breaks in exactly two situations:

**1. The `images` folder never reached GitHub.** This is the usual cause. When you download files one by one they land loose in Downloads, and the folder structure is lost. Use the ZIP instead — unzip it and the structure is already correct. Your repo must look like this, with `index.html` at the very top:

```
your-repo/
├── index.html
├── about.html
├── ...
├── styles.css
├── app.js
├── vercel.json
└── images/
    ├── urjita-logo.png
    ├── urjita-logo-light.png
    ├── kshipra.jpg
    ├── kshitij.jpg
    ├── mrs-lokare.jpg
    └── choa-kok-sui.jpg
```

If GitHub shows `urjita-website/index.html` instead, either move everything up one level, or set **Root Directory** to `urjita-website` in Vercel → Settings → Build & Deployment.

**2. You opened the HTML file by double-clicking it.** Paths starting with `/` resolve from a site root, which doesn't exist on your desktop. Every image and the stylesheet will be missing. Run a local server instead — see below — or just deploy and check there.

Filenames on Vercel are case-sensitive. Keep everything lowercase.

## Deploy

1. Push all files to the root of a GitHub repo.
2. Vercel → Add New → Project → import the repo.
3. Framework Preset: **Other**. Build Command and Output Directory: blank.
4. Deploy, then Settings → Domains.

Preview locally with `npx vercel dev` — it mimics production including clean URLs.

## What still needs your input

**The phone number.** Your message cut off at "use only one mobile number everywhere and that is -". I used **+91 84463 39272** everywhere and removed 9664338632. If it should be the other one, change `WHATSAPP_NUMBER` and `PHONE_DISPLAY` at the top of `app.js`, then search the HTML files for `8446339272` and swap. Kshitij's own number is kept on his profile only — tell me if you want that gone too.

**Mrs. Lokare's full name.** The site says "Mrs. Lokare" throughout because I don't have it. Search for `Mrs. Lokare` and replace, and update `m3.name` in `app.js` for the Marathi.

**Her bio is my draft, not her words.** I wrote it from the three facts you gave me — 25 years teaching yoga, 25+ years acupressure, 10 years healing — plus neutral framing. Read it with her and change anything that isn't true. I deliberately claimed no certifications or lineages for her, since I don't know them.

**The Choa Kok Sui photograph** is cropped from your own flyer, so it's low resolution and sits small on purpose. If you have a higher-resolution official portrait, replace `images/choa-kok-sui.jpg`. Note that MCKS imagery is controlled by the Institute for Inner Studies — use one you're authorised to publish.

**Shop link.** `app.js` line 8: change `SHOP_URL` once and every Shop link updates.

**Testimonial screenshots.** Save as `images/testimonial-1.jpg` … `testimonial-5.jpg`, then in `index.html` replace each `<div class="drop">…</div>` with `<img src="/images/testimonial-1.jpg" alt="Client message" loading="lazy">` and edit the caption below it. Crop out phone numbers and profile photos first.

**Map pins.** In `contact.html`, replace the two "Get directions" links with your exact Google Maps share links.

## What changed in this round

**Menu on mobile — root cause found and fixed.** The nav panel lives inside `.site-header`, which has `z-index: 100`. That creates a stacking context, so the panel could never rise above 100 no matter what — and the backdrop at `z-index: 140` was painting straight over it. That's why the menu looked washed out and see-through. Layering is now: backdrop 90, header 100, panel 5 (inside the header), WhatsApp button 80. The panel also has a solid opaque background, a drop shadow, a close button, divider lines between items, and the WhatsApp button hides while it's open. The layering rules are documented at the top of `styles.css` — read that comment before changing any `z-index`.

**Dim text on the plum sections — fixed.** Rules like `.pillar p` and `.benefit p` set a dark ink colour and were declared after the `.dark` rules with identical specificity, so dark-on-dark was winning. All text-on-plum overrides now sit in one block at the very end of the stylesheet where they always win, and the colour was lifted from 78% to 92% opacity. Headings are pure white, numbers and eyebrows are gold.

**Hover states are much more obvious.** Cards on plum go from 7% to 18% white on hover with a gold border; cards on cream go from white to blush pink with a gold border and lift. Testimonial cards and location cards now respond too.

## Earlier changes


- **Testimonials scroll horizontally on every screen**, laptop included. Cards are larger on desktop, and you can drag them with the mouse as well as scroll.
- **Logo** now sits in a fixed-size box so a missing or slow image can never break the header layout — which is what was mangling the mobile menu. Logo files are also 14 KB each now, down from 210 KB.
- **Mobile menu** rebuilt: proper backdrop, body scroll locks while open, closes on Escape, on backdrop tap, and automatically if the window widens to desktop.
- **The brownish sections are gone.** Those bands now use the deep plum from the logo wordmark, with gold rules and light text. The footer and quote cards match.
- **One phone number** across the whole site.
- **Three profiles on About**, each with the photo first and the bio after: Kshipra with her qualifications and timeline, Kshitij with his full training, practice, education and contact, and Mrs. Lokare with a stats strip.
- **Grand Master Choa Kok Sui's portrait** added to the lineage section.
- **Home has a team section** — three photo cards, each linking to that person's profile on the About page.
