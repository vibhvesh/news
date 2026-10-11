# Chitrakoot–Prayagraj News · चित्रकूट–प्रयागराज समाचार

A static, mobile-friendly local news portal (plain HTML/CSS/JS, no build step). Runs on GitHub Pages.

- `index.html` – page shell; `app.js` fetches `stories.json` and renders everything (newest first).
- Category tabs: All, Khandeha, Chitrakoot, Prayagraj, Highway/Toll, Women Safety. A story appears under a tab if its `category` **or** optional `region` matches (e.g. a Chitrakoot road accident shows under both Highway/Toll and Chitrakoot).
- Breaking ticker = latest 5 stories. Search filters title/summary/category/source.
- Deep links: `#cat/Prayagraj`, `#story/<id>` (opens detail modal).
- A `<noscript>` static list is regenerated in `index.html` by `add_stories.py`.

## Story format
```json
{"id": "optional-auto", "title": "...", "date": "YYYY-MM-DD", "category": "Prayagraj",
 "region": "Prayagraj (optional)", "summary": "2-3 sentences", "source_name": "Dainik Bhaskar",
 "source_url": "https://..."}
```

## Adding stories
```bash
python3 add_stories.py new.json             # merge (dedupe by source_url), sort by date desc, set meta.last_updated (IST)
python3 add_stories.py new.json --dry-run   # preview only
python3 add_stories.py new.json --update    # overwrite existing stories with same source_url
python3 add_stories.py --touch              # only refresh "Last updated"
```
`new.json` can be a list of stories or `{"stories": [...]}`. `id` is auto-generated when missing.

## Local preview
```bash
python3 -m http.server 8000   # then open http://localhost:8000
```
(Opening `index.html` directly via file:// won't work because browsers block fetch() there.)

## Deploy to GitHub Pages
Push this folder to a repo → Settings → Pages → deploy from branch `main`, root folder.
