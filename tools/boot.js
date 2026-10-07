const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: 'shot_title.png' });
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
