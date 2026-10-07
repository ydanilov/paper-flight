const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 660 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  await p.evaluate(() => { const { Store, Game } = window.__game; Store.data.unlocked = 12; Store.data.ach = { gold1: 1, boss: 1 }; Game.hangar(); });
  await p.waitForTimeout(800); await p.evaluate(() => window.__game.Game.acts.decorate()); await p.waitForTimeout(800);
  const box = await p.locator('#decoCv').boundingBox();
  await p.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.45);
  await p.evaluate(() => { const G = window.__game.Game; G.deco.tool = 'flame'; G.decorate(); }); const box2 = await p.locator('#decoCv').boundingBox();
  await p.mouse.click(box2.x + box2.width * 0.35, box2.y + box2.height * 0.7);
  await p.evaluate(() => { const G = window.__game.Game; G.deco.tool = 'pen'; G.decorate(); }); const b3 = await p.locator('#decoCv').boundingBox();
  await p.mouse.move(b3.x + 150, b3.y + 200); await p.mouse.down(); await p.mouse.move(b3.x + 260, b3.y + 260, { steps: 8 }); await p.mouse.up();
  await p.waitForTimeout(800); await p.screenshot({ path: 't_deco.png' });
  console.log('deco', await p.evaluate(() => JSON.stringify({ st: window.__game.Store.data.deco.st.length, dood: !!window.__game.Store.data.deco.dood })));
  // course maker
  const r = await p.evaluate(async () => { const { Game, Store } = window.__game; const fr = (n=2) => new Promise(r => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
    Game.acts.dDone(); Game.levels(); await fr(2); Game.courses(); await fr(2); Game.cNew(); await fr(2); Game.edStart({ l: 'class' });
    while (Game.mode !== 'play') await fr(1);
    for (let i = 0; i < 4; i++) { Game.edPlace('ring'); for (let k = 0; k < 8; k++) await fr(1); }
    Game.edPlace('star'); Game.edPlace('pow');
    const n = Game.editing.r.length; Game.edSave(true);
    while (Game.mode !== 'play') await fr(1);
    const L = Game.level, fl = Game.flyer; let g = 0;
    while (!L.done && g++ < 30) { const st = L.cur, it = st.items[L.item]; fl.inv = 5; fl.pos.copy(it.p).addScaledVector(it.n, -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, 0.3); await fr(2); }
    await new Promise(r => setTimeout(r, 2600));
    return { rings: n, done: L.done, code: document.querySelector('#scr .code') && document.querySelector('#scr .code').value.slice(0, 30), courses: Store.data.courses.length };
  });
  console.log(JSON.stringify(r)); await p.screenshot({ path: 't_course.png' });
  const r2 = await p.evaluate(async () => { const { Game } = window.__game; const code = Game.customDef.custom.code; Game.title(); Game.courses(); document.getElementById('codeIn').value = code; Game.acts.cImport(); await new Promise(r => setTimeout(r, 500)); return { mode: Game.mode, custom: !!Game.customDef }; });
  console.log(JSON.stringify(r2));
  await p.evaluate(() => window.__game.Game.title()); await p.waitForTimeout(300);
  await p.evaluate(() => window.__game.Game.courses()); await p.waitForTimeout(800); await p.screenshot({ path: 't_courses.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
