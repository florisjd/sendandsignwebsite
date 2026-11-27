"""Find internal-link opportunities in a blog post (read-only).

Usage (from the repository root):
    python -I .claude/skills/write-blog-post/scripts/link-suggest.py content/blog/<slug>.md

For every target page or post, reports one status:
  LINKED   the post already links to it
  FOUND    a STRONG phrase matches a sentence: link that sentence
  WEAK     only a generic word matches: review it, don't link automatically
  NONE     nothing matches: write a short sentence that leads to it

Targets: the site pages below, plus every other published post (its focus
keyword is strong; its tags are weak). Extend TARGETS when a page is added.
Nothing is edited here; the skill makes the change.
"""
import re
import sys
from pathlib import Path

# url -> (label, strong phrases, weak phrases)
# STRONG: specific to the page's topic. WEAK: generic words, review only.
TARGETS = {
    "/compliance-eta": ("ETA 1999 compliance guide", ["Electronic Transactions Act", "ETA 1999", "section 10"], ["compliance"]),
    "/compliance-us": ("US ESIGN and UETA compliance", ["ESIGN", "UETA"], ["United States", "US law"]),
    "/compliance": ("compliance overview", ["compliance overview"], ["compliance", "legal requirements"]),
    "/security": ("security and architecture", ["audit trail", "audit certificate", "SHA-256", "fingerprint", "tamper"], ["security"]),
    "/pricing": ("pricing and plans", ["flat-rate", "flat rate", "per month", "unmetered"], ["pricing", "plans", "licence cost", "license cost"]),
    "/install": ("install guide", ["install guide", "app registration"], ["setup", "set up", "deployment"]),
    "/compare": ("comparison with other tools", ["DocuSign", "Adobe Sign", "FuseSign", "Annature"], ["compare", "alternatives", "third-party e-signature"]),
    "/features": ("features", ["Microsoft 365 features"], ["features", "dashboard"]),
    "/features#multi-sign": ("multi-signature routing", ["multi-signature", "multi-sign", "multiple signers"], ["routing", "approval chain"]),
    "/onthego": ("on the go (mobile)", ["on the go", "iPhone", "Android"], ["mobile", "phone", "tablet"]),
    "/contact": ("book a demo", ["book a demo", "20-minute demo"], ["demo", "pilot"]),
}

# Tags too broad to be a useful link target on their own
GENERIC_TAGS = {"microsoft 365", "sharepoint", "microsoft teams", "deeds", "audit trails"}


def front_matter(raw):
    m = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?(.*)$", raw, re.S)
    data, body = {}, raw
    if m:
        body = m.group(2)
        for line in m.group(1).splitlines():
            kv = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
            if kv:
                v = kv.group(2).strip()
                if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"'":
                    v = v[1:-1]
                data[kv.group(1)] = v
    return data, body


def post_targets(this_slug):
    """Other published posts: url -> (title, strong, weak)."""
    out = {}
    for f in sorted(Path("content/blog").glob("*.md")):
        if f.stem == this_slug:
            continue
        d, _ = front_matter(f.read_text(encoding="utf-8"))
        if d.get("published", "true").lower() == "false":
            continue
        strong = [d["focus_keyword"]] if d.get("focus_keyword") else []
        weak = [t.strip() for t in d.get("tags", "").split(",")
                if t.strip() and t.strip().lower() not in GENERIC_TAGS]
        out[f"/blog/{f.stem}"] = (d.get("title", f.stem), strong, weak)
    return out


def prose_sentences(body):
    """Yield (line_no, sentence) for prose, skipping headings, code, tables and images."""
    in_code = False
    for n, line in enumerate(body.splitlines(), 1):
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if in_code or line.lstrip().startswith(("#", "!", "|")):
            continue
        for sent in re.split(r"(?<=[.!?])\s+", line):
            if sent.strip():
                yield n, sent


def find_phrase(sentences, phrases):
    """First (phrase, line, sentence) where a phrase appears outside an existing link."""
    for phrase in phrases:
        pat = re.compile(r"(?<![\w-])" + re.escape(phrase) + r"(?![\w-])", re.I)
        for n, sent in sentences:
            if pat.search(sent) and not re.search(r"\[[^\]]*" + re.escape(phrase), sent, re.I):
                shown = pat.sub(lambda m: f"**{m.group(0)}**", sent).strip()
                return phrase, n, shown
    return None


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    path = Path(sys.argv[1])
    _, body = front_matter(path.read_text(encoding="utf-8"))
    slug = path.stem
    sentences = list(prose_sentences(body))
    links = re.findall(r"\]\((/[^)\s]*)\)", body)
    linked_paths = {u.split("#")[0] for u in links}

    targets = dict(TARGETS)
    targets.update(post_targets(slug))

    counts = {"LINKED": 0, "FOUND": 0, "WEAK": 0, "NONE": 0}
    print(f"Internal link opportunities for {slug}\n")
    for url, (label, strong, weak) in sorted(targets.items()):
        base = url.split("#")[0]
        if base in linked_paths:
            status, detail = "LINKED", "already linked"
        else:
            hit = find_phrase(sentences, strong)
            if hit:
                phrase, n, shown = hit
                status, detail = "FOUND", f"line {n} on \"{phrase}\": {shown}"
            else:
                weak_hit = find_phrase(sentences, weak)
                if weak_hit:
                    phrase, n, shown = weak_hit
                    status, detail = "WEAK", f"line {n} on \"{phrase}\" (review): {shown}"
                else:
                    status, detail = "NONE", "nothing matches; write a sentence that leads to it (seo.md §5)"
        counts[status] += 1
        print(f"{status:6}  {url:24} {label}\n        {detail}")

    print(f"\n{counts['FOUND']} to link now, {counts['WEAK']} to review, "
          f"{counts['NONE']} to write in, {counts['LINKED']} already linked.")
    print("Link FOUND sentences with descriptive anchor text: one link per target, about 3 to 6 in total.")


if __name__ == "__main__":
    main()
