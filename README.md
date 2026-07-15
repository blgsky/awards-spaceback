# The Spaceback Awards 2026

Premium campaign microsite for The Spaceback Awards 2026, featuring a
scroll-driven cinematic background video (the hero scrubs frame-by-frame with
scroll position and freezes on its final frame), glass UI, and a
purple→magenta brand palette.

## Structure

```
index.html            # markup
styles/main.css        # styles
scripts/main.js        # scroll-scrub video + interactions
video/                 # hero video (1080p all-intra for smooth scrubbing)
logo/spaceback.svg     # header logo
serve.py               # local dev server (adds HTTP Range support)
```

## Run locally

The hero video is scrubbed by seeking `video.currentTime`, which requires the
server to support HTTP **Range** requests. Python's built-in `http.server`
does **not**, so use the bundled server:

```bash
python3 serve.py
# open http://127.0.0.1:8123
```

Do not open `index.html` directly via `file://` — assets and video seeking
won't work reliably.

## Notes

- `video/spaceback-awards-2026-hero.mp4` is re-encoded to 1080p all-intra
  (a keyframe on every frame) so scroll scrubbing is instant.
- `video/spaceback-awards-2026-hero.original.mp4` is the untouched 4K source.
- Hosts like GitHub Pages / Netlify / S3 support Range requests out of the
  box, so scrubbing works there without `serve.py`.
