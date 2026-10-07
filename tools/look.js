const { chromium } = require('playwright');
const li = +process.argv[2]; const spots = JSON.parse(process.argv[3] || '[]');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate(async (li) => { const { Game, Store } = window.__game; Store.data.unlocked = 11; Store.data.settings.ctrlBar = false; Game.story(li, true); await new Promise(r=>setTimeout(r,300)); Game.begin(); }, li);
  await p.waitForFunction(() => window.__game.Game.mode === 'play', null, { timeout: 150000 });
  await p.waitForTimeout(2500);
  await p.screenshot({ path: `look_${li}_0.png` });
  let k = 1;
  for (const s of spots) {
    await p.evaluate((s) => { const { Game, THREE } = window.__game; const fl = Game.flyer, S = Game.level.S; fl.reset(new THREE.Vector3(s[0]*S, s[1]*S, s[2]*S), s[3], 0); fl.inv = 99; Game.cam.snap(fl); }, s);
    await p.waitForTimeout(1800);
    await p.screenshot({ path: `look_${li}_${k++}.png` });
  }
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
