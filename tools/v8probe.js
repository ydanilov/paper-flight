// v8 feature probe: Thorne in the gym, a secret room (fly in, take the note), winter outside and in, the rocket and dragon
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
  const go = (li, extra) => p.evaluate(async ([li, extra]) => {
    const G = window.__game, { Game, Store } = G; G.DRS.tick = () => {}; G.DRS.scale = 1; Store.data.settings.ctrlBar = false; Object.assign(Store.data.settings, extra.settings || {}); if (extra.plane) Store.data.plane = extra.plane; window.dispatchEvent(new Event('resize'));
    const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    Game.story(li, true); await fr(2); Game.begin(); const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 120000) await fr(1); Game.flyer.inv = 999; return true;
  }, [li, extra]);
  const out = {};
  // 1. gym: skip to Thorne's stage and hover in front of her
  await go(6, { settings: { quality: 'high', season: 'autumn' } });
  out.gym = await p.evaluate(async () => { const { Game } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const L = Game.level, fl = Game.flyer; let g = 0; while (L.stage < 2 && g++ < 20) { const st = L.cur, it = st.items[L.item]; fl.pos.copy(it.p).addScaledVector(it.n, st.kind === 'hoops' ? 0.3 : -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, st.kind === 'hoops' ? -0.3 : 0.3); await fr(2); }
    const vp = L.people.find((q) => q.vp); vp.root.updateMatrixWorld(true); const h = vp.root.getWorldPosition(new window.__game.THREE.Vector3()); fl.reset(h.clone().add(new window.__game.THREE.Vector3(0, 2.4, -4.5)), 0, -0.1); Game.cam.snap(fl);
    return { stage: L.stage, boss: !!L.boss, text: L.cur.text }; });
  await p.waitForTimeout(5000); await p.screenshot({ path: 'v8_thorne.png' });
  out.gymLater = await p.evaluate(() => { const L = window.__game.Game.level; return { hp: L.boss && L.boss.hp, phase: L.boss && L.boss.phaseText }; });
  // 2. class: fly into the vent, then onto the note
  await go(0, { settings: { quality: 'high' } });
  out.secret = await p.evaluate(async () => { const { Game, THREE, Store } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const L = Game.level, fl = Game.flyer, S = L.S; fl.reset(new THREE.Vector3(4 * S, (3.4 - 0.32) * S, (-6.98 + 0.3) * S), Math.PI, 0); await fr(3);
    const inRoom = fl.pos.y > 30 * S; await fr(10);
    fl.pos.set(0, 41 * S, 0); await fr(4);
    return { inRoom, y: +fl.pos.y.toFixed(1), got: !!(Store.data.secrets || {}).class }; });
  await p.evaluate(() => { const { Game, THREE } = window.__game; const fl = Game.flyer, S = Game.level.S; fl.reset(new THREE.Vector3(1.8 * S, 41.8 * S, -1.8 * S), -2.4, -0.25); Game.cam.snap(fl); });
  await p.waitForTimeout(3500); await p.screenshot({ path: 'v8_secret.png' });
  // 3. winter: the yard and the classroom, flying the rocket then the dragon
  await go(8, { settings: { season: 'winter' }, plane: 'rocket' });
  await p.waitForTimeout(3500); await p.screenshot({ path: 'v8_winter_yard.png' });
  await go(0, { settings: { season: 'winter' }, plane: 'dragon' });
  await p.waitForTimeout(3500); await p.screenshot({ path: 'v8_winter_class.png' });
  await go(13, { settings: { season: 'spring' }, plane: 'dart' });
  await p.waitForTimeout(3500); await p.screenshot({ path: 'v8_spring_party.png' });
  console.log(JSON.stringify(out));
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
