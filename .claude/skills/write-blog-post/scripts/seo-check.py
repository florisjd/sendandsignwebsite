"""Check a blog post against the Send & Sign SEO standard (references/seo.md).

Usage (from the repository root):
    python -I .claude/skills/write-blog-post/scripts/seo-check.py content/blog/<slug>.md

Prints PASS / WARN / FAIL per check. Exits 1 if anything FAILs.
"""
import re
import sys
from pathlib import Path

STOP = set("a an and are as at be by for from how in is it its of on or the to vs what why with your you".split())
results = []


def add(level, msg):
    results.append((level, msg))


def front_matter(raw):
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?(.*)$", raw, re.S)
    if not m:
        return {}, raw
    data = {}
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if kv:
            v = kv.group(2).strip()
            if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                v = v[1:-1].replace('\\"', '"')
            data[kv.group(1)] = v
    return data, m.group(2)


def norm(text):
    text = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", text)
    text = re.sub(r"[*`>#|_]", " ", text.lower())
    return re.sub(r"[^a-z0-9\s-]", " ", text)


def stem(w):
    return w[:-1] if len(w) > 3 and w.endswith("s") else w


def kw_match(text, kw):
    """'exact' if the phrase appears, 'words' if all significant words appear, else None."""
    t = " " + re.sub(r"\s+", " ", norm(text)) + " "
    k = re.sub(r"\s+", " ", norm(kw)).strip()
    if not k:
        return None
    if f" {k} " in t:
        return "exact"
    # Same phrase once small words are ignored: "electronic signatures in australia"
    drop = lambda s: " " + " ".join(stem(w) for w in s.split() if w not in STOP) + " "
    if drop(k).strip() and drop(k) in drop(t):
        return "exact"
    words = {stem(w) for w in t.split()}
    sig = [stem(w) for w in k.split() if w not in STOP]
    return "words" if sig and all(w in words for w in sig) else None


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    path = Path(sys.argv[1])
    data, body = front_matter(path.read_text(encoding="utf-8"))
    slug = path.stem
    kw = data.get("focus_keyword", "")
    seo_title = data.get("seo_title") or f"{data.get('title', '')} | Send & Sign"
    desc = data.get("description", "")
    title = data.get("title", "")
    plain = norm(body)
    words = [w for w in plain.split() if re.search(r"[a-z0-9]", w)]
    wc = len(words)

    # --- keyword -----------------------------------------------------------
    if not kw:
        add("FAIL", "No focus_keyword in front matter: pick the phrase readers search for.")
    else:
        add("PASS", f"Focus keyword: \"{kw}\"")
        for label, text in (("Title (H1)", title), ("SEO title", seo_title), ("Meta description", desc)):
            m = kw_match(text, kw)
            miss = "WARN" if label == "Title (H1)" else "FAIL"  # the SEO title is what Google shows
            add("PASS" if m == "exact" else "WARN" if m else miss,
                f"{label} {'contains' if m == 'exact' else 'contains all words of' if m else 'is missing'} the focus keyword")
        seo_main = seo_title.split(" | ")[0]
        pos = norm(seo_main).find(norm(kw).split()[0]) if kw_match(seo_main, kw) else -1
        if 0 <= pos <= len(seo_main) / 2:
            add("PASS", "Focus keyword is in the first half of the SEO title")
        elif pos > 0:
            add("WARN", "Move the focus keyword nearer the start of the SEO title")
        slug_m = kw_match(slug.replace("-", " "), kw)
        add("PASS" if slug_m else "WARN", f"Slug '{slug}' {'reflects' if slug_m else 'does not include'} the focus keyword")
        first100 = " ".join(words[:100])
        m = kw_match(first100, kw)
        add("PASS" if m else "FAIL", f"Focus keyword {'appears' if m else 'is missing'} in the first 100 words")
        count = (" " + " ".join(words) + " ").count(" " + re.sub(r"\s+", " ", norm(kw)).strip() + " ")
        density = 100 * count * len(kw.split()) / max(wc, 1)
        if density > 3:
            add("WARN", f"Focus keyword density {density:.1f}% looks stuffed (aim under 2%)")

    # --- lengths -----------------------------------------------------------
    n = len(seo_title)
    add("PASS" if n <= 60 else "FAIL", f"SEO title length {n} (max 60)")
    n = len(desc)
    add("PASS" if 140 <= n <= 155 else "WARN" if 120 <= n <= 165 else "FAIL", f"Meta description length {n} (aim 140–155)")
    add("PASS" if data.get("excerpt") else "FAIL", "Excerpt present" if data.get("excerpt") else "Excerpt missing")
    add("PASS" if 900 <= wc <= 1800 else "WARN", f"Word count {wc} (most posts 900–1,800)")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", data.get("date", "")):
        add("FAIL", "date must be YYYY-MM-DD")

    # --- headings ------------------------------------------------------------
    heads = [(len(m.group(1)), m.group(2)) for m in re.finditer(r"^(#{1,6})\s+(.+)$", body, re.M)]
    if any(lvl == 1 for lvl, _ in heads):
        add("FAIL", "Body contains an H1 (# heading); the title is the only H1")
    h2 = [t for lvl, t in heads if lvl == 2]
    need = 4 if wc >= 1200 else 2
    add("PASS" if len(h2) >= need else "WARN", f"{len(h2)} H2 sections (want {need}+ for this length)")
    prev = 2
    for lvl, text in heads:
        if lvl > prev + 1:
            add("FAIL", f"Heading level skips from H{prev} to H{lvl}: \"{text[:50]}\"")
        prev = lvl
    if kw and h2:
        hit = any(kw_match(t, kw) for t in h2)
        sec = [t for t in h2 if {stem(w) for w in norm(kw).split() if w not in STOP} & {stem(w) for w in norm(t).split()}]
        add("PASS" if hit or sec else "WARN",
            "Keyword or its words appear in an H2" if hit or sec else "No H2 uses the focus keyword or its words")

    # --- paragraphs ------------------------------------------------------------
    long_paras = [p for p in re.split(r"\n\s*\n", body)
                  if p.strip() and not re.match(r"\s*([#>|!-]|\d+\.|```)", p) and len(p.split()) > 120]
    add("PASS" if not long_paras else "WARN", f"{len(long_paras)} paragraph(s) over 120 words")

    # --- links ---------------------------------------------------------------
    links = re.findall(r"(?<!!)\[([^\]]+)\]\(([^)\s]+)", body)
    internal = [(t, u) for t, u in links if u.startswith("/") and not u.startswith("/assets/")]
    external = [(t, u) for t, u in links if u.startswith("http")]
    add("PASS" if len(internal) >= 3 else "FAIL", f"{len(internal)} internal link(s) (want 3+)")
    add("PASS" if 1 <= len(external) <= 3 else "WARN", f"{len(external)} external link(s) (want 1–3 primary sources)")
    vague = [t for t, _ in links if t.strip().lower() in {"here", "click here", "this", "read more", "link", "this article"}]
    if vague:
        add("WARN", f"Vague anchor text: {', '.join(vague)}")

    # --- images ----------------------------------------------------------------
    placeholder = re.compile(r"to (be )?(written|finali[sz]e)|^describe the image$|^image$", re.I)
    cover_alt = data.get("cover_alt", "")
    if data.get("cover_image"):
        add("PASS" if cover_alt and not placeholder.search(cover_alt) else "FAIL",
            "Cover alt text written" if cover_alt and not placeholder.search(cover_alt) else "Cover alt text missing or still a placeholder")
    else:
        add("WARN", "No cover_image (cards show a placeholder; social shares use the default image)")
    imgs = re.findall(r"!\[([^\]]*)\]\(([^)\s]+)", body)
    for alt, url in [("", data.get("cover_image", ""))] + imgs if data.get("cover_image") else imgs:
        if url.startswith("/assets/"):
            f = Path(url.lstrip("/"))
            if not f.exists():
                add("FAIL", f"Image file not found: {url}")
            elif f.stat().st_size > 300 * 1024:
                add("WARN", f"{url} is {f.stat().st_size // 1024} KB (keep under ~300 KB)")
    bad_alt = [u for a, u in imgs if not a.strip() or placeholder.search(a)]
    add("PASS" if not bad_alt else "FAIL", f"{len(imgs)} figure(s); {len(bad_alt)} missing real alt text")

    # --- tags, legal -------------------------------------------------------------
    tags = [t.strip() for t in data.get("tags", "").split(",") if t.strip()]
    add("PASS" if 3 <= len(tags) <= 8 else "WARN", f"{len(tags)} tag(s) (want 3–8)")
    if data.get("category", "").lower() == "australian compliance" and not data.get("legal_notice"):
        add("WARN", "Legal topic without legal_notice")

    # --- duplicates across posts ----------------------------------------------------
    for other in Path("content/blog").glob("*.md"):
        if other.resolve() == path.resolve():
            continue
        o, _ = front_matter(other.read_text(encoding="utf-8"))
        for key in ("seo_title", "description", "focus_keyword"):
            if data.get(key) and o.get(key) and data[key].strip().lower() == o[key].strip().lower():
                add("FAIL", f"Same {key} as {other.name} (keyword cannibalisation / duplicate)")

    order = {"FAIL": 0, "WARN": 1, "PASS": 2}
    for level, msg in sorted(results, key=lambda r: order[r[0]]):
        print(f"{level:4}  {msg}")
    fails = sum(1 for l, _ in results if l == "FAIL")
    warns = sum(1 for l, _ in results if l == "WARN")
    print(f"\n{fails} fail, {warns} warn, {len(results) - fails - warns} pass")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
