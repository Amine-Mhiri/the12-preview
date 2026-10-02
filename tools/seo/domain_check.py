#!/usr/bin/env python3
"""Bulk domain availability via RDAP (free, authoritative, no API key).

Reads names.txt (one candidate per line, with or without TLD; a bare name is checked on every
TLD in --tlds). For each domain it asks the registry's RDAP server:
  HTTP 404 → not registered (available, subject to premium/reserved status at the registrar)
  HTTP 200 → registered (prints the registration/expiry dates when present)
  other    → unknown (rate limit, unsupported TLD, network block)

Registries: .com/.net via rdap.verisign.com; everything else via the IANA bootstrap at
rdap.org (which redirects to the right registry). .kw / .com.kw have no public RDAP: they are
listed as "manual" — check at https://www.kw/ (CITRA registry).

Usage:
  python3 domain_check.py                       # names.txt, tlds com,co,shop,store,health
  python3 domain_check.py --tlds com,co --names names.txt --out out/domains.csv
  python3 domain_check.py --dry-run             # prints the domains it would check

Network: this host must be allowed to reach rdap.verisign.com and rdap.org (and the registry
hosts rdap.org redirects to, e.g. rdap.nic.shop, rdap.identitydigital.services, rdap.nic.co).
"""
import argparse, csv, json, os, sys, time, urllib.request, urllib.error

VERISIGN = {"com": "https://rdap.verisign.com/com/v1/domain/", "net": "https://rdap.verisign.com/net/v1/domain/"}
BOOTSTRAP = "https://rdap.org/domain/"
MANUAL = {"kw", "com.kw"}


def rdap(domain):
    tld = domain.split(".", 1)[1]
    if tld in MANUAL:
        return "manual", None
    url = (VERISIGN.get(tld) or BOOTSTRAP) + domain
    req = urllib.request.Request(url, headers={"Accept": "application/rdap+json", "User-Agent": "the12-domain-check/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            body = json.loads(r.read().decode() or "{}")
            events = {e.get("eventAction"): e.get("eventDate") for e in body.get("events", [])}
            return "registered", {"registered": events.get("registration"), "expires": events.get("expiration"),
                                  "status": ",".join(body.get("status", []))}
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return "available", None
        if e.code == 429:
            return "rate-limited", None
        return f"http-{e.code}", None
    except Exception as e:  # network block, timeout
        return f"error:{type(e).__name__}", None


def read_names(path):
    out = []
    for line in open(path, encoding="utf-8"):
        s = line.strip().lower()
        if s and not s.startswith("#"):
            out.append(s)
    return out


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser()
    ap.add_argument("--names", default=os.path.join(here, "names.txt"))
    ap.add_argument("--tlds", default="com,co,shop,store,health")
    ap.add_argument("--out", default=os.path.join(here, "out", "domains.csv"))
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--sleep", type=float, default=0.4)
    a = ap.parse_args()
    tlds = [t.strip() for t in a.tlds.split(",") if t.strip()]
    names = read_names(a.names)
    domains = []
    for n in names:
        if "." in n:
            domains.append(n)
        else:
            domains += [f"{n}.{t}" for t in tlds] + [f"{n}.com.kw"]
    print(f"{len(names)} names → {len(domains)} domains")
    if a.dry_run:
        print("\n".join(domains[:30]), "\n…" if len(domains) > 30 else "")
        return
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    rows = []
    for i, d in enumerate(domains, 1):
        status, info = rdap(d)
        rows.append({"domain": d, "status": status, **(info or {})})
        print(f"{i:4d}/{len(domains)}  {status:12s} {d}")
        if status == "rate-limited":
            time.sleep(5)
        time.sleep(a.sleep)
    with open(a.out, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["domain", "status", "registered", "expires", "status_rdap"])
        w.writeheader()
        for r in rows:
            w.writerow({"domain": r["domain"], "status": r["status"], "registered": r.get("registered"),
                        "expires": r.get("expires"), "status_rdap": r.get("status")})
    avail = [r["domain"] for r in rows if r["status"] == "available"]
    print(f"\n{len(avail)} available:\n" + "\n".join(avail))


if __name__ == "__main__":
    main()
