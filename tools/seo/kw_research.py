#!/usr/bin/env python3
"""Keyword research for the12 naming — Kuwait, English + Arabic, real volumes.

Data source: DataForSEO v3 (https://api.dataforseo.com). Credentials are read from the
environment variables DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD (never hard-coded).

What it does, per language (en, ar), location Kuwait (Google geo target 2414):
  1. search_volume      — exact Google Ads monthly volume, CPC, competition for every seed.
  2. keywords_for_keywords — expands each cluster's seeds into Google's related ideas
                          (long tail), with volumes. Up to 20 seeds per request.
  3. autocomplete       — Google autocomplete suggestions for the top seeds (gl=kw).
  4. google_trends      — 12-month interest for the top 5 seeds (optional, --trends).
Outputs (in --out, default ./out):
  volumes_<lang>.csv, ideas_<lang>.csv, autocomplete_<lang>.csv, trends_<lang>.json,
  keywords_all.csv (merged, deduplicated, with cluster + language + source),
  summary.md (top keywords per cluster, totals).

Usage:
  python3 kw_research.py                 # both languages, no trends
  python3 kw_research.py --lang en --trends
  python3 kw_research.py --dry-run       # no network: validates seeds and prints the plan

Cost (DataForSEO list prices, Oct 2026 order of magnitude): search_volume $0.05 per request
(≤1000 keywords); keywords_for_keywords ≈ $0.05 per request + results; autocomplete ≈ $0.002
per request; trends ≈ $0.03 per request. A full run is a few US dollars.
"""
import argparse, base64, csv, json, os, sys, time, urllib.request, urllib.error
from collections import defaultdict

API = "https://api.dataforseo.com/v3"
KUWAIT = 2414  # Google Ads geo target id for Kuwait


def auth_header():
    login = os.environ.get("DATAFORSEO_LOGIN")
    pw = os.environ.get("DATAFORSEO_PASSWORD")
    if not login or not pw:
        sys.exit("Set DATAFORSEO_LOGIN and DATAFORSEO_PASSWORD in the environment (API credentials).")
    tok = base64.b64encode(f"{login}:{pw}".encode()).decode()
    return {"Authorization": f"Basic {tok}", "Content-Type": "application/json"}


def post(path, payload, retries=3):
    data = json.dumps(payload).encode()
    for attempt in range(retries):
        req = urllib.request.Request(API + path, data=data, headers=auth_header(), method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                body = json.loads(r.read().decode())
            if body.get("status_code") != 20000:
                raise RuntimeError(f"{path}: {body.get('status_message')}")
            return body
        except (urllib.error.URLError, RuntimeError) as e:
            if attempt == retries - 1:
                raise
            time.sleep(2 ** attempt)


def read_seeds(path):
    """Return [(cluster, keyword)], clusters named from the # comment lines."""
    out, cluster = [], "uncategorised"
    for line in open(path, encoding="utf-8"):
        s = line.strip()
        if not s:
            continue
        if s.startswith("#"):
            label = s.lstrip("#").strip()
            if " — " in label or "—" in label:
                cluster = label.split("—", 1)[-1].strip()
            continue
        out.append((cluster, s))
    return out


def chunks(xs, n):
    for i in range(0, len(xs), n):
        yield xs[i:i + n]


def search_volume(keywords, lang):
    rows = []
    for batch in chunks(keywords, 1000):
        body = post("/keywords_data/google_ads/search_volume/live",
                    [{"keywords": batch, "location_code": KUWAIT, "language_code": lang}])
        for task in body.get("tasks", []):
            for item in task.get("result") or []:
                rows.append({
                    "keyword": item.get("keyword"),
                    "search_volume": item.get("search_volume") or 0,
                    "cpc": item.get("cpc") or 0,
                    "competition": item.get("competition"),
                    "competition_index": item.get("competition_index"),
                    "monthly": json.dumps([m.get("search_volume") for m in (item.get("monthly_searches") or [])]),
                })
    return rows


def keywords_for_keywords(seed_batch, lang):
    body = post("/keywords_data/google_ads/keywords_for_keywords/live",
                [{"keywords": seed_batch, "location_code": KUWAIT, "language_code": lang,
                  "sort_by": "search_volume", "include_adult_keywords": False}])
    rows = []
    for task in body.get("tasks", []):
        for item in task.get("result") or []:
            rows.append({
                "keyword": item.get("keyword"),
                "search_volume": item.get("search_volume") or 0,
                "cpc": item.get("cpc") or 0,
                "competition": item.get("competition"),
                "competition_index": item.get("competition_index"),
            })
    return rows


def autocomplete(keyword, lang):
    body = post("/serp/google/autocomplete/live/advanced",
                [{"keyword": keyword, "location_code": KUWAIT, "language_code": lang}])
    out = []
    for task in body.get("tasks", []):
        for res in task.get("result") or []:
            for item in res.get("items") or []:
                if item.get("type") == "autocomplete":
                    out.append(item.get("suggestion"))
    return out


def trends(keywords, lang):
    body = post("/keywords_data/google_trends/explore/live",
                [{"keywords": keywords[:5], "location_code": KUWAIT, "language_code": lang,
                  "date_from": "2025-09-01", "date_to": "2026-09-30"}])
    return body


def write_csv(path, rows, fields):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for r in rows:
            w.writerow(r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", choices=["en", "ar", "both"], default="both")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "out"))
    ap.add_argument("--trends", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--max-autocomplete", type=int, default=40, help="top seeds to expand with autocomplete")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    langs = ["en", "ar"] if a.lang == "both" else [a.lang]
    here = os.path.dirname(os.path.abspath(__file__))
    merged = []

    for lang in langs:
        seeds = read_seeds(os.path.join(here, f"seeds_{lang}.txt"))
        by_cluster = defaultdict(list)
        for c, k in seeds:
            by_cluster[c].append(k)
        print(f"[{lang}] {len(seeds)} seeds in {len(by_cluster)} clusters")
        if a.dry_run:
            for c, ks in by_cluster.items():
                print(f"   - {c}: {len(ks)} seeds → 1 volume batch, {len(list(chunks(ks, 20)))} expansion request(s)")
            continue

        # 1. exact volumes for seeds
        vol = search_volume([k for _, k in seeds], lang)
        volmap = {r["keyword"].lower(): r for r in vol}
        write_csv(os.path.join(a.out, f"volumes_{lang}.csv"), vol,
                  ["keyword", "search_volume", "cpc", "competition", "competition_index", "monthly"])
        for c, k in seeds:
            r = volmap.get(k.lower(), {"keyword": k, "search_volume": 0, "cpc": 0, "competition": None})
            merged.append({**r, "cluster": c, "lang": lang, "source": "seed"})

        # 2. long tail per cluster
        ideas = []
        for c, ks in by_cluster.items():
            for batch in chunks(ks, 20):
                for r in keywords_for_keywords(batch, lang):
                    ideas.append({**r, "cluster": c, "lang": lang, "source": "ideas"})
                time.sleep(0.3)
        write_csv(os.path.join(a.out, f"ideas_{lang}.csv"), ideas,
                  ["cluster", "keyword", "search_volume", "cpc", "competition", "competition_index"])
        merged.extend(ideas)

        # 3. autocomplete for the top seeds by volume
        top = sorted(vol, key=lambda r: -r["search_volume"])[: a.max_autocomplete]
        ac = []
        for r in top:
            for s in autocomplete(r["keyword"], lang):
                ac.append({"seed": r["keyword"], "suggestion": s, "lang": lang})
            time.sleep(0.2)
        write_csv(os.path.join(a.out, f"autocomplete_{lang}.csv"), ac, ["seed", "suggestion", "lang"])

        # 4. trends (optional)
        if a.trends and top:
            with open(os.path.join(a.out, f"trends_{lang}.json"), "w", encoding="utf-8") as f:
                json.dump(trends([r["keyword"] for r in top[:5]], lang), f, ensure_ascii=False, indent=1)

    if a.dry_run:
        return

    # merge + dedupe (keep the highest volume per keyword+lang)
    best = {}
    for r in merged:
        key = (r["lang"], (r.get("keyword") or "").lower())
        if key not in best or (r.get("search_volume") or 0) > (best[key].get("search_volume") or 0):
            best[key] = r
    rows = sorted(best.values(), key=lambda r: -(r.get("search_volume") or 0))
    write_csv(os.path.join(a.out, "keywords_all.csv"), rows,
              ["lang", "cluster", "source", "keyword", "search_volume", "cpc", "competition", "competition_index"])

    # summary
    lines = ["# Keyword research — Kuwait (Google Ads volumes via DataForSEO)\n"]
    total = sum(r.get("search_volume") or 0 for r in rows)
    lines.append(f"{len(rows)} unique keywords · {total:,} total monthly searches (sum of means)\n")
    for lang in langs:
        lines.append(f"\n## {lang.upper()} — top 40 by volume\n\n| keyword | cluster | vol/mo | CPC |\n|---|---|---:|---:|")
        for r in [x for x in rows if x["lang"] == lang][:40]:
            lines.append(f"| {r['keyword']} | {r['cluster']} | {r.get('search_volume') or 0:,} | {r.get('cpc') or 0} |")
    clusters = defaultdict(int)
    for r in rows:
        clusters[(r["lang"], r["cluster"])] += r.get("search_volume") or 0
    lines.append("\n## Demand by cluster\n\n| lang | cluster | vol/mo |\n|---|---|---:|")
    for (lang, c), v in sorted(clusters.items(), key=lambda kv: -kv[1]):
        lines.append(f"| {lang} | {c} | {v:,} |")
    open(os.path.join(a.out, "summary.md"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print("done →", a.out)


if __name__ == "__main__":
    main()
