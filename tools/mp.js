const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 560 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate(() => { const { Game, Store } = window.__game; Store.data.unlocked = 11; Store.data.mp = { mode: 'coop', li: 10 }; Game.mpSetup(); Game.mpBegin(['kb', 0]); });
  await p.waitForTimeout(9000);
  const m = await p.evaluate(() => window.__game.Game.mode + ' ' + document.getElementById('err').textContent);
  await p.screenshot({ path: 'mp.png' }); console.log(m); console.log(errs.join('\n') || 'no errors'); await b.close();
})();
