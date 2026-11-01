// Finale clip probe: finish the Schoolyard → results → "Read the reply" plays pfv_finale (forced on) → ending card + credits;
// a run with the clip blocked goes straight to the ending; the Notebook offers "Watch the ending" once seen; photo mode's
// Download link stays outside the artifact viewer.   usage: node finale.js
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('shots', { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  for (const blocked of [false, true]) {
    const tag = blocked ? 'blocked' : 'play';
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    if (blocked) await ctx.route(/pfv_finale\.mp4/, (r) => r.abort());
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto('http://localhost:8765/test.html');
    await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
    await p.evaluate(() => { const G = window.__game, S = G.Store.data; S.settings.quality = 'low'; S.unlocked = 9; S.cuts = Object.fromEntries(G.LEVELS.map((L) => [L.id, 1])); delete S.finaleSeen; G.Store.save(); window.__finale.force = true; });
    // fly the yard to its results card
    await p.evaluate(async () => {
      const { Game, LEVELS } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      Game.story(LEVELS.findIndex((L) => L.id === 'yard'), true); await fr(2); Game.begin(); Game.holdT = 0.05;
      const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 300000) await fr(1);
      const L = Game.level, fl = Game.flyer; let g = 0;
      while (!L.done && g++ < 60) { const st = L.cur; fl.inv = 5; fl.state = 'fly';
        if (st.kind === 'rings' || st.kind === 'hoops') { const it = st.items[L.item]; fl.pos.copy(it.p).addScaledVector(it.n, -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, 0.3); await fr(2); }
        else if (st.kind === 'pages') { fl.pos.copy(L.target()); await fr(2); }
        else if (st.kind === 'land') { fl.pos.copy(L.target()).add({ x: 0, y: 0.2, z: 0 }); fl.state = 'landed'; await fr(2); }
        else { fl.pos.copy(st.center); await fr(2); } }
    });
    await p.waitForFunction(() => window.__game.Game.mode === 'results' && document.querySelector('[data-act="ending"]'), null, { timeout: 300000, polling: 500 });
    ok(await p.evaluate(() => !!(window.__finale.v && /pfv_finale/.test(window.__finale.v.src))), `${tag}: clip preloaded when the yard started`);
    await p.click('[data-act="ending"]');
    if (!blocked) {
      const st = await p.waitForFunction(() => { const F = window.__finale; return F.on && F.st === 'playing' && F.v.currentTime > 1.2 ? { t: F.v.currentTime, muted: F.v.muted, dur: F.v.duration } : false; }, null, { timeout: 30000, polling: 200 }).then((h) => h.jsonValue()).catch(() => null);
      ok(!!st, `${tag}: the finale clip plays ${JSON.stringify(st)}`);
      await p.screenshot({ path: 'shots/fin_playing.png' });
      await p.waitForFunction(() => !window.__finale.on, null, { timeout: 30000, polling: 250 });
    } else {
      await p.waitForTimeout(1500);
    }
    await p.waitForTimeout(1200);
    const end = await p.evaluate(() => ({ state: window.__game.Game && document.querySelector('#scr .roll') ? 'ending' : 'other', fin: window.__finale.on, seen: !!window.__game.Store.data.finaleSeen }));
    ok(end.state === 'ending' && !end.fin && end.seen === !blocked, `${tag}: then the ending card + credits ${JSON.stringify(end)}`);
    await p.screenshot({ path: `shots/fin_${tag}_ending.png` });
    if (!blocked) {
      // skip: replay from the Notebook and press a key
      await p.evaluate(() => window.__game.Game.notebook()); await p.waitForTimeout(800);
      ok(await p.$('#scr [data-act="watchEnding"]') !== null, `${tag}: Notebook offers “Watch the ending”`);
      await p.screenshot({ path: 'shots/fin_notebook.png' });
      await p.click('#scr [data-act="watchEnding"]');
      await p.waitForFunction(() => window.__finale.on && window.__finale.st === 'playing', null, { timeout: 30000, polling: 200 });
      await p.waitForTimeout(600); await p.keyboard.press('Space');
      await p.waitForTimeout(800);
      ok(await p.evaluate(() => !window.__finale.on && window.__game.Game && !!document.querySelector('#scr .nb')), `${tag}: any key skips back to the Notebook`);
      ok(await p.evaluate(() => window.__inArtifact === false), `${tag}: not the artifact viewer here — photo Download stays`);
    }
    ok(!errs.length, `${tag}: no console errors ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all finale checks passed');
  process.exit(fails ? 1 : 0);
})();
