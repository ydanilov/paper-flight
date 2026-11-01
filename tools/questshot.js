// quest tag portrait probe: starts Classroom 5B, forces its favour into "offer" then "carry", screenshots both
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } }); const errs = [];
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate(() => { const G = window.__game; G.Store.data.settings.quality = 'low'; G.Store.data.cuts = Object.fromEntries(G.LEVELS.map((L) => [L.id, 1])); G.Game.story(0, true); G.Game.begin(); G.Game.holdT = 0.05; });
  await p.waitForFunction(() => window.__game.Game.mode === 'play', null, { timeout: 400000, polling: 500 });
  const out = [];
  for (const st of ['offer', 'carry']) {
    const r = await p.evaluate(async (st) => { const G = window.__game.Game, Q = G.level.quest; if (!Q) return { none: true }; Q.st = st; Q.dist = 1; for (let i = 0; i < 4; i++) await new Promise((r) => requestAnimationFrame(r)); Q.st = st; Q.dist = 1;
      const el = document.getElementById('hQuest'), f = el.querySelector('.face'), im = f && f.querySelector('img'); if (im && !im.complete) await new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 5000); });
      return { st, on: el.classList.contains('on'), id: f && f.dataset.id, loaded: !!(im && im.naturalWidth), visible: !!f && getComputedStyle(f).opacity === '1' && f.getBoundingClientRect().width > 20, text: el.textContent, from: Q.q.from, to: Q.q.to }; }, st);
    await p.screenshot({ path: `shots/quest_${st}.png` }); out.push(r);
  }
  const okk = out.every((r) => r.on && r.loaded && r.visible && r.id === (r.st === 'offer' ? r.from : r.to));
  console.log(JSON.stringify(out)); console.log(okk && !errs.length ? 'quest portrait ok' : 'FAIL ' + errs.join(' | '));
  await b.close(); process.exit(okk && !errs.length ? 0 : 1);
})();
