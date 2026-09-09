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

**Logo — the white patch is gone.** The old cut-out judged transparency by brightness, so the bright yellow centre of the gold mark got treated as background and punched a hole through it. The new version flood-fills only the white that is *connected to the outside edge*, so enclosed light areas inside the artwork are left alone. The gold now reads solid from tip to tip.

**Hero** now shows the chakra artwork instead of the drawn SVG. A soft magenta-and-gold aura breathes behind it and the image drifts very slightly, so the section still has life without being an animation.

**Five real testimonials** are live on Home, Healings and Workshops. I cropped the status bar and chat header off every screenshot, which removes the contact names, the profile photos and the phone numbers in one go — nothing identifying is left. Captions describe what each message is about rather than naming anyone.

**Shop page** now leads with product photography. Bath Salts, Aura Sprays, Vastu Sprays, Crystals and Crystal Jewellery each have an image; the "not sure what you need" card keeps its icon.

**Lotus** sits above the free-meditation invitation on the home page, with a soft gold glow.

### About the images I derived

All the artwork arrived on a solid black background, which would have shown as a black box on the cream site. I recovered each one by treating black as the matte and dividing the colour back out — that is why the watercolour edges fade cleanly instead of leaving a grey fringe.

Two shop images were cut from your Aura Spray photo, since there was no separate artwork for them:

- `bath-salts.png` — the salt jar from the right of that photo
- `crystal-jewellery.png` — the beaded bracelet from the bottom left

The bracelet crop includes part of a bottle base. It works, but a dedicated jewellery photo would be better whenever you have one — save it over `images/crystal-jewellery.png` and nothing else needs changing.

All PNGs are palette-compressed: the images folder is 2.1 MB rather than 5.4 MB, which matters on Indian mobile data.

## Earlier changes

**Photo distortion — fixed at the root.** The images were always exactly 760 x 950 (a clean 4:5), so the files were never the problem. The `<img>` tags carry `width="760" height="950"`, and my CSS set `width: 100%` without `height: auto` — so the browser shrank the width to fit the column while holding the height at 950px, squashing every portrait. `img { height: auto; }` is now global. If you swap in your own photos, keep them at **760 x 950 or any 4:5 ratio** (e.g. 900 x 1125, 1200 x 1500) and update the `width`/`height` attributes to match.

**Testimonials** now appear on the Healings and Workshops pages as well as Home, identical in look and behaviour. They come from one shared block, but the build writes them into each page — so if you edit the screenshots, edit all three HTML files.

**Madhavi Lokare** replaces "Mrs. Lokare" everywhere, and her image file is now `images/madhavi-lokare.jpg`. Years of healing is 15, in the stats strip and in her bio text.

**Branch phone numbers.** Badlapur East shows +91 84463 39272 with your Google Maps pin. Dombivli East shows +91 99671 21519. Both appear on the Contact page and in the footer. The WhatsApp button and enquiry form still route to 84463 39272 — say the word if Dombivli enquiries should go elsewhere. The Dombivli maps link is still a name search; send me the pin and I'll swap it.

**New figures:** 7,000+ healings, 600+ sessions online and offline, 2,500+ students and teachers reached by the Super Brain Yoga project in three months. They count up on Home and About.

**Shop page added** at `/shop`, with the five categories plus a "not sure what you need" card. Every button points at `https://shop.urjitapranichealing.com`, set once as `SHOP_URL` in `app.js`. To send each category to its own collection page instead, replace `data-shop-link` on that button with a normal `href`.

## Earlier changes

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
