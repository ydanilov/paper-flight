const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 680 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate(() => { const { Store, Game } = window.__game; Store.data.unlocked = 11; Game.title(); }); await p.waitForTimeout(1200); await p.screenshot({ path: 'm2_title.png' });
  await p.evaluate(() => window.__game.Game.notebook()); await p.waitForTimeout(1200); await p.screenshot({ path: 'm2_nb.png' });
  const pp = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await pp.goto('http://localhost:8765/test.html'); await pp.waitForFunction(() => window.__game, null, { timeout: 60000 }); await pp.waitForTimeout(1500); await pp.screenshot({ path: 'm2_phone.png' });
  await pp.evaluate(() => window.__game.Game.notebook()); await pp.waitForTimeout(1200); await pp.screenshot({ path: 'm2_phone_nb.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
