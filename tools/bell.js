// "Missed the bell" probe: Time attack on Classroom 5B, run the clock out → pfv_bell plays (forced on) → the "Time's up!"
// retry card; a second time-out on the same level goes straight to the card; with the clip blocked → straight to the card.
// usage: node bell.js
const { chromium } = require('playwright');
const fs = require('fs'); fs.mkdirSync('shots', { recursive: true });
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  for (const blocked of [false, true]) {
    const tag = blocked ? 'blocked' : 'play';
    const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
    if (blocked) await ctx.route(/pfv_bell\.mp4/, (r) => r.abort());
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED/.test(m.text())) errs.push('CONSOLE ' + m.text()); });
    await p.goto('http://localhost:8765/test.html');
    await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
    await p.evaluate(() => { const G = window.__game, S = G.Store.data; S.settings.quality = 'low'; S.cuts = Object.fromEntries(G.LEVELS.map((L) => [L.id, 1])); G.Store.save(); window.__bell.force = true; });
    const timeOut = async () => {
      await p.evaluate(() => { const G = window.__game.Game; G.challenge = 'time'; G.story(0, true); G.begin(); G.holdT = 0.05; });
      await p.waitForFunction(() => window.__game.Game.mode === 'play', null, { timeout: 300000, polling: 500 });
      await p.evaluate(() => { window.__game.Game.taLeft = 0.01; });
    };
    await timeOut();
    ok(await p.evaluate(() => !!(window.__bell.v && /pfv_bell/.test(window.__bell.v.src))), `${tag}: clip preloaded when the Time-attack run started`);
    if (!blocked) {
      const st = await p.waitForFunction(() => { const B = window.__bell; return B.on && B.st === 'playing' && B.v.currentTime > 1.2 ? { t: B.v.currentTime, muted: B.v.muted } : false; }, null, { timeout: 60000, polling: 200 }).then((h) => h.jsonValue()).catch(() => null);
      ok(!!st, `${tag}: the bell clip plays ${JSON.stringify(st)}`);
      ok(await p.evaluate(() => !document.querySelector('#scr .res')), `${tag}: no retry card while it plays`);
      await p.screenshot({ path: 'shots/bell_playing.png' });
      await p.keyboard.press('Space');
    }
    await p.waitForFunction(() => !window.__bell.on && /Time’s up/.test(document.querySelector('#scr .res .ttl')?.textContent || ''), null, { timeout: 30000, polling: 250 }).catch(() => {});
    ok(await p.evaluate(() => /Time’s up/.test(document.querySelector('#scr .res .ttl')?.textContent || '') && !!document.querySelector('[data-act="restart"]')), `${tag}: then the “Time’s up!” retry card`);
    await p.screenshot({ path: `shots/bell_${tag}_card.png` });
    if (!blocked) {
      await timeOut(); await p.waitForTimeout(800);
      ok(await p.evaluate(() => !window.__bell.on && /Time’s up/.test(document.querySelector('#scr .res .ttl')?.textContent || '')), `${tag}: second time-out on the same level goes straight to the card`);
    }
    ok(!errs.length, `${tag}: no console errors ${errs.join(' | ')}`);
    await ctx.close();
  }
  await b.close();
  console.log(fails ? `${fails} FAILED` : 'all bell checks passed');
  process.exit(fails ? 1 : 0);
})();
