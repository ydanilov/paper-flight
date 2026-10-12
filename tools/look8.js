// v8 look probe: one screenshot per level from the spawn (or a custom camera spot), to judge the semi-realistic pass
// usage: node look8.js [indexes] [tag] [w h]   e.g. node look8.js 0,1,2,8 a
const { chromium } = require('playwright');
const which = (process.argv[2] || '0,2,3,8,13,14').split(',').map(Number), tag = process.argv[3] || 'a';
const W = +(process.argv[4] || 1280), H = +(process.argv[5] || 720);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await p.waitForTimeout(1200);
  await p.evaluate(() => { const S = window.__game.Store; S.data.settings.ctrlBar = false; S.data.settings.quality = 'high'; S.save(); const G = window.__game; G.DRS.tick = () => {}; G.DRS.scale = 1; window.dispatchEvent(new Event('resize')); });
  for (const li of which) {
    const id = await p.evaluate(async (li) => {
      const { Game, LEVELS } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      Game.story(li, true); await fr(2); Game.begin();
      const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 120000) await fr(1);
      Game.flyer.inv = 99; return LEVELS[li].id;
    }, li);
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `look_${tag}_${id}.png` });
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
