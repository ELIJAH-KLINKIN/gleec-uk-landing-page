# finish.py — turn a transparent Blender render into a web image: feather the
# shadow towards the frame edges (so it never ends in a hard line), crop to the
# content with a margin, and resize.   python3 finish.py in.png out.png [width]
import sys
from PIL import Image, ImageChops

src, out = sys.argv[1], sys.argv[2]
width = int(sys.argv[3]) if len(sys.argv) > 3 else 1600
im = Image.open(src).convert("RGBA")
w, h = im.size
r, g, b, a = im.split()


def ramp(n, feather):
    """0 at the edge, 1 after `feather` pixels, smoothstep in between."""
    vals = []
    for i in range(n):
        d = min(i, n - 1 - i) / feather
        d = max(0.0, min(1.0, d))
        vals.append(d * d * (3 - 2 * d))
    return vals


fx, fy = ramp(w, w * 0.14), ramp(h, h * 0.16)
col = Image.new("L", (1, h))
col.putdata([int(255 * v) for v in fy])
row = Image.new("L", (w, 1))
row.putdata([int(255 * v) for v in fx])
mask = ImageChops.multiply(col.resize((w, h)), row.resize((w, h)))
a = ImageChops.multiply(a, mask)
im = Image.merge("RGBA", (r, g, b, a))
bbox = a.point(lambda x: 255 if x > 3 else 0).getbbox()
x0, y0, x1, y1 = bbox
m = int(0.03 * w)
im = im.crop((max(0, x0 - m), max(0, y0 - m), min(w, x1 + m), min(h, y1 + m)))
im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
im.save(out)
print(out, im.size)
