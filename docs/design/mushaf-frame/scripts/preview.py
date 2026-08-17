import json, base64, os

t = json.load(open("tiles.json"))
RATIO = t["C"] / t["BY"]           # corner side / band thickness

def data(p):
    return "data:image/svg+xml;base64," + base64.b64encode(open(p, "rb").read()).decode()

def frame(v, band, w, h, label):
    c = band * RATIO
    d = f"out-{v}"
    cn, eh, ev = data(f"{d}/tile-corner.svg"), data(f"{d}/tile-edge-h.svg"), data(f"{d}/tile-edge-v.svg")
    def m(u, rep, size):
        return (f"background-color:var(--ink);-webkit-mask-image:url({u});mask-image:url({u});"
                f"-webkit-mask-repeat:{rep};mask-repeat:{rep};"
                f"-webkit-mask-size:{size};mask-size:{size};position:absolute;")
    C = m(cn, "no-repeat", "100% 100%")
    H = m(eh, "repeat-x", "auto 100%")
    V = m(ev, "repeat-y", "100% auto")
    cb = f"width:{c}px;height:{c}px;"
    return f"""
<div class="cell"><div class="lab">{label} &middot; band {band}px &middot; corner {c:.0f}px</div>
<div class="frame" style="width:{w}px;height:{h}px">
  <div style="{C}{cb}top:0;left:0"></div>
  <div style="{C}{cb}top:0;right:0;transform:scaleX(-1)"></div>
  <div style="{C}{cb}bottom:0;left:0;transform:scaleY(-1)"></div>
  <div style="{C}{cb}bottom:0;right:0;transform:scale(-1,-1)"></div>
  <div style="{H}top:0;left:{c}px;right:{c}px;height:{band}px"></div>
  <div style="{H}bottom:0;left:{c}px;right:{c}px;height:{band}px;transform:scaleY(-1)"></div>
  <div style="{V}left:0;top:{c}px;bottom:{c}px;width:{band}px"></div>
  <div style="{V}right:0;top:{c}px;bottom:{c}px;width:{band}px;transform:scaleX(-1)"></div>
  <div class="txt">مثال نص المصحف<br>خمسة عشر سطرًا</div>
</div></div>"""

cells = ""
for v in ("solid", "engraved", "chain"):
    cells += frame(v, 22, 486, 700, v)
for band in (14, 18, 26):
    cells += frame("engraved", band, 486, 700, f"engraved {band}")

html = f"""<!doctype html><meta charset=utf-8><style>
body{{margin:0;background:#070f17;color:#e8dcc0;font:13px system-ui;padding:24px}}
.wrap{{display:flex;flex-wrap:wrap;gap:28px}}
.cell{{}} .lab{{margin-bottom:8px;opacity:.75}}
.frame{{position:relative;--ink:#c9a227}}
.txt{{position:absolute;inset:60px;display:flex;align-items:center;justify-content:center;
      text-align:center;font-size:20px;color:#8fa3b4;line-height:2}}
</style><div class=wrap>{cells}</div>"""
open("test.html", "w").write(html)
print("wrote test.html; corner/band ratio =", round(RATIO, 4))
