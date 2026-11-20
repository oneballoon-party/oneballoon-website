"""One-time, strictly pixel-based tonal and clarity correction of the existing site cover.
No object insertion, deletion, crop, replacement, inpainting, or generative AI.
Only the selected cover photo is processed; all gallery photos remain unchanged.
"""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter
import re

source = Path("src/assets/uploads/20261120-hwaseong-school-stage-01.jpg")
target = Path("src/assets/uploads/20261120-hwaseong-school-stage-01-enhanced.jpg")
case = Path("src/cases/2026-11-20-hwaseong-elementary-arts-presentation-school-stage-balloon-decoration.md")

with Image.open(source) as loaded:
    original_size = loaded.size
    im = loaded.convert("RGB")

# Gently lift ambient darkness while preserving genuine stage and balloon colors.
gamma = 0.89
lut = [min(255, max(0, round(255 * ((i / 255.0) ** gamma)))) for i in range(256)]
im = im.point(lut * 3)

# Compensate slightly for warm indoor lighting. No object-specific recoloring.
r, g, b = im.split()
r = r.point([min(255, round(v * 0.994)) for v in range(256)])
g = g.point([min(255, round(v * 1.004)) for v in range(256)])
b = b.point([min(255, round(v * 1.018)) for v in range(256)])
im = Image.merge("RGB", (r, g, b))
im = ImageEnhance.Color(im).enhance(1.065)
im = ImageEnhance.Contrast(im).enhance(1.025)
# A modest edge sharpening pass, with a threshold to avoid sharpening flat areas.
im = im.filter(ImageFilter.UnsharpMask(radius=1.25, percent=115, threshold=3))

assert im.size == original_size, "Photo dimensions unexpectedly changed."
im.save(target, "JPEG", quality=94, subsampling=0, optimize=True)

text = case.read_text("utf-8")
old = '/assets/uploads/20261120-hwaseong-school-stage-01.jpg'
new = '/assets/uploads/20261120-hwaseong-school-stage-01-enhanced.jpg'
pattern = r'(?m)^(cover_image:\s*")' + re.escape(old) + r'(")$'
text, count = re.subn(pattern, lambda m: m.group(1) + new + m.group(2), text)
if count != 1:
    raise RuntimeError("The expected current cover_image entry was not found exactly once.")
case.write_text(text, encoding="utf-8")
print(f"Enhanced original cover in place for presentation: {original_size}; output={target}, changed the cover_image field only")
