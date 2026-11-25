# Developer Handoff — The Spaceback Awards 2026

A static marketing microsite for The Spaceback Awards 2026 — a scroll-driven
cinematic hero video that announces the 2026 winners, plus a Terms & Conditions
page. (Submissions are closed; the page now announces winners.)

- **Live (GitHub Pages):** https://blgsky.github.io/awards-spaceback/
- **Repo:** https://github.com/blgsky/awards-spaceback

## Stack

Plain HTML / CSS / vanilla JS. **No framework, no build step** — just static files.

```
index.html            Winners page (hero, why the awards, the winners, judges, closing CTA)
terms.html            Terms & Conditions
styles/main.css       All styles
scripts/main.js       Scroll-scrubbed hero video + nav / reveal interactions
video/                Hero video (mp4)
logo/spaceback.svg    Header logo
serve.py              Local dev server (adds HTTP Range support — see below)
```

## Run locally

```bash
python3 serve.py     # http://127.0.0.1:8123
```

Do **not** open `index.html` via `file://` — relative paths and video seeking
break. It must be served over HTTP by a server that supports **Range requests**
(Python's built-in `http.server` does not, which is why `serve.py` exists).

## Must-preserve behaviors (easy to break)

**1. Scroll-scrubbed hero video.** Scroll position drives `video.currentTime`
(0–8s), frozen on the last frame. Two hard requirements:
- The host **must serve the mp4 with HTTP Range (206)**. GitHub Pages, Netlify,
  Vercel, S3/CloudFront, and nginx all do this by default.
- The hero mp4 is encoded **all-intra (a keyframe on every frame)** so seeking
  is instant. **Do not re-compress it with default settings** or scrubbing will
  stall badly. If you must re-encode, keep all-intra
  (`-g 1 -keyint_min 1 -sc_threshold 0`).
- `prefers-reduced-motion` disables scrubbing and shows the final frame.

> **Note — submission form removed.** Earlier versions collected entries via a
> form (`submit.html`) that POSTed to a Google Apps Script → Google Sheet. The
> page is now a winners announcement, so the form was removed. The full form and
> its Apps Script backend are preserved in the **`v0.9.0`** git tag if ever
> needed again.

## Hosting on a subdomain

**Option A — keep GitHub Pages:** point a CNAME (e.g. `awards.spaceback.com`
→ `blgsky.github.io`), set the custom domain in the repo's Pages settings, and
commit a `CNAME` file. HTTPS is issued automatically.

**Option B — re-host the static files** anywhere (Netlify / Vercel / S3+CDN).
Nothing special needed beyond Range support (all of these have it).

## If migrating to Webflow

The design can be rebuilt in Webflow, but the **scroll-scrubbed video** has no
native equivalent — port the logic in `scripts/main.js` into a custom-code embed
and host the **all-intra** mp4 on a Range-capable CDN. `terms.html` is static
content and can move into a Webflow page/CMS as-is.

## Brand quick-reference

- Font: Montserrat (Google Fonts).
- Accent gradient: `#8E26FF → #FC0185` (CSS var `--grad-accent`).
- Dark base: `#05060d`.
