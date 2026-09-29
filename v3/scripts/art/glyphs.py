# glyphs.py — outlines of £ € $ from the site's own Inter (OFL), bold, as path
# data in font units (y up), for the 3D renders. Run: python3 scripts/art/glyphs.py
import json, pathlib
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

root = pathlib.Path(__file__).resolve().parents[2]
font = TTFont(root / "src/assets/fonts/inter-latin.woff2")
if "fvar" in font:
    font = instancer.instantiateVariableFont(font, {"wght": 700, **({"opsz": 32} if any(a.axisTag == "opsz" for a in font["fvar"].axes) else {})})
cmap = font.getBestCmap()
gs = font.getGlyphSet()
out = {"unitsPerEm": font["head"].unitsPerEm, "glyphs": {}}
for ch in "£€$":
    name = cmap[ord(ch)]
    pen = SVGPathPen(gs)
    gs[name].draw(pen)
    b = BoundsPen(gs)
    gs[name].draw(b)
    out["glyphs"][ch] = {"d": pen.getCommands(), "bounds": b.bounds}
(root / "scripts/art/glyphs.json").write_text(json.dumps(out))
print({k: v["bounds"] for k, v in out["glyphs"].items()}, out["unitsPerEm"])
