// Phone/tablet layout probe: 390x844 portrait, 844x390 landscape, 768x1024 tablet (touch).
// Checks: no horizontal overflow on menus, touch flight controls don't overlap the HUD, touch targets >= 44px,
// rotate prompt appears in portrait gameplay (and "fly upright anyway" dismisses it), not in landscape/tablet.
// Screens go to tools/shots/.   usage: node mobile.js
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('shots', { recursive: true });
const VIEWS = [['phone_portrait', 390, 844], ['phone_landscape', 844, 390], ['tablet', 768, 1024]];
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
  for (const [vn, w, h] of VIEWS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto('http://localhost:8765/test.html');
    await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
    await p.evaluate(() => { const G = window.__game; G.Store.data.unlocked = 16; G.Store.data.seenIntro = true; G.Store.data.cuts = Object.fromEntries(G.LEVELS.map((L) => [L.id, 1])); G.Store.data.settings.quality = 'low'; G.Store.save(); window.dispatchEvent(new Event('resize')); G.Input.device = 'touch'; document.body.classList.add('is-touch'); G.Game.title(); });
    await p.waitForTimeout(1500);
    // menus: nothing wider than the screen, every control big enough to tap
    for (const [n, fn] of [['title', 'title()'], ['levels', 'levels()'], ['hangar', 'hangar()'], ['settings', "settings('title')"], ['notebook', 'notebook()'], ['courses', 'courses()'], ['ending', 'ending()']]) {
      await p.evaluate((f) => eval('window.__game.Game.' + f), fn); await p.waitForTimeout(900);
      const r = await p.evaluate(() => {
        const W = window.innerWidth; const scr = document.getElementById('scr');
        const wide = [...document.querySelectorAll('#scr *')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > W + 1 || b.left < -1) && !e.closest('.roll'); }).map((e) => e.className || e.tagName).slice(0, 4);
        const small = [...document.querySelectorAll('#scr [data-nav]')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.height < 43.5 || b.width < 43.5); }).map((e) => (e.className + ' ' + e.textContent).slice(0, 30)).slice(0, 4);
        return { hscroll: document.documentElement.scrollWidth > W || (scr && scr.scrollWidth > scr.clientWidth + 1), wide, small };
      });
      ok(!r.hscroll && !r.wide.length, `${vn} ${n}: no horizontal overflow ${r.wide.join(',')}`);
      ok(!r.small.length, `${vn} ${n}: touch targets >= 44px ${r.small.join(' | ')}`);
      await p.screenshot({ path: `shots/m_${vn}_${n}.png` });
    }
    // gameplay: rotate prompt + HUD vs touch controls
    await p.evaluate(() => { const G = window.__game.Game; G.story(7, true); G.begin(); });
    await p.waitForTimeout(2500);
    const rot = await p.evaluate(() => document.getElementById('rotate').classList.contains('on'));
    if (vn === 'phone_portrait') {
      ok(rot, `${vn}: rotate prompt shown in portrait gameplay`);
      await p.screenshot({ path: `shots/m_${vn}_rotate.png` });
      await p.tap('#rotAny'); await p.waitForTimeout(500);
      ok(!(await p.evaluate(() => document.getElementById('rotate').classList.contains('on'))), `${vn}: "fly upright anyway" dismisses it`);
    } else ok(!rot, `${vn}: no rotate prompt`);
    await p.waitForFunction(() => ['play', 'countdown'].includes(window.__game.Game.mode), null, { timeout: 120000 });
    await p.evaluate(() => { const G = window.__game.Game; G.mode = 'play'; G.flyer.tailT = 5; G.flyer.shield = 1; window.__game.Game.hud(0.016); const U = window.__game.Game; ['hHint', 'hToast', 'hSpecial', 'hQuest', 'hSplit'].forEach((id) => document.getElementById(id).classList.add('on')); document.getElementById('hHint').textContent = 'A hint about the boss'; document.getElementById('hToast').textContent = 'Back at the checkpoint'; document.getElementById('hSpecial').innerHTML = '<span class="sl">Overheard</span><span class="sq">Jake: nice flying!</span>'; document.getElementById('hQuest').innerHTML = 'Favour: <b>Zoe → Jake</b>'; document.getElementById('hSplit').textContent = '-1.2 s'; });
    await p.waitForTimeout(600);
    const ov = await p.evaluate(() => {
      const box = (id) => { const e = document.getElementById(id); if (!e || e.hidden || getComputedStyle(e).display === 'none') return null; const b = e.getBoundingClientRect(); return b.width ? b : null; };
      const hud = ['hObj', 'hTime', 'hGauge', 'hRight', 'hPow', 'hBoss', 'hHint', 'hSpecial', 'hQuest', 'hSplit', 'hToast', 'hCtrl'], tch = ['tGust', 'tBrake', 'tSwap', 'tPause'];
      const hit = (a, b) => a.left < b.right - 1 && b.left < a.right - 1 && a.top < b.bottom - 1 && b.top < a.bottom - 1;
      const out = [], W = innerWidth, H = innerHeight;
      for (const t of tch) { const tb = box(t); if (!tb) { out.push(t + ' missing'); continue; } if (tb.right > W || tb.bottom > H || tb.left < 0 || tb.top < 0) out.push(t + ' offscreen');
        for (const hd of hud) { const hb = box(hd); if (hb && hit(tb, hb)) out.push(`${t}×${hd}`); } }
      for (const hd of hud) { const hb = box(hd); if (hb && (hb.right > W + 1 || hb.left < -1)) out.push(hd + ' offscreen'); }
      // HUD pieces overlapping each other (the ones that always show)
      const fixed = ['hObj', 'hTime', 'hGauge', 'hRight', 'hBoss'];
      for (let i = 0; i < fixed.length; i++) for (let j = i + 1; j < fixed.length; j++) { const a = box(fixed[i]), c = box(fixed[j]); if (a && c && hit(a, c)) out.push(`${fixed[i]}×${fixed[j]}`); }
      return out;
    });
    ok(!ov.length, `${vn}: HUD and touch controls don't overlap ${ov.join(', ')}`);
    await p.screenshot({ path: `shots/m_${vn}_play.png` });
    ok(!errs.length, `${vn}: no console errors ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all mobile checks passed');
  process.exit(fails ? 1 : 0);
})();
