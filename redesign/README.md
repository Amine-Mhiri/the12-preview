# the12 — v3 home page prototype ("the luxury shelf")
Static, responsive HTML/CSS/JS prototype of the new home page. No framework, no build step.
Files: `index.html` · `assets/v3.css` · `assets/v3.js` · `assets/icons.svg` (sprite; the symbols used are also inlined in the page, as Chrome will not resolve `<use href="external.svg#id">`).
Open it from a static server rooted at this repo's parent — product photos load as `../products/*.jpg` — e.g. `http://localhost:8000/the12-preview/redesign/index.html`.

| Token | Value | Use |
|---|---|---|
| `--forest` | `#0B3B2A` | dark bands, hero ground, top bar |
| `--brand` / `--bright` | `#0F7A4A` / `#16A05F` | primary buttons and links / accents, meters, hover |
| `--mint` | `#E6F4EC` | soft tint behind badges and icon discs |
| `--ivory` / `--sand` | `#F6F3EC` / `#EDE8DD` | editorial bands, photo grounds / placeholder base |
| `--ink` / `--muted` / `--line` | `#1B2420` / `#5C6660` / `#E2E8E4` | text / secondary text / hairlines |
| `--gold` / `--gold-tint` | `#B9973E` / `#F3E7C6` | "The Benchmark" seal ring / gold pill background |
| `--price` / `--reject` | `#C8432A` / `#B23C2A` | per-serving price / rejection text and counts |
