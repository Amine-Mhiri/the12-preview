# Deploying the12

The repository is a plain static site — there is nothing to build.

1. Vercel → **Add New… → Project**.
2. **Import** `Amine-Mhiri/the12-preview`.
3. Framework preset **Other**; **Build Command** empty; **Output Directory** `.`.
4. **Deploy**.

Every push to `main` redeploys automatically.

## Why `vercel.json` looks the way it does

The exported pages were built with GitHub Pages' `/the12-preview` base path, so
every asset and link they carry is absolute: `/the12-preview/shelves/`,
`/the12-preview/_next/…`. On a Vercel domain the site sits at the root, so those
paths have to be rewritten back.

The order of the three rewrites matters:

1. **Directory URLs first.** A rewrite to `/shelves/` does *not* resolve to that
   directory's `index.html` on its own, so the destination names the file
   explicitly. Without this rule every page-to-page link inside the exported
   pages 404s — assets keep working, because they map to real files, which is
   why a broken deployment still looks healthy from the home page and only falls
   over one click in.
2. **Then files** — stylesheets, scripts, fonts, photographs, pack shots.
3. **Then the bare prefix** itself.

`trailingSlash: true` makes Vercel redirect `/shelves` to `/shelves/` so rule 1
gets the chance to match.

Note that `vercel.json` takes no comment keys — Vercel rejects unknown
properties and the deployment fails to build — which is why this explanation
lives here.

The GitHub Pages URL keeps working unchanged:
<https://amine-mhiri.github.io/the12-preview/>
