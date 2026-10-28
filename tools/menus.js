// Menu walk: every menu and state, desktop + phone, screenshots into tools/shots/.
// Asserts: no page errors, all 5 illustrations load, a visible keyboard focus ring, art behind the right screens,
// locked/new/equipped/empty states present.   usage: node menus.js [desktop|mobile|all]
const { chromium } = require('playwright');
const fs = require('fs');
const which = process.argv[2] || 'all';
fs.mkdirSync('shots', { recursive: true });
const VIEWS = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844, touch: true } };
let fails = 0; const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) fails++; };

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  for (const [vn, V] of Object.entries(VIEWS)) {
    if (which !== 'all' && which !== vn) continue;
    const ctx = await b.newContext({ viewport: { width: V.width, height: V.height }, hasTouch: !!V.touch, isMobile: !!V.touch });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n').slice(0, 3).join(' | ')));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    const bad = []; p.on('response', (r) => { if (/assets\//.test(r.url()) && r.status() >= 400) bad.push(r.url()); });
    await p.goto('http://localhost:8765/test.html');
    await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
    const T0 = Date.now(); const shot = async (n, wait = 700) => { if (process.env.VERBOSE) console.log('  ' + n + ' @' + ((Date.now() - T0) / 1000).toFixed(0) + 's'); await p.waitForTimeout(wait); await p.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))); await p.waitForTimeout(450); await p.screenshot({ path: `shots/${vn}_${n}.png`, timeout: 90000 }); };
    const go = async (n, fn, wait) => { await p.evaluate(fn); await shot(n, wait); };
    const art = () => p.evaluate(() => ({ cur: window.__art.cur, st: window.__art.st[window.__art.cur], scr: document.getElementById('scr')?.className || '' }));
    // fresh save: empty states
    await p.evaluate(() => { localStorage.clear(); const G = window.__game; G.Store.load(); G.Store.data.seenIntro = true; G.Store.data.settings.quality = 'low'; window.dispatchEvent(new Event('resize')); G.Store.save(); G.Game.title(); });
    await p.waitForFunction(() => window.__art.st.title === 'ok' || window.__art.st.title === 'fail', null, { timeout: 15000 });
    await shot('01_title_fresh', 1200);
    ok((await art()).cur === 'title', `${vn}: title art shown`);
    await go('02_levels_empty', () => window.__game.Game.levels(), 1200);
    ok(await p.$('#scr .empty') !== null, `${vn}: levels empty state`);
    ok(await p.$('#scr .card.locked .lockn') !== null, `${vn}: locked level shows requirement`);
    ok((await art()).cur === 'map', `${vn}: level select over the map`);
    await go('03_courses_empty', () => window.__game.Game.courses(), 900);
    ok(await p.$('#scr .cnone') !== null, `${vn}: course maker empty state`);
    await go('04_notebook_empty', () => window.__game.Game.notebook(), 1000);
    ok(await p.$('#scr .empty-ink') !== null, `${vn}: notebook empty state`);
    // all five illustrations load
    const loaded = await p.evaluate(async () => { const A = window.__art; const names = ['title', 'map', 'grimsby', 'diary', 'ending']; const r = await Promise.all(names.map((n) => A.load(n))); return names.map((n, i) => [n, r[i], A.img[n].naturalWidth]); });
    for (const [n, r, w] of loaded) ok(r && w > 0, `${vn}: image ${n} loaded (${w}px)`);
    ok(!bad.length, `${vn}: no failed asset requests ${bad.join(' ')}`);
    // progress: unlocks, new badges, equipped, locked paper
    await p.evaluate(() => { const G = window.__game, S = G.Store.data; S.unlocked = 11; S.best = { class: { time: 30, stars: [1, 1, 0], medal: 'gold', score: 900 } }; S.ach = { first: 1 }; S.stats = { levels: 3, dist: 2000 }; S.diary = { class: 1 }; G.Store.save(); G.Game.title(); });
    await shot('05_title_new', 900);
    ok(await p.$('#scr .menu .newdot') !== null, `${vn}: "new" badge on title menu`);
    // keyboard focus ring (desktop: real keys; mobile skips)
    if (!V.touch) {
      await p.mouse.move(5, 5); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(250); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(350);
      const ring = await p.evaluate(() => { const el = document.querySelector('#scr .focus'); const cs = el && getComputedStyle(el); return { kb: document.body.classList.contains('kbnav'), outline: cs && cs.outlineStyle, w: cs && cs.outlineWidth, active: document.activeElement === el }; });
      ok(ring.kb && ring.outline === 'solid' && parseFloat(ring.w) >= 2 && ring.active, `${vn}: keyboard focus ring visible ${JSON.stringify(ring)}`);
      await shot('06_title_focus', 200);
      await p.hover('#scr .menu .btn:nth-child(3)'); await p.mouse.down(); await shot('07_title_pressed', 80); await p.mouse.up();
      await p.mouse.move(5, 5); await p.evaluate(() => window.__game.Game.title());
      // tab reaches every control on the level select
      await p.evaluate(() => window.__game.Game.levels()); await p.waitForTimeout(500);
      const tabbable = await p.evaluate(() => [...document.querySelectorAll('#scr [data-nav]')].every((e) => e.tabIndex >= 0));
      ok(tabbable, `${vn}: every menu control is tabbable`);
    }
    await go('08_levels', () => window.__game.Game.levels(), 1000);
    ok(await p.$('#scr .card .newb') !== null, `${vn}: NEW badge on unlocked level`);
    if (!V.touch) { await p.keyboard.press('ArrowDown'); await shot('09_levels_focus', 300); }
    await go('10_hangar', () => window.__game.Game.hangar(), 1000);
    ok(await p.$('#scr .pcard.chosen') !== null && await p.$('#scr .sw.lock') !== null, `${vn}: hangar equipped + locked paper`);
    await go('11_decorate', () => window.__game.Game.decorate(), 900);
    await go('12_settings', () => window.__game.Game.settings('title'), 800);
    await go('13_confirm', () => window.__game.Game.newGameConfirm(), 700);
    await go('14_daily', () => window.__game.Game.dailyScreen(), 900);
    await go('15_mp', () => window.__game.Game.mpSetup(), 700);
    // boss intro over Grimsby
    await go('16_boss_intro', () => { const G = window.__game; G.Store.data.cuts = Object.assign(G.Store.data.cuts || {}, { boss: 1 }); G.Game.story(7); }, 1500);
    ok((await art()).cur === 'grimsby' && await p.$('#scr .bossintro') !== null, `${vn}: boss intro over pf_grimsby`);
    await go('17_boss_story', () => window.__game.Game.acts.bossGo(), 1000);
    // cutscene choice
    await p.evaluate(() => { const G = window.__game; delete G.Store.data.cuts.class; G.Game.story(0); });
    for (let i = 0; i < 80; i++) { const done = await p.evaluate(() => { const G = window.__game.Game; if (document.querySelector('[data-act=pickChoice]')) return true; if (G.cut) G.cut.t = Math.max(G.cut.t, G.cut.next); return false; }); if (done) break; await p.waitForTimeout(250); }
    await shot('18_cut_choice', 500);
    ok(await p.$('[data-act=pickChoice]') !== null, `${vn}: cutscene choice shown`);
    await p.evaluate(() => window.__game.Game.acts.skipCut());
    await shot('19_story', 900);
    // fly level 0 to the results card
    await p.evaluate(async () => {
      const { Game } = window.__game; const fr = (n = 2) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
      if (window.__rot) window.__rot.allow = true; Game.story(0, true); await fr(2); Game.begin(); const t0 = performance.now(); while (Game.mode !== 'play' && performance.now() - t0 < 60000) await fr(1);
      const L = Game.level, fl = Game.flyer; let g = 0;
      while (!L.done && g++ < 60) { const st = L.cur; fl.inv = 5; fl.state = 'fly';
        if (st.kind === 'rings' || st.kind === 'hoops') { const it = st.items[L.item]; fl.pos.copy(it.p).addScaledVector(it.n, -0.3); L.prev.copy(fl.pos); await fr(1); fl.pos.copy(it.p).addScaledVector(it.n, 0.3); await fr(2); }
        else if (st.kind === 'pages') { fl.pos.copy(L.target()); await fr(2); }
        else if (st.kind === 'land') { fl.pos.copy(L.target()).add({ x: 0, y: 0.2, z: 0 }); fl.state = 'landed'; await fr(2); }
        else { fl.pos.copy(st.center); await fr(2); } }
    });
    await p.waitForFunction(() => window.__game.Game.mode === 'results', null, { timeout: 60000 });
    await shot('20_results', 1500);
    ok((await art()).cur === 'diary' && await p.$('#scr .dpage') !== null, `${vn}: results over pf_diary with a diary page`);
    // pause menu (from a running level)
    await p.evaluate(() => { const G = window.__game.Game; G.begin(); });
    await p.waitForFunction(() => ['countdown', 'play'].includes(window.__game.Game.mode), null, { timeout: 60000 });
    await p.evaluate(() => window.__rot && (window.__rot.allow = true));
    await go('21_pause', () => window.__game.Game.pauseMenu(), 800);
    await go('22_pause_settings', () => window.__game.Game.settings('pause'), 700);
    await go('23_notebook', () => window.__game.Game.notebook(), 1200);
    await p.evaluate(() => { const d = [...document.querySelectorAll('#scr .ovt')].find((e) => /diary/i.test(e.textContent)); d && d.scrollIntoView(); });
    await shot('24_notebook_diary', 400);
    await go('25_ending', () => window.__game.Game.ending(), 2500);
    ok((await art()).cur === 'ending' && await p.$('#scr .roll') !== null, `${vn}: ending illustration + credits roll`);
    await go('26_title_back', () => window.__game.Game.title(), 900);
    // graceful fallback: a broken image path leaves the 3D scene and no errors
    const fall = await p.evaluate(async () => { const A = window.__art; A.st.map = 'fail'; A.set(null); window.__game.Game.levels(); const r = { cur: A.cur }; A.st.map = 'ok'; return r; });
    ok(fall.cur === null, `${vn}: failed image falls back to the 3D scene`);
    ok(!errs.length, `${vn}: no console errors ${errs.join('\n')}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all menu checks passed');
  process.exit(fails ? 1 : 0);
})();
