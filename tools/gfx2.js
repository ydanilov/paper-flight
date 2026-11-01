// v14 probe: portraits (cutscene, choice, story card, boss intro, Mia's notes, Overheard), painted skins in the hangar,
// the pf_map2 level map with pins — desktop, phone portrait and phone landscape — plus a run with the new art blocked
// (fallbacks). Screens: tools/shots/g2_*.png.   usage: node gfx2.js [views]   views: desktop,phone,land,blocked
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('shots', { recursive: true });
const views = (process.argv[2] || 'desktop,phone,land,blocked').split(',');
const V = { desktop: [1440, 900, false], phone: [390, 844, true], land: [844, 390, true], blocked: [1440, 900, false] };
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  for (const vn of views) {
    const [w, h, touch] = V[vn]; const blocked = vn === 'blocked';
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: touch });
    if (blocked) await ctx.route(/assets\/(ui\/|pf_map2)/, (r) => r.abort());
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto('http://localhost:8765/test.html');
    await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
    const settle = async (ms = 900) => { await p.waitForTimeout(ms); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); };
    const imgsOk = (sel) => p.evaluate(async (sel) => { const ims = [...document.querySelectorAll(sel)]; await Promise.all(ims.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = im.onerror = r; setTimeout(r, 8000); })))); return ims.length && ims.every((im) => im.naturalWidth > 0); }, sel);
    await p.evaluate(() => { const G = window.__game, S = G.Store.data; S.settings.quality = 'low'; S.unlocked = 12; S.seenIntro = true; S.best = { class: { time: 30, stars: [1, 1, 0], medal: 'gold', score: 900 }, corridor: { time: 40, stars: [1, 0, 0], medal: 'silver', score: 500 } }; S.skin = 'grid'; S.cuts = Object.fromEntries(G.LEVELS.map((L) => [L.id, 1])); delete S.cuts.class; G.Store.save(); window.dispatchEvent(new Event('resize')); if (window.__rot) window.__rot.allow = true; });
    // level map
    await p.evaluate(() => window.__game.Game.levels());
    await p.waitForFunction(() => window.__art.st.map2 && window.__art.st.map2 !== 'loading', null, { timeout: 20000 });
    await settle(1500);
    const lv = await p.evaluate(() => { const box = document.getElementById('lvPins'), vis = box && getComputedStyle(box).display !== 'none';
      const on = box && box.querySelector('.pin.on'); const pins = box ? [...box.querySelectorAll('.pin')] : [];
      const out = pins.filter((q) => { const r = q.getBoundingClientRect(); return vis && (r.left < -2 || r.right > innerWidth + 2 || r.top < -2 || r.bottom > innerHeight + 2); }).map((q) => q.dataset.i);
      // a pin's needle tip must sit on its % of the drawn picture
      let err = 0; const im = window.__art.img.map2; if (vis && im && im.naturalWidth) { const k = Math.max(innerWidth / im.naturalWidth, innerHeight / im.naturalHeight), dw = im.naturalWidth * k, dh = im.naturalHeight * k; const x0 = (innerWidth - dw) / 2, y0 = (innerHeight - dh) / 2; const q = pins[0], L = window.__game.LEVELS[+q.dataset.i]; const r = q.getBoundingClientRect(); const tipX = r.left + r.width / 2, tipY = r.top + 40; const at = { class: [12, 32] }[L.id] || [0, 0]; err = Math.hypot(tipX - (x0 + dw * at[0] / 100), tipY - (y0 + dh * at[1] / 100)); }
      return { art: window.__art.cur, vis, n: pins.length, lv: window.__game.LEVELS.length, on: on && on.dataset.i, locked: box ? box.querySelectorAll('.pin.lock').length : 0, out, err: Math.round(err) }; });
    if (blocked) ok(lv.art === 'map' && !lv.vis, `${vn}: map2 blocked → old pf_map, card grid, no pins ${JSON.stringify(lv)}`);
    else if (vn === 'desktop') ok(lv.art === 'map2' && lv.vis && lv.n === lv.lv && lv.on != null && lv.locked > 0 && !lv.out.length && lv.err <= 3, `${vn}: map2 with ${lv.n} pins on the picture, focused pin glows ${JSON.stringify(lv)}`);
    else ok(lv.art === 'map2' && !lv.vis, `${vn}: map2 backdrop, card list (pins hidden) ${JSON.stringify(lv)}`);
    await p.screenshot({ path: `shots/g2_${vn}_levels.png` });
    if (vn === 'desktop') { await p.mouse.move(2, 2); await p.keyboard.press('ArrowLeft'); await settle(200); await p.keyboard.press('ArrowLeft'); await settle(400);
      const mv = await p.evaluate(() => document.querySelector('#lvPins .pin.on')?.dataset.i);
      ok(+mv === +lv.on - 2, `${vn}: ← moves along the strip and the pin follows (${lv.on} → ${mv})`);
      await p.screenshot({ path: `shots/g2_${vn}_levels_focus.png` }); }
    // hangar
    await p.evaluate(() => window.__game.Game.hangar()); await settle(1200);
    const hg = await p.evaluate(() => { const sw = [...document.querySelectorAll('#scr .sw')]; return { n: sw.length, art: sw.filter((e) => e.classList.contains('art') && /pf_s_/.test(e.style.backgroundImage) && /data:image/.test(e.style.backgroundImage)).length, lock: sw.filter((e) => e.classList.contains('lock')).length, sel: (sw.find((e) => e.classList.contains('sel')) || {}).dataset?.k }; });
    ok(hg.art === 12 && hg.lock > 0 && hg.sel === 'grid', `${vn}: hangar skins painted (with paper fallback layer), locked + equipped ${JSON.stringify(hg)}`);
    if (!blocked) ok(await p.evaluate(async () => { const urls = [...document.querySelectorAll('#scr .sw.art')].map((e) => /url\("?([^")]+pf_s_[^")]+)/.exec(e.style.backgroundImage)[1]); const r = await Promise.all(urls.map((u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth > 0); im.onerror = () => res(false); im.src = u; }))); return r.every(Boolean); }), `${vn}: all 12 skin pictures load`);
    await p.screenshot({ path: `shots/g2_${vn}_hangar.png` });
    // boss intro
    await p.evaluate(() => { const G = window.__game; G.Game.story(G.LEVELS.findIndex((L) => L.id === 'boss')); }); await settle(1500);
    if (blocked) ok(await p.$('.bossintro .face.sil') !== null, `${vn}: boss intro falls back to a silhouette`);
    else ok(await imgsOk('.bossintro .face img'), `${vn}: Grimsby polaroid on the boss intro`);
    await p.screenshot({ path: `shots/g2_${vn}_boss.png` });
    // cutscene → choice → reply → story card
    await p.evaluate(() => window.__game.Game.story(0));
    for (let i = 0; i < 40; i++) { const k = await p.evaluate(() => { const C = window.__game.Game.cut; if (C && C.k >= 1) return true; if (C) C.t = Math.max(C.t, C.next); return false; }); if (k) break; await p.waitForTimeout(250); }
    await settle(600);
    const cutFace = await p.evaluate(() => ({ who: document.getElementById('cutWho')?.textContent, id: document.querySelector('.cutin > .face')?.dataset.id }));
    if (blocked) ok(await p.$('.cutin > .face.sil') !== null, `${vn}: cutscene speaker silhouette when art is blocked`);
    else ok(cutFace.id && cutFace.id !== '?' && await imgsOk('.cutin > .face img'), `${vn}: cutscene portrait follows the speaker ${JSON.stringify(cutFace)}`);
    await p.screenshot({ path: `shots/g2_${vn}_cut.png` });
    for (let i = 0; i < 80; i++) { const k = await p.evaluate(() => { const G = window.__game.Game; if (document.querySelector('[data-act=pickChoice]')) return true; if (G.cut) G.cut.t = Math.max(G.cut.t, G.cut.next); return false; }); if (k) break; await p.waitForTimeout(250); }
    await settle(600);
    const ch = await p.evaluate(() => ({ asker: document.querySelector('.cutin > .face')?.dataset.id, sam: document.querySelector('.cutin .chs > .face')?.dataset.id }));
    ok(ch.asker && ch.sam === 'sam', `${vn}: choice shows who asks and Sam ${JSON.stringify(ch)}`);
    await p.screenshot({ path: `shots/g2_${vn}_choice.png` });
    await p.evaluate(() => window.__game.Game.pickChoice(1)); await settle(500);
    ok(await p.evaluate(() => document.querySelector('.cutin > .face')?.dataset.id === 'sam'), `${vn}: Sam's reply has Sam's portrait`);
    await p.evaluate(() => window.__game.Game.acts.skipCut()); await settle(900);
    ok(await p.$('.said > .face') !== null, `${vn}: story card “what Sam said” has Sam`);
    await p.screenshot({ path: `shots/g2_${vn}_story.png` });
    // Mia's notes
    await p.evaluate(() => window.__game.Game.miaNotes()); await settle(900);
    ok(await p.$('.story > .face.corner[data-id="mia"]') !== null, `${vn}: Mia's notes carry Mia's polaroid`);
    await p.screenshot({ path: `shots/g2_${vn}_mianotes.png` });
    // Overheard during play (desktop only — slow in software GL)
    if (vn === 'desktop') {
      await p.evaluate(() => { const G = window.__game.Game; G.story(0, true); G.begin(); });
      await p.waitForFunction(() => window.__game.Game.mode === 'play', null, { timeout: 180000, polling: 500 });
      await p.evaluate(() => { const G = window.__game.Game; G._sp = G._sp.map(() => 0); G.special('star'); });
      await settle(500);
      const sp = await p.evaluate(() => ({ on: document.getElementById('hSpecial').classList.contains('on'), id: document.querySelector('#hSpecial > .face')?.dataset.id }));
      ok(sp.on && !!sp.id, `${vn}: Overheard line shows who said it ${JSON.stringify(sp)}`);
      await p.screenshot({ path: `shots/g2_${vn}_overheard.png` });
    }
    ok(!errs.length, `${vn}: no console errors ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all v14 checks passed');
  process.exit(fails ? 1 : 0);
})();
