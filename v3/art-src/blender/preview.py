# preview.py — composite a transparent render on the dark and light stage colours.
import sys
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGBA")
w, h = im.size
c = Image.new("RGB", (w * 2 + 20, h), (128, 128, 128))
for i, bg in enumerate([(10, 9, 14), (242, 242, 247)]):
    base = Image.new("RGBA", (w, h), bg + (255,))
    base.alpha_composite(im)
    c.paste(base.convert("RGB"), (i * (w + 20), 0))
c.save(out)
