const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 640 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  const r = await p.evaluate(async () => {
    const { Game, Store, THREE } = window.__game; Store.data.unlocked = 11; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    const out = {};
    Game.story(0, true); await fr(2); Game.begin(); while (Game.mode !== 'play') await fr(1);
    const L = Game.level, fl = Game.flyer, S = L.S;
    out.cast = L.people.filter(q => q.castId).map(q => q.castId);
    out.mia = !!L.miaG; out.quest = L.quest && L.quest.st;
    // quest: fly to Zoe, then Jake
    const go = async (person) => { for (let i = 0; i < 6; i++) { fl.inv = 9; fl.state = 'fly'; fl.pos.copy(person.worldPos(new THREE.Vector3())).add(new THREE.Vector3(0, 1.3 * S, 0)); await fr(1); } };
    await go(L.quest.from); out.q1 = L.quest.st; out.hq = document.getElementById('hQuest').textContent;
    await go(L.quest.to); out.q2 = L.quest.st;
    // nice pass on Ollie → rel
    const ol = L.people.find(q => q.castId === 'ollie');
    for (let k = 0; k < 5; k++) { fl.inv = 9; fl.pos.copy(ol.worldPos(new THREE.Vector3())).add(new THREE.Vector3(1.0 * S, 1.2 * S, 0)); fl.vel.set(4, 0, 0); ol._passCool = 0; await fr(2); }
    out.rel = JSON.parse(JSON.stringify(Store.data.rel));
    // Mia glimpse
    const M = L.miaG; for (let i = 0; i < 5; i++) { fl.inv = 9; fl.state = 'fly'; fl.pos.copy(M.worldPos(new THREE.Vector3())).add(new THREE.Vector3(0, 1.2 * S, 0)); await fr(1); }
    out.miaFound = M.found; out.miaStore = Store.data.mia;
    // bump into jake
    const jk = L.people.find(q => q.castId === 'jake'); fl.pos.copy(jk.worldPos(new THREE.Vector3())).add(new THREE.Vector3(0, 0.9 * S, 0)); Game.fx('bump', 3); out.relJake = Store.data.rel.jake;
    return out;
  });
  console.log(JSON.stringify(r));
  await p.screenshot({ path: 'v4_class.png' });
  // catch test in gym with Leo-like sporty kid
  const r2 = await p.evaluate(async () => {
    const { Game, THREE } = window.__game; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    Game.story(6, true); await fr(2); Game.begin(); while (Game.mode !== 'play') await fr(1);
    const L = Game.level, fl = Game.flyer, S = L.S; const sp = L.people.find(q => q.sporty);
    if (!sp) return { sporty: false };
    let caught = false; for (let i = 0; i < 60 && !caught; i++) { fl.inv = 0.5; fl.state = 'fly'; if (!Game.held) { const me = sp.worldPos(new THREE.Vector3()); sp.root.updateMatrixWorld(true); const h = sp.aR.hand.getWorldPosition(new THREE.Vector3()); fl.pos.copy(sp.jumpT ? h : me.add(new THREE.Vector3(0.5 * S, 1.9 * S, 0))); } caught = !!Game.held; await fr(1); }
    let t = 0; while (Game.held && t++ < 80) await fr(1);
    return { sporty: true, caught, released: !Game.held, pos: fl.pos.toArray().map(v => +v.toFixed(1)) };
  });
  console.log(JSON.stringify(r2));
  await p.evaluate(() => { const G = window.__game.Game; G.notebook(); }); await p.waitForTimeout(1000);
  await p.evaluate(() => document.querySelectorAll('.ovhs')[0].scrollIntoView()); await p.waitForTimeout(400); await p.screenshot({ path: 'v4_nb.png' });
  await p.evaluate(() => { const { Store, Game } = window.__game; Store.data.mia = { class:1,corridor:1,library:1,canteen:1,lab:1,music:1,gym:1,boss:1 }; Game.ending(); }); await p.waitForTimeout(4500); await p.screenshot({ path: 'v4_end.png' });
  await p.evaluate(() => window.__game.Game.miaNotes()); await p.waitForTimeout(4800); await p.screenshot({ path: 'v4_notes.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
