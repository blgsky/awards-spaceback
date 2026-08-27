# Developer Handoff — The Spaceback Awards 2026

A static marketing microsite for The Spaceback Awards 2026: a scroll-driven
cinematic hero video, editorial content sections, a Terms & Conditions page,
and a custom campaign-submission form that writes entries to Google Sheets.

- **Live (GitHub Pages):** https://blgsky.github.io/awards-spaceback/
- **Repo:** https://github.com/blgsky/awards-spaceback

## Stack

Plain HTML / CSS / vanilla JS. **No framework, no build step** — just static files.

```
index.html            Landing page (hero, why, who, categories, rewards, judges, dates, FAQ, CTA)
submit.html           Campaign submission form
terms.html            Terms & Conditions
styles/main.css       All styles
scripts/main.js       Scroll-scrubbed hero video + nav / accordion / reveal interactions
scripts/form.js       Submission form: validation, progress bar, POST to backend
video/                Hero video (mp4)
logo/spaceback.svg    Header logo
apps-script/Code.gs   Google Apps Script backend for the form (deployed separately)
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

**2. Submission form → Google Sheets.**
- `scripts/form.js` POSTs the entry (as `text/plain`, `mode: no-cors`) to a
  Google Apps Script web app — see the `ENDPOINT` constant at the top of the file.
- `apps-script/Code.gs` appends each entry as a row in a Google Sheet and saves
  the uploaded logo to a Google Drive folder (link stored in the sheet).
- The web app **must be deployed with "Who has access: Anyone"** or external
  entrants are blocked by a Google login wall.
- The Sheet + Drive folder currently live under the owner's Google account. For
  a new environment, redeploy the script (fill `SHEET_ID` / `DRIVE_FOLDER_ID`,
  deploy as "Anyone"), then update `ENDPOINT` in `form.js`.
- Entries are viewed/exported from the Sheet: File → Download → CSV / XLSX.

## Hosting on a subdomain

**Option A — keep GitHub Pages:** point a CNAME (e.g. `awards.spaceback.com`
→ `blgsky.github.io`), set the custom domain in the repo's Pages settings, and
commit a `CNAME` file. HTTPS is issued automatically.

**Option B — re-host the static files** anywhere (Netlify / Vercel / S3+CDN).
Nothing special needed beyond Range support (all of these have it).

## If migrating to Webflow

The design can be rebuilt in Webflow, but two pieces need custom code:

1. **Scroll-scrubbed video** — Webflow has no native equivalent. Port the logic
   in `scripts/main.js` into a custom-code embed, and host the **all-intra** mp4
   on a Range-capable CDN.
2. **Submission form** — either keep posting to the same Apps Script `ENDPOINT`
   (custom code), or rebuild with Webflow Forms + a Sheets integration
   (Zapier/Make). Preserve the full field set and the logo→Drive handling.

`terms.html` is static content and can move into a Webflow page/CMS as-is.

## Brand quick-reference

- Font: Montserrat (Google Fonts).
- Accent gradient: `#8E26FF → #FC0185` (CSS var `--grad-accent`).
- Dark base: `#05060d`.
