// par-time check: measures each level's route (spawn → rings in order → pages nearest-first → landing/exit)
// and compares it with the gold par, as seconds of route at Dart cruise speed (arcade, normal speed)
// usage: node par.js
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.waitForTimeout(1000);
  const n = await p.evaluate(() => window.__game.LEVELS.length);
  for (let i = 0; i < n; i++) {
    const r = await p.evaluate(async (i) => {
      const { Game, LEVELS, Store } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      Game.loadLevel(i, true); await fr(2);
      const L = Game.level, D = LEVELS[i]; let cur = L.spawn.pos.clone(), len = 0, items = 0;
      for (const st of L.stages) {
        if (st.kind === 'rings' || st.kind === 'hoops') for (const it of st.items) { len += cur.distanceTo(it.p); cur = it.p.clone(); items++; }
        else if (st.kind === 'pages') { const left = st.items.map((it) => it.p.clone()); while (left.length) { left.sort((a, b2) => a.distanceTo(cur) - b2.distanceTo(cur)); const q = left.shift(); len += cur.distanceTo(q); cur = q; items++; } }
        else if (st.kind === 'land') { const c = st.pad.min.clone().add(st.pad.max).multiplyScalar(0.5); len += cur.distanceTo(c); cur = c; items++; }
        else if (st.kind === 'exit') { const c = st.center || st.box.min.clone().add(st.box.max).multiplyScalar(0.5); len += cur.distanceTo(c); cur = c; items++; }
      }
      const spd = 7.3 * 0.6, est = len / spd, kk = (1.3 * 0.74 / 0.6) * (D.outdoor ? 1 : 1.6);
      return { id: D.id, gold: D.gold, silver: D.silver, len: +len.toFixed(1), items, est: +est.toFixed(1), goldPar: +(D.gold * kk).toFixed(1), ratio: +((D.gold * kk) / est).toFixed(2) };
    }, i);
    console.log(JSON.stringify(r));
  }
  await b.close();
})();
