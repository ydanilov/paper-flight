const { chromium } = require('playwright');
const li = +(process.argv[2] || 0);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack||'').split('\n')[1]));
  await p.goto('http://localhost:8765/test.html'); await p.waitForFunction(() => window.__game, null, { timeout: 60000 });
  const r = await p.evaluate(async (li) => {
    const { Game, Store } = window.__game; Store.data.unlocked = 11;
    Game.story(li, true); await new Promise(r => setTimeout(r, 300));
    document.getElementById('screens').innerHTML = '';
    const L = Game.level; let t = 100, seen = { convo: 0, sleep: 0, hi5: 0, pass: 0, lines: new Set() };
    for (let i = 0; i < 1600; i++) { t += 0.05; L.update(0.05, t, Game.flyer, 'normal'); 
      for (const q of L.people) { if (q.convo) seen.convo++; if (q.act && q.act.kind === 'sleep') seen.sleep++; if (q.act && q.act.kind === 'hi5') seen.hi5++; if (q.act && q.act.kind==='pass') seen.pass++; if (q.bubT > 0 && q.bubble.material.map) {} } }
    return { people: L.people.length, stats: { convos: Store.data.stats.convos, notes: Store.data.stats.notesPassed }, seen: { ...seen, lines: undefined }, active: L._social.convos.length };
  }, li);
  console.log(JSON.stringify(r));
  await p.waitForTimeout(4000); await p.screenshot({ path: `soc_${li}.png` });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
