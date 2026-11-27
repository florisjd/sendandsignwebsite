"""Prepare blog images (cover set or in-article figure). Run from the repository root.

Cover (16:9 centre crop, 1920 + 960 versions):
    python -I .claude/skills/write-blog-post/scripts/make-cover.py <image> <slug>
    -> assets/blog/<slug>-1920.jpg/.webp and assets/blog/<slug>-960.jpg/.webp

In-article figure (keeps its aspect ratio, max 1600px wide):
    python -I .claude/skills/write-blog-post/scripts/make-cover.py <image> <slug> --figure <name>
    -> assets/blog/<slug>-<name>.jpg/.webp

The live site serves the .webp automatically to browsers that support it, so
Markdown should reference the .jpg path.
"""
import sys
from pathlib import Path

from PIL import Image, ImageOps

TARGET_RATIO = 16 / 9
OUT_DIR = Path("assets/blog")


def save_pair(img, stem):
    jpg, webp = OUT_DIR / f"{stem}.jpg", OUT_DIR / f"{stem}.webp"
    img.save(jpg, "JPEG", quality=84, optimize=True, progressive=True)
    img.save(webp, "WEBP", quality=82, method=6)
    print(f"wrote {jpg} ({jpg.stat().st_size // 1024} KB) and {webp} ({webp.stat().st_size // 1024} KB)")
    return jpg


def make_cover(img, slug):
    w, h = img.size
    if w / h > TARGET_RATIO:  # too wide: trim the sides
        new_w = round(h * TARGET_RATIO)
        left = (w - new_w) // 2
        img = img.crop((left, 0, left + new_w, h))
    else:  # too tall: trim top and bottom
        new_h = round(w / TARGET_RATIO)
        top = (h - new_h) // 2
        img = img.crop((0, top, w, top + new_h))
    if img.width < 1920:
        print(f"warning: source is {img.width}px wide after cropping; the 1920 version is upscaled")
    for width in (1920, 960):
        save_pair(img.resize((width, round(width / TARGET_RATIO)), Image.LANCZOS), f"{slug}-{width}")
    print(f'\ncover_image: "/assets/blog/{slug}-1920.jpg"')


def make_figure(img, slug, name):
    if img.width > 1600:
        img = img.resize((1600, round(img.height * 1600 / img.width)), Image.LANCZOS)
    save_pair(img, f"{slug}-{name}")
    print(f'\n![Describe the image](/assets/blog/{slug}-{name}.jpg "Optional caption")')


def main():
    args = sys.argv[1:]
    if len(args) not in (2, 4) or (len(args) == 4 and args[2] != "--figure"):
        sys.exit(__doc__)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = ImageOps.exif_transpose(Image.open(args[0])).convert("RGB")
    if len(args) == 4:
        make_figure(img, args[1], args[3])
    else:
        make_cover(img, args[1])


if __name__ == "__main__":
    main()
