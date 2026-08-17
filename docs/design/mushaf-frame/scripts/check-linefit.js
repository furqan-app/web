const { chromium } = require('playwright');
const PORT = process.env.PORT || 7001;
const URL = `http://localhost:${PORT}/ar/pages/221`;
(async () => {
  const b = await chromium.launch();
  for (const w of [1500, 1280, 900]) {
    const p = await b.newPage({ viewport: { width: w, height: 940 }, deviceScaleFactor: 1 });
    await p.goto(URL, { waitUntil: 'domcontentloaded' });
    await p.evaluate(() => localStorage.setItem('theme', JSON.stringify('dark')));
    await p.goto(URL, { waitUntil: 'networkidle', timeout: 90000 });
    await p.waitForTimeout(3500);
    const m = await p.evaluate(() => [...document.querySelectorAll('.fq-quran-safha')]
      .slice(0, 2).map(q => {
        const rows = [...q.querySelectorAll('.fq-safha-row')];
        const qr = q.getBoundingClientRect();
        const card = q.closest('.fq-safha-card').getBoundingClientRect();
        return { rows: rows.length,
                 font: rows[0] && getComputedStyle(rows[0]).fontSize,
                 wrapped: rows.filter(r => r.getClientRects().length > 1).length,
                 over: rows.filter(r => r.scrollWidth > r.clientWidth + 1).length,
                 clipped: q.scrollHeight > q.clientHeight + 1,
                 textW: Math.round(qr.width), textH: Math.round(qr.height),
                 cardW: Math.round(card.width), cardH: Math.round(card.height) };
      }));
    console.log(w, JSON.stringify(m));
    await p.close();
  }
  await b.close();
})();
