# the12 — preview build

A public, static preview of **the12**: a curated sport-nutrition platform for
Kuwait that holds no stock and sells nothing. Every product reaching the market
is read, anything carrying an ingredient we cannot defend is rejected, and only
the twelve best of each product type are published — with the price at every
merchant that genuinely delivers there.

### → https://amine-mhiri.github.io/the12-preview/

**396 products analysed · 181 rejected (45.7%) · 185 published across 23 product types.**

## What is where

- `index.html` — the **v4 home page**, the site's front door. Plain HTML/CSS/JS
  with no build step; its styles and script live in `assets/`.
- `classic/` — the **previous home page**, the Next.js-exported one. Still
  reachable at `classic/` and unchanged.
- `shelves/`, `p/`, `rejected/`, `method/`, `ledger/`, `merchants/`, `about/`,
  `brands/` — the exported category, product and editorial pages the home page
  links into. `products/` holds the product photographs.
- `redesign/` — a redirect to the home page, kept so the previously announced
  preview URL still resolves.

## Deploying

The repository is static: no build command, no output directory. It is served
from GitHub Pages today and deploys to Vercel as-is — see [DEPLOY.md](DEPLOY.md).
`vercel.json` rewrites `/the12-preview/*` so the exported pages' absolute paths
keep working on a Vercel domain.

Prices, stock and merchant links in this preview are derived from research
rather than from a live crawl, and the pages say so where it matters.
