const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 560 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  const out = await p.evaluate(async () => {
    const { Game, Store, THREE } = window.__game; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const res = {};
    Store.data.unlocked = 11; Store.data.settings.difficulty = 'easy';
    // skim + ghost record on classroom
    Game.story(0, true); await fr(2); Game.begin(); while (Game.mode !== 'play') await fr(1);
    const fl = Game.flyer, L = Game.level;
    const t0 = performance.now();
    while (performance.now() - t0 < 6000) { fl.inv = 9; fl.pos.y = 0.28; fl.ap = 0; await fr(1); }
    res.skims = Store.data.stats.skims; res.bestSkim = Store.data.stats.bestSkim; res.rec = Game.rec.d.length / 7; res.runT = Game.runT;
    // finish the level
    let g = 0; while (!L.done && g++ < 60) { const st = L.cur; fl.inv = 5; fl.state = 'fly';
      if (st.kind === 'rings') { const it = st.items[L.item]; fl.pos.copy(it.p).addScaledVector(it.n, -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, 0.3); await fr(2); } else { fl.pos.copy(st.center); await fr(2); } }
    await wait(2500);
    res.ghostSaved = !!localStorage.getItem('paperflight.ghost.class'); res.notes = document.querySelector('#scr .extra') && document.querySelector('#scr .extra').textContent;
    // replay → ghost should appear
    Game.acts.restart(); while (Game.mode !== 'play') await fr(1); await wait(1500);
    res.ghostMesh = !!Game.ghostMesh; res.ghostVis = Game.ghostMesh && Game.ghostMesh.visible; res.ghostPos = Game.ghostMesh && Game.ghostMesh.position.toArray().map(v => +v.toFixed(2));
    // paint mixing in the art room
    Game.story(9, true); await fr(2); Game.begin(); while (Game.mode !== 'play') await fr(1);
    const A = Game.level, S = A.S; const f2 = Game.flyer;
    for (const c of [[-5.6, 2.4, -5.2], [2.6, 2.3, 1.2]]) { for (let k = 0; k < 6; k++) { f2.inv = 9; f2.pos.set(c[0] * S, c[1] * S, c[2] * S); await fr(1); } f2.pos.set(0, 2 * S, -6 * S); await fr(3); }
    res.paint = f2.paintC && f2.paintC.getHexString(); res.mixes = Store.data.stats.mixes; res.ach = Object.keys(Store.data.ach);
    return res;
  });
  console.log(JSON.stringify(out, null, 1));
  await p.screenshot({ path: 'feat_paint.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
