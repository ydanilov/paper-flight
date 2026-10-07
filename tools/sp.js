const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  const out = [];
  for (const li of [0, 7, 8, 10]) {
    const r = await p.evaluate(async (li) => {
      const { Game, Store, LEVELS } = window.__game; Store.data.unlocked = 11; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      Game.story(li, true); await fr(2); Game.begin(); while (Game.mode !== 'play') await fr(1);
      const fl = Game.flyer, L = Game.level; while (Game.runT < 1.6) { fl.inv = 9; await fr(1); }
      const startTxt = document.getElementById('hSpecial').textContent;
      // star + trouble
      const s0 = L.stars[0]; fl.pos.copy(s0.p); await fr(3);
      fl.inv = 0; fl.crash('test', (k,a)=>Game.fx(k,a)); await fr(3);
      while (Game.mode === 'respawn' || fl.state === 'crash') await fr(1);
      let g = 0; while (!L.done && g++ < 60) { const st = L.cur; fl.inv = 5; fl.state = 'fly';
        if (st.kind === 'rings' || st.kind === 'hoops') { const it = st.items[L.item]; const s = st.kind==='hoops'?-1:1; fl.pos.copy(it.p).addScaledVector(it.n, -0.3*s); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, 0.3*s); await fr(2); }
        else if (st.kind === 'pages') { fl.pos.copy(L.target()); await fr(2); } else if (st.kind === 'land') { fl.pos.copy(L.target()); fl.state='landed'; await fr(2); } else { fl.pos.copy(st.center); await fr(2); } }
      await fr(2);
      return { id: LEVELS[li].id, startTxt, heard: Store.data.heard[LEVELS[li].id], last: document.getElementById('hSpecial').textContent };
    }, li);
    out.push(r); await p.waitForTimeout(500);
    if (li === 8) await p.screenshot({ path: 'sp_yard.png' });
    await p.waitForTimeout(2500);
  }
  console.log(JSON.stringify(out, null, 1));
  await p.evaluate(() => window.__game.Game.notebook()); await p.waitForTimeout(800);
  await p.evaluate(() => { document.querySelectorAll('.ovh')[0].open = true; document.querySelector('.ovhs').scrollIntoView(); }); await p.waitForTimeout(500);
  await p.screenshot({ path: 'sp_nb.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
