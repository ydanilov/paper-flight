const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  const r = await p.evaluate(async () => {
    const { Game, Store, THREE } = window.__game; Store.data.unlocked = 12; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    Game.story(0, true); await fr(2); Game.begin(); while (Game.mode !== 'play') await fr(1);
    const L = Game.level, fl = Game.flyer, S = L.S;
    while (Game.runT < 1.6) { fl.inv = 9; await fr(1); }
    const jk = L.people.find(q => q.castId === 'jake'); for (let i = 0; i < 4; i++) { fl.inv = 9; fl.pos.copy(jk.worldPos(new THREE.Vector3())).add(new THREE.Vector3(2 * S, 1.6 * S, 0)); await fr(1); }
    const q = L.powerups[0]; for (let i = 0; i < 4; i++) { fl.inv = 9; fl.pos.copy(q.p); await fr(1); }
    Game.flyer.swap('glider'); await fr(3);
    const teachers = L.people.filter(q => q.teacher).map(q => q.teacher);
    return { sp: Game._sp, heard: Store.data.heard.class, jokes: Store.data.jokes, teachers, chat: L.chatter.length, toast: document.getElementById('hToast').textContent };
  });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: 'b5.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
