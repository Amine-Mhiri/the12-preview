# Deploying the12

The repository is a plain static site — there is nothing to build.

1. Vercel → **Add New… → Project**.
2. **Import** `Amine-Mhiri/the12-preview`.
3. Framework preset **Other**; **Build Command** empty; **Output Directory** `.`.
4. **Deploy**.

Every push to `main` redeploys automatically.

`vercel.json` rewrites `/the12-preview/:path*` to `/:path*`, so the pages that
still carry absolute `/the12-preview/...` asset and link paths (everything under
`classic/`, `p/`, `shelves/` and the other exported pages) keep working on a
Vercel domain. `trailingSlash: true` keeps the directory URLs (`shelves/protein/`)
resolving to their `index.html`.

The explicit page rewrite now maps `/the12-preview/.../` directly to the
corresponding `.../index.html`. Asset and Next navigation payload filenames keep
the existing generic prefix rewrite.

The 6 October web-fix release preserves the existing catalogue export and every
comparator file. V5 search/mobile files are updated at `/` and `/v5/`. Klean
Isolate image references in the existing HTML/Next payloads point to a neutral
"Photo unavailable" SVG: the mismatched original photograph remains preserved.
No full Next catalogue rebuild is copied into this release. `release.json`
records the exact source commits and the preserved public dataset hashes.

The GitHub Pages URL keeps working unchanged:
<https://amine-mhiri.github.io/the12-preview/>
