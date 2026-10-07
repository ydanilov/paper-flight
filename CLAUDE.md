# Paper Flight — guide for Claude

You are continuing **Paper Flight**, a 3D paper-airplane game built with Claude for **Yura (GitHub: ydanilov)**. This file is everything you need: what the game is today, how the code is organised, how to change and test it safely, how to publish it, how to work with Yura, and the style to keep.

---

## 1. The game in one minute
Friday, 3:14 pm. Sam writes "Mia — meet me at the old oak after the bell?" but Mia has already slipped out. You fold the note into a paper plane and fly it across the school, room by room, before the last bell at 3:30. Each room is a level; each level is a short sequence of stages (rings → pages/stars → landing or exit).

- **Tech:** one self-contained HTML file, three.js **0.160.0** from jsDelivr via an importmap, Google Fonts (Gochi Hand, Fredoka). No build step, no other dependencies. ~600 KB, ~6,800 lines.
- **Runs as:** a claude.ai Artifact (primary) — https://claude.ai/artifact/ASWMKtcDZLsPkDhT4NVWuQ — and as a plain page (`index.html`).
- **Saves:** `localStorage['paperflight.save.v1']`, ghosts in `localStorage['paperflight.ghost.<levelId>']`. Saves are per-origin, so the artifact must always be republished to **the same URL** or players lose progress.

## 2. Files in this repo
| Path | What |
|---|---|
| `src.html` | **The source of truth.** Artifact body: starts at `<title>`, no doctype/html/head/body (the Artifact tool adds the skeleton). Edit this. |
| `index.html` | Same content wrapped as a full HTML page, for opening locally / GitHub Pages. Regenerate with `tools/build-index.sh`; never edit by hand. |
| `tools/` | Headless test harness (Playwright) + `package.json`. See §6. |
| `CLAUDE.md` | This guide. Update it when you add systems. |

## 3. Everything the game has right now

### Levels
Story (9, unlocked in order): **class** Classroom 5B · **corridor** East Corridor · **library** · **canteen** · **lab** Chemistry Lab · **music** Music Room · **gym** · **boss** Main Hall (Principal Grimsby) · **yard** Schoolyard (the ending).
Bonus (unlocked after the story): **art** Art Room (paint clouds tint and mix on the wings) · **roof** Rooftop at night (thermals, pigeons, meteors, telescope deck) · **bus** The Bus Home (moving bus, turns/brakes push you) · **town** The Town (Elm Street shops, cars, fountain, clock tower, park, Mia's house #14 — exit through her window).
Plus **Golden Hour** free flight, the **Course maker** (custom levels), **Daily flight**, **Marathon**.

Each level def: `{ id, name, place, seed, gold, silver, ceil, outdoor?, bonus?, story:[4 lines], outro, build(L, b) }`. Stage kinds: `rings`, `hoops`, `pages`, `land`, `exit`. 3 hidden stars per level; medals by time (gold/silver par).
**Boss:** Grimsby swings a butterfly net (dodge when raised) and slams the floor (stay high); 3 phases (grab notes → pillar loop → ring the bell).

### Crafts (Hangar) — each has a Gust ability
Dart (speed boost) · Glider (soar, thermals ×2) · Swallow (dodge-roll dash, ignores swats) · Paper Boat (sails floors, can't fly) · Paper Ball (jump / ground-pound, bounces) · Spinner (maple seed, hovers).
Skins unlock by stars and achievements; a **Decorator** (Hangar → ✎) adds stickers and doodles composited onto the paper texture (`Deco.tex`).

### People and life
- `Person` objects with acts: talk, point, cheer, duck, shush, hi5, sleep, pass, catch… Bubbles via `say()`, each with a babble voice.
- **Named classmates** `CAST` (Jake the joker, Priya the facts girl, Zoe Mia's best friend, Leo the catcher, Tom the sleeper, Ana the artist, Ollie the shy fan) placed per level by `CAST_IN`. **Teachers** `TEACHERS`/`TEACH_IN` (Ms. Hart, Mr. Ellis, Mrs. Okafor, Mrs. Bell, Mr. Petrenko, Mr. Lieu, Coach Brandt, Mr. Moss, Ms. Rivera, Dr. Sato, Gus the janitor) + Grimsby.
- **Remember you** (`rel`): close fast passes raise a classmate's opinion, bumps/crashes lower it → fans cheer your name and relaunch you after a crash; grumpy ones try to catch you and throw you away.
- **Social director** `Social`: conversations from `CONVOS`/`CONVOS_BY`, note passing, high-fives, sleepy kids, teacher shushes, cheer contagion.
- **Talk content:** `LEVEL_CHAT` ambient lines, **Overheard** special lines (`SPECIALS` + `SP_MORE`, 10 per level, tied to moments like start/first stage/first star/trouble/finish/power-up/near miss/skim/craft swap/fly-by), **running jokes** `JOKES` (multi-part stories advancing once per level), `reactLine` comments on your craft/paint/speed.
- **Mini-quests** `QUESTS` (deliver something between two people), **Mia side-story** `MIA_SPOTS` (find Mia off-route in 8 rooms → secret "Mia's notes").
- **Cutscenes** `CUTS`: 4–5 lines before each level's story card, shown once, skippable, replayable.

### Systems
Difficulty (Easy/Normal/Hardcore + Practice profile) · power-ups (Tailwind, Magnet, Shield) · skim bonus (fly close to surfaces) · **ghost** of best run with splits and top 5 · ~45 achievements + stats in **Sam's Notebook** (also lists Overheard lines and jokes) · Daily flight with a twist (`MODS`) · challenge modes on the story card (Normal / **Time attack** / **Iron paper**) · Marathon · 2-player split screen (race/co-op) · keyboard, mouse, touch, gamepad · per-level music themes (`THEMES`) · bloom post effect · settings for quality, camera, sensitivity, audio, etc.

### Save data (`Store.data`)
settings, unlocked, best, skin, plane, stats, ach, heard, rel, quests, mia, jokes, top, deco, courses, daily, chal, cuts, marathonBest, mp, seenIntro. **When you add a field, default it on load** — old saves must keep working. Never rename the save key.

## 4. Code map (`src.html`)
Order: CSS → HTML overlays (title, menus/panels, HUD, touch controls) → one `<script type="module">`:
1. `Store` (~line 356) — load/save/migrate.
2. Renderer, post shader, materials, procedural textures, geometry helpers, colliders.
3. Flight model (`Flyer`), crafts, power-ups, particles, audio.
4. `LEVELS` (~2543) — story level defs with their `build`.
5. `Person` and helpers `kid()`, `seated()`, `adult()`, `sprayer()` (~3371); boss.
6. `Game` (~4273) — title → story card → begin → play → results; HUD; `Game.mode`; multiplayer.
7. **Feature blocks appended before the final `boot();`** (~6767): systems (achievements, ghost, daily, notebook, skim) → bonus levels art/roof → Social/Overheard → cast/quests/Mia/themes/splits → decorator/course maker/bus → chatter/jokes/teachers → town/cutscenes/challenges/marathon.
- Debug/test handle: `window.__game = { renderer, Game, Store, LEVELS, Input, scene, camera, THREE, DIFF, PRACTICE }`.
- Line numbers drift; search by name.

## 5. How to change things (important)
- **The file is huge — never retype it.** Change it with a small Python script that does exact, asserted replacements:
  ```python
  s = open('src.html', encoding='utf-8').read()
  def rep(old, new):
      global s
      assert s.count(old) == 1, (s.count(old), old[:80])
      s = s.replace(old, new)
  rep("\nboot();\n", "\n" + open('feature.js').read() + "\nboot();\n")
  open('src.html', 'w', encoding='utf-8').write(s)
  ```
- **Add features as new blocks before `boot();`**, wrapping existing code instead of rewriting it:
  - methods: `const _hud = Game.hud; Game.hud = function(...a){ const r = _hud.apply(this, a); /* extra */ return r; };`
  - helper functions (`kid`, `seated`, `adult`, `sprayer`) are reassigned to wrappers;
  - per-level additions: wrap a level def's `build` (`const _b = D.build; D.build = function(L, b){ _b.call(this, L, b); /* add people/lines */ };`);
  - per-frame logic: push a function to `b.dyn` inside a build.
- **New level:** make a def object, `LEVELS.push(DEF)`; bonus levels need `bonus: true`. Ending logic checks `id === 'yard'` — never `LEVELS.length - 1`. Give it story lines, outro, specials, chatter, cast/teachers, a quest and a cutscene so it matches the rest.
- **Content tables are keyed by level id** (`SPECIALS`, `SP_MORE`, `LEVEL_CHAT`, `CUTS`, `QUESTS`, `CAST_IN`, `TEACH_IN`, `THEMES`, `CONVOS_BY`): adding a level means adding an entry to each.
- Keep the attract mode (title background) passive: it must not collect pickups (`Level.passive`).
- Speech bubbles scale with camera distance; keep text short so they stay readable.
- Snapshot before a big round: `cp src.html src.backup.html` (don't commit backups).
- After editing: run the tests, regenerate `index.html`, update this file, commit.

## 6. Testing (always before publishing)
```bash
cd tools
npm install                    # three@0.160.0 + playwright
bash build-test.sh             # ../src.html -> tools/test.html, CDN three -> local node_modules
python3 -m http.server 8765 &  # serve tools/
node boot.js                   # boots the title, prints console errors
node run.js                    # all levels: teleports through every objective, reports done/errors
node run.js 0,9,12             # selected level indexes
```
- Chromium path is set to `/opt/pw-browsers/chromium` (Claude's cloud sandbox) with `--use-gl=swiftshader --enable-webgl --ignore-gpu-blocklist`. Change `executablePath` elsewhere.
- Start levels with `Game.story(i, true)` (true = skip cutscene) then `Game.begin()`, otherwise scripts hang on the cutscene.
- The Town is heavy in software GL — allow ~150 s before play; it's fine on a real GPU.
- Other scripts are focused probes (social sim, specials, menus/phone layout at 390 px, multiplayer, decorator/course maker, challenge modes) — copy them as patterns. Look at screenshots they save to judge visuals.
- Last known state: all 13 levels completable, no console errors.

## 7. Publishing
- Publish `src.html` with the Artifact tool to `https://claude.ai/artifact/ASWMKtcDZLsPkDhT4NVWuQ` (read it first from a new conversation — the tool requires a read before updating). Same URL every time.
- The published file must not include doctype/html/head/body tags.
- If the session is attached to the claude.ai project "Games", also update the project doc `claude/paper-flight.md` with what changed.

## 8. Working with Yura
- **End EVERY round with AskUserQuestion**: 3–4 questions, multiSelect, each with 3–4 concrete, exciting next features (name + one-line description). Yura usually ticks everything. Missing the questions annoys him ("where's the questions") — never skip them.
- He often leaves you to work alone ("while I'm gone"): pick sensible defaults, build big, test headless, publish, then ask.
- He writes in English or Ukrainian — reply in the language of his message. Keep chat replies short and scannable; detail goes into the game and docs.
- He likes **lots of content and life**: more lines, more characters, more reactions, more secrets. Polish and bug fixes are welcome alongside.
- Be honest about anything you skipped or couldn't verify (e.g. mirror mode was dropped: mirroring the world flips text sprites and face winding).

## 9. Style — keep it consistent

### Visual
- **Notebook paper UI:** cream paper cards (`--paper #f8f1df`, `--paper-2 #efe4c8`), blue ruled lines (`--line #a9c2e2`), red margin line (`--margin #d9584f`), punched holes, brown ink (`--ink #2b2118`, `--ink-2 #5a4a3a`). Warm sunset accents (`--sun #f2a93b`, `--sun-2 #ffcf6a`), chalkboard green (`--chalk #2f5a3e`), ok green `#4aa36a`, warn orange `#e0703a`. Dark warm background `#1a120c`.
- **Fonts:** Gochi Hand (`--f-hand`) for anything "written" — logo, story cards, notes, headings, bubbles; Fredoka (`--f-ui`) for buttons and numbers.
- Slightly rotated hand-made elements (logo −3°), soft deep shadows, no flat corporate UI. One warm look by design — no theme switcher.
- 3D world: low-poly, warm afternoon light through windows, soft colours, readable silhouettes; people are simple chunky figures with big heads and expressive acts. Golden-hour mood; night levels use moon/blue with warm window light.
- Must work on phones (390 px wide, touch controls, safe areas) and stay smooth on Low quality.

### Writing
- Story cards: 4 short lines, present tense, a little wry, kid's-eye view ("One sheet of paper. One good fold. Throw it."). Outros are one line ending with a small joke ("Nobody saw a thing. Probably.").
- Dialogue: short (under ~40 characters for bubbles), natural school talk, each character has a voice: Jake jokes, Priya states facts, Zoe protects Mia, Leo is competitive, Tom is sleepy, Ana sees colours, Ollie is shyly excited; teachers are strict but kind; Grimsby is pompous.
- Mia is always just ahead — glimpsed, never caught until the end. Keep the romance sweet and age-appropriate.
- English UI text, curly quotes and en/em dashes as in the existing text.

### Code
- Plain modern JS in one module, no frameworks. Short names in hot code (`L` level, `b` builder, `fl` flyer). Comments explain intent, not mechanics.
- Self-contained feature blocks; wrappers over edits; guards so a missing table entry never crashes a level.
- No external assets: textures, sounds and music are procedural.

## 10. Ideas to offer next
Mia's birthday party level · Sam's house level · ghost races shared by code · photo mode · dialogue choices in cutscenes · voiced lines (TTS) · Sam's diary between levels · weather (rain, wind) · new boss phases · more crafts · accessibility (colour-blind, reduced motion, one-button mode) · tuning par times with real play.
