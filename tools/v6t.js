const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate(() => { const { Game, Store } = window.__game; Store.data.unlocked = 14; Store.data.cuts = {}; Game.story(0); });
  await p.waitForTimeout(6000); await p.screenshot({ path: 'v6_cut.png' });
  console.log(await p.evaluate(() => window.__game.Game.mode + ' ' + document.getElementById('cutTxt').textContent));
  await p.evaluate(() => window.__game.Game.acts.skipCut()); await p.waitForTimeout(3000);
  await p.evaluate(() => { const G = window.__game.Game; G.acts.chal(); }); await p.waitForTimeout(3500); await p.screenshot({ path: 'v6_story.png' });
  const r = await p.evaluate(async () => { const { Game, Store } = window.__game; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const out = { chal: Game.challenge };
    Game.begin(); while (Game.mode !== 'play') await fr(1); out.ta = Game.taLeft; Game.taLeft = 0.01; await fr(4); out.afterTA = Game.mode + ' ' + (document.querySelector('#scr .ttl') || {}).textContent;
    Game.challenge = 'iron'; Game.acts.restart(); while (Game.mode !== 'play') await fr(1); Game.flyer.inv = 0; Game.flyer.crash('x', (k, a) => Game.fx(k, a)); await new Promise(r => setTimeout(r, 2500)); out.iron = Game.mode + ' ' + (document.querySelector('#scr .ttl') || {}).textContent;
    Game.challenge = 'normal'; Store.data.best.yard = Store.data.best.yard || { time: 1 }; Game.levels(); await fr(2); Game.acts.marathon(); while (Game.mode !== 'play') await fr(1); out.mar = document.getElementById('hLv').textContent;
    // finish level 1 of marathon quickly
    const L = Game.level, fl = Game.flyer; let g = 0; while (!L.done && g++ < 40) { const st = L.cur; fl.inv = 5; fl.state = 'fly'; if (st.kind === 'rings') { const it = st.items[L.item]; fl.pos.copy(it.p).addScaledVector(it.n, -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, 0.3); await fr(2); } else { fl.pos.copy(st.center); await fr(2); } }
    await new Promise(r => setTimeout(r, 2200)); out.marMid = (document.querySelector('#scr .ttl') || {}).textContent; await new Promise(r => setTimeout(r, 2000)); out.mar2 = Game.marathon && Game.marathon.i;
    return out; });
  console.log(JSON.stringify(r));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
