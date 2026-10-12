// v8 people probe: close-ups of a few people (neutral, cheering, cross) and the plane, to judge faces, hair, clothes
// usage: node ppl8.js [levelIndex] [tag]
const { chromium } = require('playwright');
const li = +(process.argv[2] || 0), tag = process.argv[3] || 'a';
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
  await p.goto('http://localhost:8765/test.html');
  await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
  await p.waitForTimeout(1200);
  await p.evaluate(async (li) => {
    const G = window.__game; G.DRS.tick = () => {}; G.DRS.scale = 1; G.Store.data.settings.ctrlBar = false; window.dispatchEvent(new Event('resize'));
    const { Game } = G; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    Game.story(li, true); await fr(2); Game.begin(); const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 90000) await fr(1);
    Game.flyer.inv = 999;
  }, li);
  const shots = [['near', 0], ['cheer', 1], ['cross', 2], ['adult', 3]];
  for (const [name, k] of shots) {
    await p.evaluate(async (k) => {
      const G = window.__game, { Game, THREE } = G, L = Game.level, S = L.S || 1;
      const ppl = L.people.filter((q) => q.root && q.head && (k === 3 ? q.kind === 'adult' : q.kind === 'kid' && q.pose === 'stand' || q.pose === 'sit'));
      const q = ppl[(k * 3) % Math.max(1, ppl.length)] || L.people[0];
      q.root.updateMatrixWorld(true); const h = q.head.getWorldPosition(new THREE.Vector3());
      const fwd = new THREE.Vector3(Math.sin(q.root.rotation.y), 0, Math.cos(q.root.rotation.y));
      const eye = h.clone().addScaledVector(fwd, 0.85 * S).add(new THREE.Vector3(0.25 * S, 0.05 * S, 0));
      if (k === 1) { q.state = 'idle'; q.cool = 0; q.startReact('cheer', Game.flyer, true); }
      if (k === 2) { const R2 = G.Store.data.rel || (G.Store.data.rel = {}); if (q.castId) R2[q.castId] = -4; q.castId = q.castId || 'jake'; }
      window.__freeze = { eye, h }; const fl = Game.flyer; fl.pos.copy(eye).addScaledVector(fwd, -0.3 * S);
      const _upd = Game.cam.update.bind(Game.cam); Game.cam.update = function (...a) { const r = _upd(...a); G.camera.position.copy(window.__freeze.eye); G.camera.lookAt(window.__freeze.h); return r; };
    }, k);
    await p.waitForTimeout(2200);
    await p.screenshot({ path: `ppl_${tag}_${name}.png` });
  }
  console.log(errs.join('\n') || 'no errors');
  await b.close();
})();
