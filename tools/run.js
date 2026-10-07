const { chromium } = require('playwright');
const which = process.argv[2] || 'all';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,3).join('\n')));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const G = window.__game; G.Store.data.unlocked = 11; G.Store.save(); G.Game.title(); });
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'shot_title.png' });
  const levels = which === 'all' ? [0,1,2,3,4,5,6,7,8,9,10] : which.split(',').map(Number);
  for (const li of levels) {
    const res = await p.evaluate(async (li) => {
      const { Game, LEVELS } = window.__game; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      Game.story(li, true); await fr(2); Game.begin();
      const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 90000) await fr(1);
      const L = Game.level, fl = Game.flyer; let guard = 0;
      while (!L.done && guard++ < 60) {
        const st = L.cur; fl.inv = 5; fl.state = 'fly';
        if (st.kind === 'rings' || st.kind === 'hoops') { const it = st.items[L.item]; const n = it.n; fl.pos.copy(it.p).addScaledVector(n, -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(n, st.kind === 'hoops' ? -0.6 : 0.3); if (st.kind==='hoops') { fl.pos.copy(it.p).addScaledVector(n, 0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(n, -0.3);} await fr(2); }
        else if (st.kind === 'pages') { const t = L.target(); fl.pos.copy(t); await fr(2); }
        else if (st.kind === 'land') { const t = L.target(); fl.pos.copy(t).add({x:0,y:0.2,z:0}); fl.state = 'landed'; await fr(2); }
        else if (st.kind === 'exit') { fl.pos.copy(st.center); await fr(2); }
      }
      return { id: LEVELS[li].id, done: L.done, stage: L.stage, guard, mode: Game.mode };
    }, li);
    console.log(JSON.stringify(res));
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `shot_res_${li}.png` });
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
