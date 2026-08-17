const { chromium } = require('playwright');
const PORT = process.env.PORT || 7001;
const URL = `http://localhost:${PORT}/ar/pages/221`;
const V = [
  ['A', 16, 18, 32],
  ['B', 14, 16, 38],
  ['C', 18, 16, 30],
  ['D', 12, 14, 42],
];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1500, height: 940 }, deviceScaleFactor: 2 });
  await p.goto(URL, { waitUntil: 'domcontentloaded' });
  await p.evaluate(() => localStorage.setItem('theme', JSON.stringify('dark')));
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
  await p.waitForTimeout(4000);
  for (const [n, band, clr, mar] of V) {
    await p.evaluate(([band, clr, mar]) => {
      document.querySelectorAll('.fq-safha-card').forEach(c => {
        c.style.setProperty('--fq-frame-band', band + 'px');
        c.style.setProperty('--fq-frame-clearance', clr + 'px');
        c.style.setProperty('--fq-frame-margin', mar + 'px');
      });
    }, [band, clr, mar]);
    await p.waitForTimeout(1200);
    await p.locator('.fq-spread').first().screenshot({ path: `v-${n}.png` });
    const m = await p.evaluate(() => {
      const c = document.querySelector('.fq-safha-card');
      const q = document.querySelector('.fq-quran-safha').getBoundingClientRect();
      const rows = [...document.querySelectorAll('.fq-safha-row')];
      const wrapped = rows.filter(r => r.getClientRects().length > 1).length;
      const over = rows.filter(r => r.scrollWidth > r.clientWidth + 1).length;
      return { textW: Math.round(q.width), cardW: Math.round(c.getBoundingClientRect().width),
               rows: rows.length, wrapped, over,
               font: getComputedStyle(rows[0]).fontSize };
    });
    console.log(n, band, clr, mar, JSON.stringify(m));
  }
  await b.close();
})();
