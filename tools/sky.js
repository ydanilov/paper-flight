// Painted-sky probe: flies to each outdoor level (and a few indoor rooms with windows), waits for the panorama,
// turns the plane to look around and screenshots into tools/shots/sky_<id>_<n>.png. Asserts the painting loaded and
// faded in (dome for outdoor levels, window glass indoors) and no console errors.
// usage: node sky.js [ids]   default: yard,roof,bus,town,party,rain,free,class,home,gym   (W H via env, default 1280×720)
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('shots', { recursive: true });
const ids = (process.argv[2] || 'yard,roof,bus,town,party,rain,free,class,home,gym').split(',');
const W = +(process.env.W || 1280), H = +(process.env.H || 720), tag = W < 900 ? 'm' : 'd';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: W, height: H }, hasTouch: W < 900, isMobile: W < 900 });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate((q) => { const G = window.__game; G.Store.data.unlocked = 16; G.Store.data.seenIntro = true; G.Store.data.cuts = Object.fromEntries(G.LEVELS.map((L) => [L.id, 1])); G.Store.data.settings.quality = q; G.Store.data.settings.ctrlBar = false; G.Store.save(); window.dispatchEvent(new Event('resize')); if (window.__rot) window.__rot.allow = true; }, process.env.Q || 'med');
  for (const id of ids) {
    const t0 = Date.now();
    await p.evaluate((id) => { const { Game, LEVELS } = window.__game; Game._bossIntroOK = true; if (id === 'free') Game.acts.practice(); else { Game.story(LEVELS.findIndex((L) => L.id === id), true); Game.begin(); } }, id);
    await p.waitForFunction(() => ['play'].includes(window.__game.Game.mode), null, { timeout: 240000, polling: 500 });
    const st = await p.waitForFunction(() => { const S = window.__sky; return S.st[S.cur] !== 'loading' && (S.domeK.value > 0.99 || S.glassK.value > 0.99 || S.st[S.cur] === 'fail') ? { k: S.cur, st: S.st[S.cur], dome: S.domeK.value, glass: S.glassK.value } : false; }, null, { timeout: 120000, polling: 500 }).then((h) => h.jsonValue()).catch(() => null);
    ok(st && st.st === 'ok' && (st.dome > 0.99 || st.glass > 0.99), `${id}: painted sky ${JSON.stringify(st)}`);
    for (const [n, dy, pitch] of [[0, 0, 0.25], [1, -0.35, 0.5], [2, 0.4, 0.45]]) {
      await p.evaluate(([dy, pitch]) => { const { Game } = window.__game; const fl = Game.flyer, L = Game.level; fl.inv = 99; const sp = L.spawn; fl.reset(sp.pos.clone().add({ x: 0, y: L.outdoor ? 3 : 0.3, z: 0 }), sp.yaw + dy, pitch); Game.cam.snap(fl); Game.mode = 'play'; }, [dy, pitch]);
      await p.evaluate(() => new Promise((r) => { let k = 0; const f = () => (++k >= 4 ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); }));
      await p.screenshot({ path: `shots/sky_${tag}_${id}_${n}.png` });
      await p.evaluate(() => { const { Game } = window.__game; const fl = Game.flyer; fl.vel.set(0, 0, 0); });
    }
    console.log(`  ${id} ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  ok(!errs.length, `no console errors ${errs.join(' | ')}`);
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all sky checks passed');
  process.exit(fails ? 1 : 0);
})();
