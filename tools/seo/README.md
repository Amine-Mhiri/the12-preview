# SEO naming research — Kuwait

Goal: pick a brand/domain for the curated-consumption platform (not limited to "12")
from **real demand data**, not guesses. Three steps, all scripted here.

## 1. Keyword research with search volumes (DataForSEO)

`kw_research.py` pulls, for Kuwait (Google geo 2414) in English and Arabic:

- exact Google Ads monthly volumes, CPC and competition for ~165 seed keywords
  (`seeds_en.txt`, `seeds_ar.txt`, grouped in clusters: core offer, family & kids,
  sport & nutrition, body & home, trust/intent, buying & comparison);
- Google's related-keyword ideas per cluster (the long tail), with volumes;
- Google autocomplete suggestions (gl=kw) for the top seeds;
- optionally 12-month Google Trends interest for the top five seeds.

Outputs land in `out/`: per-language CSVs, a merged `keywords_all.csv` and `summary.md`.

Why DataForSEO: one pay-as-you-go account covers Google Ads volumes with Kuwait as a
location, keyword expansion, autocomplete and Trends. Alternatives that also work with
this script's structure: Semrush API (Business plan), Keywords Everywhere API (volume
only), Google Ads Keyword Planner API (needs a developer token and OAuth).

Setup (in the cloud environment's settings → Edit):
- API credentials / environment variables: `DATAFORSEO_LOGIN`, `DATAFORSEO_PASSWORD`
  (the API login and password from app.dataforseo.com → API Access).
- Network access: allow `api.dataforseo.com`, or choose a broader access level.
- Start a new session so the variables are picked up, then:

```
python3 tools/seo/kw_research.py --trends
```

A full run costs a few US dollars of DataForSEO credit.

## 2. Domain availability (RDAP, free)

`domain_check.py` checks every candidate in `names.txt` on `.com .co .shop .store .health`
and lists `.com.kw` for manual checking at https://www.kw/ (CITRA; needs a Kuwaiti
commercial licence matching the name).

Network access needed: `rdap.verisign.com`, `rdap.org` and the registry hosts it redirects
to (`rdap.nic.shop`, `rdap.identitydigital.services`, `rdap.nic.co`, `rdap.nic.health`).

```
python3 tools/seo/domain_check.py
```

## 3. Scoring and the shortlist

The report scores each candidate 0–5 on: demand adjacency (does the name carry a term the
ICP actually searches, from step 1), pronounceability in English and Arabic, length (≤ 8
letters ideal), trademark collision risk (web search), .com availability (step 2), and
brand stretch (does it survive adding food, body and home categories). The top five get a
one-line positioning each.

## Notes

- Google treats keywords in a domain as a minor contextual signal; a short brandable name
  with keyword-rich content hubs (e.g. `/clean-label/`, `/sugar-free/`) outranks an
  exact-match domain with thin content. The data from step 1 therefore shapes the **site
  architecture and content** as much as the name.
- Kuwait searches are bilingual; Arabic volumes often exceed English for everyday
  categories, English dominates for supplements and brands.
