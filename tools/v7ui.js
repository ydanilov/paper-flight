// v7 UI probe: hangar with 8 crafts, a cutscene choice, the story card callback, results diary page, notebook diary — desktop and phone
// usage: node v7ui.js [w] [h]   (default 1280 720; try 390 844 for a phone)
const { chromium } = require('playwright');
const W = +(process.argv[2] || 1280), H = +(process.argv[3] || 720), tag = W < 600 ? 'm' : 'd';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: W < 600, isMobile: W < 600 });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const G = window.__game; G.Store.data.unlocked = 16; G.Store.data.seenIntro = true; delete (G.Store.data.cuts || {}).class; G.Store.save(); G.Game.title(); });
  await p.waitForTimeout(800); await p.screenshot({ path: `ui_${tag}_title.png` });
  await p.evaluate(() => window.__game.Game.hangar()); await p.waitForTimeout(900); await p.screenshot({ path: `ui_${tag}_hangar.png` });
  await p.evaluate(() => window.__game.Game.levels()); await p.waitForTimeout(700); await p.screenshot({ path: `ui_${tag}_levels.png` });
  // cutscene → choice
  await p.evaluate(() => window.__game.Game.story(0));
  for (let i = 0; i < 80; i++) { const ok = await p.evaluate(() => { const G = window.__game.Game; if (document.querySelector('[data-act=pickChoice]')) return true; if (G.cut) G.cut.t = Math.max(G.cut.t, G.cut.next); return false; }); if (ok) break; await p.waitForTimeout(300); }
  await p.waitForSelector('[data-act=pickChoice]', { timeout: 20000 });
  await p.waitForTimeout(400); await p.screenshot({ path: `ui_${tag}_choice.png` });
  await p.click('[data-act=pickChoice][data-i="1"]');
  for (let i = 0; i < 40; i++) { const ok = await p.evaluate(() => { const C = window.__game.Game.cut; if (!C || !C.seq || !C.seq.length) return true; C.t = Math.max(C.t, C.seq[0].at); return false; }); if (ok) break; await p.waitForTimeout(200); }
  await p.waitForTimeout(600); await p.screenshot({ path: `ui_${tag}_reply.png` });
  await p.evaluate(() => { const C = window.__game.Game.cut; if (C && C.after != null) C.t = C.after; });
  await p.waitForFunction(() => window.__game.Game.mode !== 'cut', null, { timeout: 20000 });
  await p.waitForTimeout(600); await p.screenshot({ path: `ui_${tag}_story.png` });
  const ch = await p.evaluate(() => JSON.stringify({ choice: window.__game.Store.data.choices, jake: (window.__game.Store.data.rel || {}).jake }));
  // play it through to the results card
  await p.evaluate(async () => {
    const { Game } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    Game.begin(); const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 60000) await fr(1);
    const L = Game.level, fl = Game.flyer; let g = 0;
    while (!L.done && g++ < 60) { const st = L.cur; fl.inv = 5; fl.state = 'fly';
      if (st.kind === 'rings' || st.kind === 'hoops') { const it = st.items[L.item]; fl.pos.copy(it.p).addScaledVector(it.n, -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, 0.3); await fr(2); }
      else if (st.kind === 'pages') { fl.pos.copy(L.target()); await fr(2); }
      else if (st.kind === 'land') { fl.pos.copy(L.target()).add({ x: 0, y: 0.2, z: 0 }); fl.state = 'landed'; await fr(2); }
      else if (st.kind === 'exit') { fl.pos.copy(st.center); await fr(2); } }
  });
  await p.waitForTimeout(3500); await p.screenshot({ path: `ui_${tag}_results.png` });
  await p.evaluate(() => window.__game.Game.notebook()); await p.waitForTimeout(800);
  await p.evaluate(() => { const d = [...document.querySelectorAll('#scr .ovt')].find((e) => /diary/.test(e.textContent)); if (d) d.scrollIntoView(); });
  await p.waitForTimeout(400); await p.screenshot({ path: `ui_${tag}_notebook.png` });
  // crafts: fly the crane and tap gust, then the hawk and hold it
  const fly = await p.evaluate(async () => {
    const { Game, Store } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const out = {};
    for (const c of ['crane', 'hawk']) { Store.data.plane = c; Game.story(13, true); await fr(2); Game.begin(); const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 90000) await fr(1);
      const fl = Game.flyer; out[c] = { type: fl.type, y0: +fl.pos.y.toFixed(2) }; }
    return out;
  });
  console.log(JSON.stringify({ ch, fly }));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
