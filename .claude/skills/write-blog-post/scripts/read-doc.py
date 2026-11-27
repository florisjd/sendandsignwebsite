"""Print a draft document as Markdown so it can be analysed.

Usage:
    python -I read-doc.py <file> [--extract-images <dir>]

Supports .docx (no extra packages needed), .md, .txt and .pdf (needs pypdf).
Keeps headings, bold/italic, links, bullet/numbered lists and tables. Images
embedded in a .docx are shown as ![image](name) and, with --extract-images,
saved into <dir>.
"""
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def _read_xml(z, name):
    try:
        return ET.fromstring(z.read(name))
    except KeyError:
        return None


def _styles(z):
    """styleId -> lower-case style name (e.g. 'heading 2', 'title')."""
    out = {}
    root = _read_xml(z, "word/styles.xml")
    if root is None:
        return out
    for s in root.iter(f"{W}style"):
        name = s.find(f"{W}name")
        out[s.get(f"{W}styleId")] = (name.get(f"{W}val") if name is not None else "").lower()
    return out


def _numbering(z):
    """(numId, ilvl) -> 'bullet' | 'decimal' | ..."""
    root = _read_xml(z, "word/numbering.xml")
    if root is None:
        return {}
    abstract = {}
    for an in root.iter(f"{W}abstractNum"):
        lvls = {}
        for lvl in an.iter(f"{W}lvl"):
            fmt = lvl.find(f"{W}numFmt")
            lvls[lvl.get(f"{W}ilvl")] = fmt.get(f"{W}val") if fmt is not None else "bullet"
        abstract[an.get(f"{W}abstractNumId")] = lvls
    out = {}
    for num in root.iter(f"{W}num"):
        ref = num.find(f"{W}abstractNumId")
        if ref is None:
            continue
        for ilvl, fmt in abstract.get(ref.get(f"{W}val"), {}).items():
            out[(num.get(f"{W}numId"), ilvl)] = fmt
    return out


def _rels(z):
    root = _read_xml(z, "word/_rels/document.xml.rels")
    if root is None:
        return {}
    return {r.get("Id"): r.get("Target") for r in root.iter(f"{REL}Relationship")}


def _on(rpr, tag):
    if rpr is None:
        return False
    el = rpr.find(f"{W}{tag}")
    return el is not None and el.get(f"{W}val") not in ("0", "false")


class Docx:
    def __init__(self, path, image_dir=None):
        self.z = zipfile.ZipFile(path)
        self.styles = _styles(self.z)
        self.numbering = _numbering(self.z)
        self.rels = _rels(self.z)
        self.image_dir = Path(image_dir) if image_dir else None
        self.images = []

    def _image(self, blip):
        target = self.rels.get(blip.get(f"{R}embed"), "")
        name = Path(target).name
        if not name:
            return ""
        if self.image_dir:
            self.image_dir.mkdir(parents=True, exist_ok=True)
            (self.image_dir / name).write_bytes(self.z.read(f"word/{target}"))
        self.images.append(name)
        return f"![image]({name})"

    def _runs(self, parent):
        parts = []
        for el in parent:
            if el.tag == f"{W}r":
                rpr = el.find(f"{W}rPr")
                text = ""
                for c in el:
                    if c.tag == f"{W}t":
                        text += c.text or ""
                    elif c.tag == f"{W}tab":
                        text += " "
                    elif c.tag in (f"{W}br", f"{W}cr"):
                        text += " "
                    elif c.tag == f"{W}drawing":
                        for blip in c.iter(f"{A}blip"):
                            text += self._image(blip)
                if text.strip() and not text.startswith("!["):
                    b, i = _on(rpr, "b"), _on(rpr, "i")
                    core = text.strip()
                    lead = text[: len(text) - len(text.lstrip())]
                    trail = text[len(text.rstrip()):]
                    if b and i:
                        core = f"***{core}***"
                    elif b:
                        core = f"**{core}**"
                    elif i:
                        core = f"*{core}*"
                    text = lead + core + trail
                parts.append(text)
            elif el.tag == f"{W}hyperlink":
                label = self._runs(el)
                url = self.rels.get(el.get(f"{R}id"))
                if url:
                    parts.append(f"[{label}]({url})")
                elif el.get(f"{W}anchor"):
                    parts.append(label)
            elif el.tag in (f"{W}ins", f"{W}smartTag", f"{W}sdt", f"{W}sdtContent"):
                parts.append(self._runs(el))
        return "".join(parts).replace("****", "")

    def _paragraph(self, p):
        ppr = p.find(f"{W}pPr")
        style = ""
        prefix = ""
        if ppr is not None:
            ps = ppr.find(f"{W}pStyle")
            if ps is not None:
                style = self.styles.get(ps.get(f"{W}val"), ps.get(f"{W}val", "")).lower()
            num = ppr.find(f"{W}numPr")
            if num is not None and num.find(f"{W}numId") is not None:
                num_id = num.find(f"{W}numId").get(f"{W}val")
                ilvl_el = num.find(f"{W}ilvl")
                ilvl = ilvl_el.get(f"{W}val") if ilvl_el is not None else "0"
                fmt = self.numbering.get((num_id, ilvl), "bullet")
                indent = "  " * int(ilvl)
                prefix = f"{indent}{'1.' if fmt not in ('bullet', 'none') else '-'} "
        text = self._runs(p).strip()
        if not text:
            return ""
        if style == "title":
            return f"# {text}"
        if style.startswith("heading"):
            try:
                level = int(style.split()[-1])
            except ValueError:
                level = 2
            return f"{'#' * min(level + 1, 6)} {text.replace('**', '')}"
        if style in ("quote", "intense quote"):
            return f"> {text}"
        return prefix + text

    def _table(self, tbl):
        rows = []
        for tr in tbl.iter(f"{W}tr"):
            cells = []
            for tc in tr.findall(f"{W}tc"):
                cells.append(" ".join(self._runs(p).strip() for p in tc.iter(f"{W}p")).strip().replace("|", "/"))
            rows.append(cells)
        if not rows:
            return ""
        width = max(len(r) for r in rows)
        rows = [r + [""] * (width - len(r)) for r in rows]
        lines = ["| " + " | ".join(rows[0]) + " |", "| " + " | ".join(["---"] * width) + " |"]
        lines += ["| " + " | ".join(r) + " |" for r in rows[1:]]
        return "\n".join(lines)

    def to_markdown(self):
        body = _read_xml(self.z, "word/document.xml").find(f"{W}body")
        blocks = []
        prev_list = None  # "- " or "1. " while inside a list
        for el in body:
            if el.tag == f"{W}p":
                line = self._paragraph(el)
                if not line:
                    continue
                stripped = line.lstrip()
                kind = "- " if stripped.startswith("- ") else "1. " if stripped.startswith("1. ") else None
                if blocks and kind and kind == prev_list:
                    blocks[-1] += "\n" + line
                else:
                    blocks.append(line)
                prev_list = kind
            elif el.tag == f"{W}tbl":
                blocks.append(self._table(el))
                prev_list = None
        return "\n\n".join(b for b in blocks if b)


def main():
    args = sys.argv[1:]
    if not args:
        sys.exit(__doc__)
    path = Path(args[0])
    image_dir = args[args.index("--extract-images") + 1] if "--extract-images" in args else None
    ext = path.suffix.lower()
    sys.stdout.reconfigure(encoding="utf-8")
    if ext == ".docx":
        doc = Docx(path, image_dir)
        print(doc.to_markdown())
        if doc.images:
            print(f"\n<!-- {len(doc.images)} embedded image(s): {', '.join(doc.images)} -->")
    elif ext in (".md", ".markdown", ".txt"):
        print(path.read_text(encoding="utf-8", errors="replace"))
    elif ext == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError:
            sys.exit("pypdf is not installed: pip install pypdf")
        print("\n\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages))
    elif ext in (".doc", ".gdoc", ".odt", ".pages"):
        sys.exit(f"{ext} can't be read directly. Save or download it as .docx (File > Download > Microsoft Word) and try again.")
    else:
        sys.exit(f"Unsupported file type: {ext}")


if __name__ == "__main__":
    main()
