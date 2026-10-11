// v7 probe: screenshots of the new levels from the spawn and along the route, plus the boss paper storm
// usage: node v7.js [levelIndexes] — default 13,14,15 (party, home, rain) and 7 (boss at phase 4)
const { chromium } = require('playwright');
const which = (process.argv[2] || '13,14,15,7').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  for (const li of which) {
    const id = await p.evaluate(async (li) => {
      const { Game, LEVELS } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      Game.story(li, true); await fr(2); Game.begin();
      const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 90000) await fr(1);
      return LEVELS[li].id;
    }, li);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `v7_${id}_0.png` });
    // fly to a few points along the route (skip stages for the boss so the storm shows)
    const n = await p.evaluate(async (li) => {
      const { Game, LEVELS } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      const L = Game.level, fl = Game.flyer; window.__shots = [];
      if (LEVELS[li].id === 'boss') { let g = 0; while (L.stage < 3 && g++ < 40) { const st = L.cur; fl.inv = 5; if (st.kind === 'pages') { fl.pos.copy(L.target()); } else { const it = st.items[L.item]; fl.pos.copy(it.p).addScaledVector(it.n, -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, 0.3); } await fr(2); } return 1; }
      const st = L.stages[0]; window.__pts = st.items.filter((_, i) => i % 2 === 1).map((it) => it.p.clone().addScaledVector(it.n, -2.5 * (L.S || 1)));
      return window.__pts.length;
    }, li);
    for (let k = 0; k < n; k++) {
      await p.evaluate((k) => { const { Game } = window.__game; const fl = Game.flyer; fl.inv = 9; if (window.__pts) { const q = window.__pts[k]; fl.pos.copy(q); } }, k);
      await p.waitForTimeout(1600);
      await p.screenshot({ path: `v7_${id}_${k + 1}.png` });
    }
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
