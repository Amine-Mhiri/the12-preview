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

The GitHub Pages URL keeps working unchanged:
<https://amine-mhiri.github.io/the12-preview/>
