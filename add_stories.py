#!/usr/bin/env python3
"""Merge new stories into stories.json.

Usage:
    python3 add_stories.py new_stories.json            # merge
    python3 add_stories.py new_stories.json --update   # also overwrite existing entries with same source_url
    python3 add_stories.py new_stories.json --dry-run  # show what would change, write nothing
    python3 add_stories.py --touch                     # just refresh meta.last_updated

Input file may be a JSON list of stories or an object {"stories": [...]}.
Required fields per story: title, date (YYYY-MM-DD), category, summary, source_name, source_url.
Optional: id (auto-generated if missing), region.
Also regenerates the <noscript> static fallback list in index.html.
Dedupe key: source_url (normalized: scheme/host lowercased, trailing slash and #fragment removed).
"""
import argparse, json, os, re, sys, tempfile
from datetime import datetime, timedelta, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
STORIES = os.path.join(HERE, "stories.json")
IST = timezone(timedelta(hours=5, minutes=30))
REQUIRED = ["title", "date", "category", "summary", "source_name", "source_url"]
CATEGORIES = {"Khandeha", "Chitrakoot", "Prayagraj", "Highway/Toll", "Women Safety"}


def norm_url(u):
    u = u.strip().split("#", 1)[0]
    m = re.match(r"^(https?)://([^/]+)(.*)$", u, re.I)
    if m:
        u = f"{m.group(1).lower()}://{m.group(2).lower()}{m.group(3)}"
    return u.rstrip("/")


def slug(s, maxlen=60):
    s = re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")
    if len(s) > maxlen:
        s = s[:maxlen].rsplit("-", 1)[0]
    return s or "story"


def load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def validate(s, i):
    missing = [k for k in REQUIRED if not str(s.get(k, "")).strip()]
    if missing:
        raise ValueError(f"story #{i} missing fields: {', '.join(missing)}")
    try:
        datetime.strptime(s["date"], "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"story #{i} has bad date {s['date']!r} (need YYYY-MM-DD)")
    if s["category"] not in CATEGORIES:
        print(f"warning: story #{i} category {s['category']!r} is not a known tab {sorted(CATEGORIES)}", file=sys.stderr)


INDEX = os.path.join(HERE, "index.html")
START, END = "<!-- STATIC-FALLBACK:START -->", "<!-- STATIC-FALLBACK:END -->"


def write_fallback(stories, meta):
    """Regenerate the <noscript> story list inside index.html (between the markers)."""
    if not os.path.exists(INDEX):
        return
    from html import escape as e
    html = open(INDEX, encoding="utf-8").read()
    if START not in html or END not in html:
        print("warning: fallback markers not found in index.html; skipped", file=sys.stderr)
        return
    items = "\n".join(
        f'      <li><strong>{e(s["title"])}</strong> ({e(s["date"])}, {e(s["category"])}) – {e(s["summary"])} '
        f'<a href="{e(s["source_url"])}" rel="noopener noreferrer">Read source: {e(s["source_name"])}</a></li>'
        for s in stories)
    block = (f"{START}\n  <noscript><div class=\"fallback\">\n    <p>JavaScript is off – static list "
             f"(last updated {e(meta['last_updated_display'])}):</p>\n    <ol>\n{items}\n    </ol>\n  </div></noscript>\n  {END}")
    a, b = html.index(START), html.index(END) + len(END)
    with open(INDEX, "w", encoding="utf-8") as f:
        f.write(html[:a] + block + html[b:])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("input", nargs="?", help="JSON file with new stories")
    ap.add_argument("--update", action="store_true", help="overwrite existing stories that share a source_url")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--touch", action="store_true", help="only update meta.last_updated")
    a = ap.parse_args()
    if not a.input and not a.touch:
        ap.error("give an input file or --touch")

    data = load(STORIES) if os.path.exists(STORIES) else {"meta": {}, "stories": []}
    stories = data.get("stories", [])
    index = {norm_url(s["source_url"]): i for i, s in enumerate(stories)}
    ids = {s.get("id") for s in stories}

    added = updated = skipped = 0
    if a.input:
        new = load(a.input)
        new = new.get("stories", []) if isinstance(new, dict) else new
        for i, s in enumerate(new, 1):
            validate(s, i)
            s = {k: (v.strip() if isinstance(v, str) else v) for k, v in s.items()}
            key = norm_url(s["source_url"])
            if key in index:
                if a.update:
                    old = stories[index[key]]
                    s.setdefault("id", old.get("id"))
                    stories[index[key]] = s
                    updated += 1
                    print(f"updated: {s['title']}")
                else:
                    skipped += 1
                    print(f"skip (duplicate): {s['title']}")
                continue
            if not s.get("id") or s["id"] in ids:
                base = f"{s['date']}-{slug(s['title'])}"
                sid, n = base, 2
                while sid in ids:
                    sid, n = f"{base}-{n}", n + 1
                s["id"] = sid
            ids.add(s["id"])
            index[key] = len(stories)
            stories.append(s)
            added += 1
            print(f"added: {s['title']}")

    stories.sort(key=lambda s: (s["date"], s.get("id", "")), reverse=True)
    now = datetime.now(IST)
    meta = data.get("meta", {})
    meta.update({
        "site": "Chitrakoot–Prayagraj News",
        "last_updated": now.isoformat(timespec="seconds"),
        "last_updated_display": now.strftime("%d %b %Y, %I:%M %p IST"),
        "count": len(stories),
    })
    out = {"meta": meta, "stories": stories}
    print(f"\n{added} added, {updated} updated, {skipped} duplicates skipped, {len(stories)} total.")
    if a.dry_run:
        print("dry run: stories.json not written")
        return
    fd, tmp = tempfile.mkstemp(dir=HERE, suffix=".json")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    os.replace(tmp, STORIES)
    write_fallback(stories, meta)
    print(f"wrote {STORIES} (last_updated {meta['last_updated_display']})")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, json.JSONDecodeError, FileNotFoundError) as e:
        sys.exit(f"error: {e}")
