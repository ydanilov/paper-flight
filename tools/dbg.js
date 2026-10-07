const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage(); const logs = [];
  p.on('console', m => logs.push(m.type() + ' ' + m.text().slice(0, 300))); p.on('pageerror', e => logs.push('PE ' + e.message));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  const r = await p.evaluate(async () => { const { Game, Store } = window.__game; Store.data.unlocked = 14; try { Game.story(12, true); } catch (e) { return 'story err ' + e.message + e.stack; } await new Promise(r => setTimeout(r, 500)); try { Game.begin(); } catch (e) { return 'begin err ' + e.message + e.stack.split('\n').slice(0,4).join('|'); } await new Promise(r => setTimeout(r, 8000)); return Game.mode + ' | ' + document.getElementById('err').textContent; });
  console.log(r); console.log(logs.filter(l => !/Failed to load/.test(l)).slice(0, 10).join('\n')); await b.close();
})();
