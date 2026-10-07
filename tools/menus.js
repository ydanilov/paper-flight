const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 680 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + (e.stack||'').split('\n').slice(0,3).join('|')));
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  const shot = async (n, fn) => { await p.evaluate(fn); await p.waitForTimeout(1500); await p.screenshot({ path: `menu_${n}.png` }); };
  await shot('title', () => { const { Store, Game } = window.__game; Store.data.unlocked = 11; Store.data.stats = { levels: 12, dist: 3400, rings: 140, skims: 33, bestSkim: 2.4, air: 600 }; Store.data.ach = { first: 1, clean: 1, gold1: 1, rings100: 1 }; Game.title(); });
  await shot('levels', () => window.__game.Game.levels());
  await shot('hangar', () => window.__game.Game.hangar());
  await shot('notebook', () => window.__game.Game.notebook());
  await shot('daily', () => window.__game.Game.dailyScreen());
  await shot('settings', () => window.__game.Game.settings('title'));
  // daily run
  await p.evaluate(() => window.__game.Game.acts.dailyGo());
  await p.waitForTimeout(6000); console.log(await p.evaluate(() => window.__game.Game.mode + ' | ' + document.getElementById('err').textContent + ' | ' + (window.__game.Game.daily && window.__game.Game.daily.mod.id)));
  await p.waitForTimeout(3000); await p.screenshot({ path: 'menu_dailyplay.png' });
  const info = await p.evaluate(async () => { const { Game } = window.__game; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }); const L = Game.level, fl = Game.flyer; let g=0;
    while (!L.done && g++ < 60) { const st = L.cur; fl.inv = 5; fl.state='fly';
      if (st.kind === 'rings' || st.kind === 'hoops') { const it = st.items[L.item]; fl.pos.copy(it.p).addScaledVector(it.n, st.kind==='hoops'?0.3:-0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, st.kind==='hoops'?-0.3:0.3); await fr(2); }
      else if (st.kind === 'pages') { fl.pos.copy(L.target()); await fr(2); } else if (st.kind === 'land') { fl.pos.copy(L.target()); fl.state='landed'; await fr(2);} else { fl.pos.copy(st.center); await fr(2); } }
    return { mod: Game.daily && Game.daily.mod.id, li: Game.li }; });
  console.log(JSON.stringify(info));
  await p.waitForTimeout(3000); await p.screenshot({ path: 'menu_dailyres.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
