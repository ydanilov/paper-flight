// v13 probe: views of the new levels, Nibbles on the plane, photo mode (filters + snap), the class photo with a photobomb, the album in the notebook
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await p.waitForTimeout(1000);
  await p.evaluate(() => { const G = window.__game; G.DRS.tick = () => {}; G.DRS.scale = 1; Object.assign(G.Store.data.settings, { ctrlBar: false, quality: 'med' }); G.Store.data.unlocked = 30; window.dispatchEvent(new Event('resize')); });
  const go = (id) => p.evaluate(async (id) => { const { Game, LEVELS } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const li = LEVELS.findIndex((L) => L.id === id); Game.story(li, true); await fr(2); Game.begin(); const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 150000) await fr(1); Game.flyer.inv = 999; return li; }, id);
  const place = (pos, yaw, pitch = 0) => p.evaluate(([pos, yaw, pitch]) => { const { Game, THREE } = window.__game; const S = Game.level.S || 1; Game.flyer.reset(new THREE.Vector3(pos[0] * S, pos[1] * S, pos[2] * S), yaw, pitch); Game.cam.snap(Game.flyer); }, [pos, yaw, pitch]);
  const out = {};
  // 1. the play: from the audience toward the stage, then the dragon on its mark
  await go('play'); await place([0, 2.4, -2.5], 0, -0.1); await p.waitForTimeout(2500); await p.screenshot({ path: 'v13_play.png' }); console.log('shot play', JSON.stringify(out));
  out.plane = await p.evaluate(() => window.__game.Game.flyer.type);
  // 2. Nibbles close-up: nose camera off, far chase
  await p.evaluate(() => { const { Game } = window.__game; Game.cam.update && 0; });
  await go('mia'); out.mia = await p.evaluate(() => { const { Game } = window.__game; return { skin: Game.flyer.skin, stages: Game.level.stages.map((s) => s.kind), people: Game.level.people.length }; });
  await p.waitForTimeout(2500); await p.screenshot({ path: 'v13_mia.png' }); console.log('shot mia', JSON.stringify(out));
  // pet warning: aim at a wall
  out.eep = await p.evaluate(async () => { const { Game, THREE, Store } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const S = Game.level.S; const before = (Store.data.stats || {}).eeps || 0; Game.flyer.reset(new THREE.Vector3(-3 * S, 1.6 * S, 4.5 * S), 0, 0); Game.flyer.vel.set(0, 0, 4); for (let i = 0; i < 12; i++) { Game.flyer.vel.set(0, 0, 4); await fr(1); }
    return { before, after: (Store.data.stats || {}).eeps || 0, vis: !!(window.__pet || 1) }; });
  // 3. photo mode with a filter, then snap
  out.photo = await p.evaluate(async () => { const { Game } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyO' })); await fr(3); const m = Game.mode;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF' })); await fr(3);
    return { mode: m, ui: !!document.getElementById('photoUI'), f: document.getElementById('phF').textContent }; });
  await p.waitForTimeout(1500); await p.screenshot({ path: 'v13_photo.png' }); console.log('shot photo', JSON.stringify(out));
  await p.click('[data-p="snap"]'); await p.waitForTimeout(2500); await p.screenshot({ path: 'v13_photo_snap.png' }); console.log('shot photo_snap', JSON.stringify(out));
  out.snap = await p.evaluate(() => ({ album: (window.__game.Store.data.photos || []).length, shot: !document.getElementById('phShot').hidden }));
  await p.click('[data-p="done"]'); await p.waitForTimeout(800); out.after = await p.evaluate(() => window.__game.Game.mode);
  // 4. class photo: fly into the frame and fast-forward the countdown
  await go('class');
  out.cls = await p.evaluate(async () => { const { Game, THREE, Store } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const S = Game.level.S, fl = Game.flyer; const n0 = (Store.data.photos || []).length;
    Game.level.photoNow && Game.level.photoNow(); const t0 = performance.now(); while ((Store.data.photos || []).length === n0 && performance.now() - t0 < 200000) { fl.reset(new THREE.Vector3(3.5 * S, 1.3 * S, 2.6 * S), Math.PI * 0.8, 0); fl.vel.set(0, 0, 0.01); Game.runT += 0; await fr(1); for (const f of Game.level.b.dyn || []) 0; }
    const ph = (Store.data.photos || [])[0]; return { n: (Store.data.photos || []).length, cap: ph && ph.cap, bombs: (Store.data.stats || {}).photobomb || 0 }; });
  await p.waitForTimeout(500); await p.screenshot({ path: 'v13_classphoto.png' }); console.log('shot classphoto', JSON.stringify(out));
  // 5. last day: fly the goodbye line
  await go('lastday'); await place([7.5, 3.0, -18], 0, -0.05); await p.waitForTimeout(4000); await p.screenshot({ path: 'v13_lastday.png' }); console.log('shot lastday', JSON.stringify(out));
  await go('sports'); await place([-21.75, 2.4, 14], 0, -0.05); await p.waitForTimeout(3000); await p.screenshot({ path: 'v13_sports.png' }); console.log('shot sports', JSON.stringify(out));
  await go('trip'); await p.waitForTimeout(4000); await p.screenshot({ path: 'v13_trip.png' }); console.log('shot trip', JSON.stringify(out));
  // 6. the album in the notebook
  await p.evaluate(() => { const { Game } = window.__game; Game.title(); Game.notebook(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const a = document.querySelector('.album'); if (a) a.scrollIntoView(); }); await p.waitForTimeout(800); await p.screenshot({ path: 'v13_album.png' }); console.log('shot album', JSON.stringify(out));
  out.albumCells = await p.evaluate(() => document.querySelectorAll('.album .pol').length);
  console.log(JSON.stringify(out));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
