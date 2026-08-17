import os
import re
import sys
import json

SRC = "frame2-raw.svg"
TEAL  = "rgb(0%, 36.508179%, 30.995178%)"
PALE  = "rgb(89.532471%, 85.601807%, 49.632263%)"
GOLD  = "rgb(88.719177%, 67.938232%, 6.680298%)"
OLIVE = "rgb(53.529358%, 48.042297%, 16.958618%)"

num = re.compile(r'-?\d+\.?\d*(?:[eE][-+]?\d+)?')

def load():
    src = open(SRC).read()
    out = []
    for attrs, d in re.findall(r'<path\b([^>]*?)\bd="([^"]+)"\s*/?>', src):
        c = re.search(r'fill="(rgb\([^)]*\))"', attrs).group(1)
        v = [float(x) for x in num.findall(d)]
        xs, ys = v[0::2], v[1::2]
        out.append((c, d, (min(xs), min(ys), max(xs), max(ys))))
    return out

def round_d(d, nd=2):
    return num.sub(lambda m: f"{float(m.group()):.{nd}f}".rstrip("0").rstrip("."), d)

def shift(d, dx, dy, nd=2):
    """translate a path's numbers (pdftocairo emits absolute M/C/L only)."""
    i = 0
    def rep(m):
        nonlocal i
        v = float(m.group()) - (dx if i % 2 == 0 else dy)
        i += 1
        return f"{v:.{nd}f}".rstrip("0").rstrip(".")
    return num.sub(rep, d)

def svg(w, h, groups):
    """groups: list of (paths, punch_paths) rendered in order."""
    body = []
    for k, (keep, punch) in enumerate(groups):
        if punch:
            body.append(f'<mask id="m{k}" maskUnits="userSpaceOnUse" x="0" y="0" width="{w:.3f}" height="{h:.3f}">')
            body.append(f'<rect width="{w:.3f}" height="{h:.3f}" fill="#fff"/>')
            body += [f'<path d="{d}"/>' for d in punch]
            body.append('</mask>')
            body.append(f'<g mask="url(#m{k})" fill="#000">')
        else:
            body.append('<g fill="#000">')
        body += [f'<path fill-rule="nonzero" d="{d}"/>' for d in keep]
        body.append('</g>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.3f} {h:.3f}" '
            f'width="{w:.3f}" height="{h:.3f}">' + "".join(body) + "</svg>")

def tile(recs, x, y, w, h, variant, pad=90.0):
    """all paths intersecting the rect, translated; viewBox does the clipping."""
    sel = [(c, d) for c, d, b in recs
           if b[2] > x - pad and b[0] < x + w + pad and b[3] > y - pad and b[1] < y + h + pad]
    tr = [(c, shift(d, x, y)) for c, d in sel]
    if variant == "chain":
        return svg(w, h, [([d for c, d in tr if c == TEAL], [])])
    if variant == "solid":
        return svg(w, h, [([d for c, d in tr if c in (TEAL, GOLD, PALE, OLIVE)], [])])
    if variant == "engraved":
        base  = [d for c, d in tr if c in (TEAL, GOLD)]
        punch = [d for c, d in tr if c == OLIVE]
        top   = [d for c, d in tr if c == PALE]
        return svg(w, h, [(base, punch), (top, [])])
    raise SystemExit("bad variant")

recs = load()
X0 = min(b[0] for _, _, b in recs); Y0 = min(b[1] for _, _, b in recs)
X1 = max(b[2] for _, _, b in recs); Y1 = max(b[3] for _, _, b in recs)

geom = json.load(open("bands.json"))   # written by measure.py
PX = geom["PX"]        # horizontal period (LSQ)
PY = geom["PY"]        # vertical period  (LSQ)
GX = geom["GX"]        # first top-band motif centre x
GY = geom["GY"]        # first left-band motif centre y
BX = geom["band_x"]    # left/right band thickness
BY = geom["band_y"]    # top/bottom band thickness

# Cut midway between motifs. With an exact period the cut position is not
# load-bearing (both halves rejoin across every repeat), but the thinnest
# crossing is the most forgiving of sub-pixel rounding in the browser.
cut_x = GX + PX / 2
cut_y = GY + PY / 2
# corner: from ink origin out to the 2nd cut on each axis  (~2 periods)
CW = cut_x + PX - X0
CH = cut_y + PY - Y0
C  = max(CW, CH)       # square corner box; 0.5% anisotropy absorbed

variant = sys.argv[1] if len(sys.argv) > 1 else "engraved"
out = {}
out["tile-corner.svg"] = tile(recs, X0, Y0, C, C, variant)
out["tile-edge-h.svg"] = tile(recs, cut_x + PX, Y0, PX, BY, variant)
out["tile-edge-v.svg"] = tile(recs, X0, cut_y + PY, BX, PY, variant)

d = f"out-{variant}"
os.makedirs(d, exist_ok=True)
for k, v in out.items():
    open(f"{d}/{k}", "w").write(v)
    print(f"{k:18} {len(v):>7} B   {os.popen(f'gzip -c {d}/{k} | wc -c').read().strip():>6} B gz")
print(f"corner {C:.2f}u  band_x {BX:.2f}  band_y {BY:.2f}  Px {PX:.3f}  Py {PY:.3f}")
print(f"corner/band = {C/BY:.4f}")
json.dump({"C": C, "BX": BX, "BY": BY, "PX": PX, "PY": PY}, open("tiles.json", "w"))
