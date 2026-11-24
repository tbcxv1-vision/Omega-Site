# Omega Incorporated — Website

Static HTML/CSS/JS site based on the client-approved Bolt demo
(https://tech-solutions-compa-g7et.bolt.host). Same layout, colors, fonts and icons.
The Sentinel branding has been replaced with Omega Incorporated and an Ω logo mark.

## Folder layout

```
src/                 ← edit these files
  config.json        ← company email, phone, location, site URL, form endpoint (PLACEHOLDERS)
  pages/*.html       ← one file per page (front-matter at top sets title/description)
  partials/*.html    ← shared pieces: header, footer, sections reused across pages
  assets/            ← css, js, images (favicon, og-image, apple-touch-icon)
  static/.htaccess   ← Apache/cPanel settings (404 page, security headers, caching)
  icons.json         ← Lucide icon SVGs used via {{icon:Name}}
build.mjs            ← zero-dependency build script
public/              ← GENERATED site — upload the contents of this folder
```

## Build

Requires Node.js 18+ (no npm install needed):

```bash
node build.mjs
```

## Before launch (to-do)

1. **Real contact details**: edit `src/config.json` (`email`, `phone`, `location`, `siteUrl`), then rebuild.
2. **Contact form**: create a free form at https://formspree.io and put its URL in `formEndpoint`
   (e.g. `https://formspree.io/f/abcdwxyz`). Until then the form shows a message asking
   visitors to email instead.
3. **HTTPS**: once SSL is active, uncomment the HTTPS redirect lines in `src/static/.htaccess`.
4. If the site will live in a sub-folder rather than the domain root, change `ErrorDocument`
   in `.htaccess` and `base: /` in `src/pages/404.html` to that folder.

## Deploy to cPanel

Run `node build.mjs`, then upload **everything inside `public/`** (including the hidden
`.htaccess`) to `public_html/` using File Manager or FTP.

## Pages

| Page | File | Notes |
|---|---|---|
| Home | `index.html` | Full approved one-page layout (all sections) |
| Services | `services.html` | + new "How we work" 4-step process |
| Training | `training.html` | |
| Fellowship | `fellowship.html` | + new FAQ |
| About | `about.html` | |
| Contact | `contact.html` | `?interest=fellowship` etc. pre-selects the topic |
| 404 | `404.html` | |

## Improvements over the demo

- Separate, shareable pages for each section (better for Google), with active-nav highlight and breadcrumbs.
- Content stays visible without JavaScript or with reduced-motion turned on. In the demo,
  scroll animations hid the content until it played.
- Accessible: skip link, visible focus rings, correct heading order, labelled mobile menu (Esc closes it).
- Contact form: inline + summary validation, loading/success/error states, spam honeypot,
  topic pre-selected from the button clicked ("Apply Now" → Fellowship), fellowship hint,
  a request timeout, and an email fallback.
- "Active security incident?" call-now panel on the contact section.
- SEO: unique titles/descriptions, Open Graph share image, structured data, sitemap.xml, robots.txt.
- cPanel `.htaccess` with a custom 404 page, security headers, compression and caching.
