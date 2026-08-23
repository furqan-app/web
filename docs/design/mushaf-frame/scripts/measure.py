"""Measure a converted frame SVG: ink bbox, band thickness, motif period.

Run from a directory containing frame2-raw.svg and ras.png (see README step 1).
Writes bands.json, which slice.py reads.

The two numbers that decide whether the art is usable:
  period / band   — should be 1.0-1.5. Below ~0.5 the motif reads as a bead run.
  LSQ residual    — should be < 0.1 units. Large means the art is not machine
                    drawn on an exact period, so mid-motif cuts will not seam.
"""

import json
import re

import numpy as np
from PIL import Image

RAW = "frame2-raw.svg"
RAS = "ras.png"

num = re.compile(r"-?\d+\.?\d*(?:[eE][-+]?\d+)?")


def bbox(d):
    v = [float(x) for x in num.findall(d)]
    xs, ys = v[0::2], v[1::2]
    return min(xs), min(ys), max(xs), max(ys)


# ---------------------------------------------------------------- raster pass
a = np.array(Image.open(RAS).convert("L"))
ink = a < 240
sx = 2000.0 / a.shape[1]  # svg units per raster px (viewBox is 0 0 2000 2000)

cols, rows = ink.any(0), ink.any(1)
x0, x1 = np.argmax(cols), len(cols) - 1 - np.argmax(cols[::-1])
y0, y1 = np.argmax(rows), len(rows) - 1 - np.argmax(rows[::-1])
W, H = x1 - x0, y1 - y0
print(f"ink bbox px {x0},{y0} -> {x1},{y1}  ({W} x {H})  scale {sx:.4f} u/px")

# band thickness: scan down from the top edge in the middle third, where the
# horizontal run is, until the first empty row.
mid = ink[:, x0 + W // 3 : x0 + 2 * W // 3]
rr = mid.any(1)
i = y0
while rr[i]:
    i += 1
band_y = (i - y0) / (1 / sx)

midv = ink[y0 + H // 3 : y0 + 2 * H // 3, :]
cc = midv.any(0)
j = x0
while cc[j]:
    j += 1
band_x = (j - x0) / (1 / sx)
print(f"band_x {band_x:.3f}u   band_y {band_y:.3f}u   "
      f"({band_y / (W * sx) * 100:.2f}% of frame width)")

# ------------------------------------------------------------- vector pass
src = open(RAW).read()
recs = []
for attrs, d in re.findall(r'<path\b([^>]*?)\bd="([^"]+)"\s*/?>', src):
    c = re.search(r'fill="(rgb\([^)]*\))"', attrs).group(1)
    recs.append((c, d, bbox(d)))

X0 = min(b[0] for _, _, b in recs)
Y0 = min(b[1] for _, _, b in recs)
X1 = max(b[2] for _, _, b in recs)
Y1 = max(b[3] for _, _, b in recs)
print(f"ink bbox svg {X0:.2f},{Y0:.2f} -> {X1:.2f},{Y1:.2f}")

# The period is read off ONE repeated shape rather than off the whole strip:
# pick the largest recurring motif (here the gold star) and fit a line through
# its centres. Least squares gives sub-hundredth precision and the residual is
# the seamlessness test.
from collections import Counter, defaultdict  # noqa: E402

sig = defaultdict(list)
for c, d, b in recs:
    sig[(c, round(b[2] - b[0], 2), round(b[3] - b[1], 2), len(num.findall(d)))].append(b)
key = max(sig, key=lambda k: k[1] * k[2] * min(len(sig[k]), 40))
motif_w, motif_h = key[1], key[2]
print(f"motif for period fit: {motif_w} x {motif_h}, {len(sig[key])} instances")


def fit(centres, label):
    c = np.sort(np.array(centres))
    i = np.arange(len(c))
    P, c0 = np.linalg.lstsq(np.vstack([i, np.ones(len(c))]).T, c, rcond=None)[0]
    resid = abs(c - (P * i + c0)).max()
    print(f"{label}: n={len(c)}  period {P:.5f}u  max resid {resid:.4f}u")
    return P, c0


top = [b for _, _, b in recs if b[3] < Y0 + band_y + 1 and abs((b[2] - b[0]) - motif_w) < 0.4]
left = [b for _, _, b in recs if b[2] < X0 + band_x + 1 and abs((b[3] - b[1]) - motif_h) < 0.4]
PX, GX = fit([(b[0] + b[2]) / 2 for b in top], "horizontal")
PY, GY = fit([(b[1] + b[3]) / 2 for b in left], "vertical  ")

print(f"\nperiod/band  h {PX / band_y:.4f}   v {PY / band_x:.4f}   (want 1.0-1.5)")

json.dump(
    {"band_x": band_x, "band_y": band_y, "PX": PX, "PY": PY, "GX": GX, "GY": GY},
    open("bands.json", "w"),
    indent=2,
)
print("wrote bands.json")
