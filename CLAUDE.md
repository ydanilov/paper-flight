# Paper Flight — guide for Claude

You are continuing **Paper Flight**, a 3D paper-airplane game **by Diego Danylov** (Yura's son), built with Claude. You work with **Yura (GitHub: ydanilov)**. Credit the game to Diego Danylov everywhere (title byline, ending credits, meta author, README). This file is everything you need: what the game is today, how the code is organised, how to change and test it safely, how to publish it, how to work with Yura, and the style to keep.

---

## 1. The game in one minute
Friday, 3:14 pm. Sam writes "Mia — meet me at the old oak after the bell?" but Mia has already slipped out. You fold the note into a paper plane and fly it across the school, room by room, before the last bell at 3:30. Each room is a level; each level is a short sequence of stages (rings → pages/stars → landing or exit).

- **Tech:** one HTML file, three.js **0.160.0** from jsDelivr via an importmap, Google Fonts (Gochi Hand, Fredoka), plus five storybook illustrations in `assets/`. No build step. ~830 KB, ~8,900 lines.
- **Runs as:** a claude.ai Artifact — https://claude.ai/artifact/27TqcQ9ocr6Et7eq8vMzuG — and on **Vercel** at https://game-paper-flight.vercel.app (project `game-paper-flight`, auto-deploys every push to `main`, serves `index.html` from the repo root). Showcase: https://diego-games.vercel.app. (The project doc also mentions https://claude.ai/artifact/ASWMKtcDZLsPkDhT4NVWuQ, which couldn't be read; the URL above is the one to publish to.)
- **Saves:** `localStorage['paperflight.save.v1']`, ghosts in `localStorage['paperflight.ghost.<levelId>']`. Saves are per-origin, so the artifact must always be republished to **the same URL** or players lose progress.

## 2. Files in this repo
| Path | What |
|---|---|
| `src.html` | **The source of truth.** Artifact body: starts at `<title>`, no doctype/html/head/body (the Artifact tool adds the skeleton). Edit this. |
| `index.html` | Same content wrapped as a full HTML page, for opening locally / GitHub Pages. Regenerate with `tools/build-index.sh`; never edit by hand. |
| `assets/` | Five 1024×572 WebP illustrations (hand-drawn, coloured pencil + watercolour on notebook paper): `pf_title` (title backdrop), `pf_map` (level select / course maker), `pf_grimsby` (boss intro, empty right side for text), `pf_diary` (results + diary pages + notebook), `pf_ending` (ending + credits). Plus four 1376×768 sky panoramas for the 3D world (painted sky system, §4.9): `pf_sky_day`, `pf_sky_sunset`, `pf_sky_night`, `pf_sky_rain`. Referenced by **relative** paths (`assets/pf_title.webp`) so they work on Vercel, as artifact supporting files and in `tools/test.html`. |
| `tools/` | Headless test harness (Playwright) + `package.json`. See §6. |
| `README.md` | Public description, play links, controls, tests. |
| `CLAUDE.md` | This guide. Update it when you add systems. |

## 3. Everything the game has right now

### Levels
Story (9, unlocked in order): **class** Classroom 5B · **corridor** East Corridor · **library** · **canteen** · **lab** Chemistry Lab · **music** Music Room · **gym** · **boss** Main Hall (Principal Grimsby) · **yard** Schoolyard (the ending).
Bonus (unlocked after the story): **art** Art Room (paint clouds tint and mix on the wings) · **roof** Rooftop at night (thermals, pigeons, meteors, telescope deck) · **bus** The Bus Home (moving bus, turns/brakes push you) · **town** The Town (Elm Street shops, cars, fountain, clock tower, park, Mia's house #14 — exit through her window) · **party** Mia’s Party (garden behind #14: balloon arches, bouncy castle tagged `bounce`, barbecue-smoke thermal, piñata you can burst, dog Biscuit; land on the gift table next to Mia) · **home** Sam’s House (evening; loft bedroom, stairs, kitchen-soup steam thermal, ceiling-fan hazard, Mum/Dad/Gran/little sister Lily, cat + puppy Noodle; exit the front window to Mia in the street) · **rain** Rainy Day (reuses the yard build, then adds rain streaks, puddles + ripples, lightning/thunder, wind, umbrellas, ducks; rain makes the plane `wet` outside shelters — oak, bus stop, entrance canopy) · **detention** Detention (room 13, Monday 4:05 pm; Grimsby reads the paper at the front and looks up every 5–8 s — a gaze cone shows; if the plane is inside it you're spotted; pass 3 notes, 4 rings, exit through the transom window; Jake and Max in detention).
Plus **Golden Hour** free flight, the **Course maker** (custom levels), **Daily flight**, **Marathon**.

Each level def: `{ id, name, place, seed, gold, silver, ceil, outdoor?, bonus?, story:[4 lines], outro, build(L, b) }`. Stage kinds: `rings`, `hoops`, `pages`, `land`, `exit`. 3 hidden stars per level; medals by time (gold/silver par).
**Boss:** Grimsby swings a butterfly net (dodge when raised) and slams the floor (stay high); 4 phases (grab notes → pillar loop → free 3 planes from his drawer, double swings → ring the bell through the **paper storm**: 12 confiscated planes orbit the hall and knock you). `hp`/`maxHp` = 4; the door/bell open at `L.stage >= 4`.

### Crafts (Hangar) — each has a Gust ability
Dart (speed boost) · Glider (soar, thermals ×2) · Swallow (dodge-roll dash, ignores swats) · Paper Boat (sails floors, can't fly) · Paper Ball (jump / ground-pound, bounces) · Spinner (maple seed, hovers) · Crane (`flap`: each tap is a wing-beat lift, 0.26 s cooldown, 0.12 gust) · Hawk (`dive`: hold for a power dive, release for a swoop up proportional to dive time). New crafts go in `PLANES`, `CRAFTS`, `PT`, a `planeGeometry` branch and `CRAFT_LINES`; abilities are wrappers on `Flyer.prototype.updateArcade`/`update`.
Skins unlock by stars and achievements; a **Decorator** (Hangar → ✎) adds stickers and doodles composited onto the paper texture (`Deco.tex`).

### People and life
- `Person` objects with acts: talk, point, cheer, duck, shush, hi5, sleep, pass, catch… Bubbles via `say()`, each with a babble voice.
- **Named classmates** `CAST` (Jake the joker, Priya the facts girl, Zoe Mia's best friend, Leo the catcher, Tom the sleeper, Ana the artist, Ollie the shy fan, **Nina** the new girl, **Ben** the inventor, **Rosa** the school-paper reporter) placed per level by `CAST_IN` (the queue only fills plain kids a build creates, so extra ids are harmless).
- **Family & non-school people** have `p.who` ids (`mum`, `dad`, `gran`, `lily`, `mmum`, `mdad`) resolved by the wrapped `findSpeaker`/`spkName` (`EXTRA_NAMES`), so they can speak in cutscenes and choices.
- **Animals:** `Cat` (sleeps, swipes), `Dog` (`dog(L,b,x,z,{box,name})`: chases the plane's shadow, barks, jumps and knocks a low plane), `Flock` (`flock(L,b,x,z,{duck,n,r})`: pigeons take off when you pass, ducks flap/quack/hop), `Hamster` (class 5B, “Nibbles”, wheel speeds up when you fly near), roof pigeons, `umbrellaFor(person, colour)`. **Teachers** `TEACHERS`/`TEACH_IN` (Ms. Hart, Mr. Ellis, Mrs. Okafor, Mrs. Bell, Mr. Petrenko, Mr. Lieu, Coach Brandt, Mr. Moss, Ms. Rivera, Dr. Sato, Gus the janitor) + Grimsby.
- **Remember you** (`rel`): close fast passes raise a classmate's opinion, bumps/crashes lower it → fans cheer your name and relaunch you after a crash; grumpy ones try to catch you and throw you away.
- **Social director** `Social`: conversations from `CONVOS`/`CONVOS_BY`, note passing, high-fives, sleepy kids, teacher shushes, cheer contagion.
- **Talk content:** `LEVEL_CHAT` ambient lines, **Overheard** special lines (`SPECIALS` + `SP_MORE` + `SP_MORE2`, **20 per level**, index = `SP_AT` moment: start, stage, star, trouble, finish, power, near, skim, swap, flyby, star2, star3, uturn, crash2, fast, brake, clean (a minute without crashing), last (last stage), combo (×4), empty (gust meter empty); a new level needs all 20), **running jokes** `JOKES` (multi-part stories advancing once per level), `reactLine` comments on your craft/paint/speed.
- **Mini-quests** `QUESTS` (deliver something between two people), **Mia side-story** `MIA_SPOTS` (find Mia off-route in 8 rooms → secret "Mia's notes").
- **Cutscenes** `CUTS`: 4–5 lines before each level's story card, shown once, skippable, replayable.
- **Dialogue choices** `CHOICES[levelId] = { who, q, opts:[{ t, who, r, rel, d, cb }] }`: after the last cutscene line Sam picks one of 3 replies; `rel` changes classmates' opinion (fans/grumpy), the reply is spoken, the story card shows “what Sam said”, and `cb` = `[who, line]` is said ~2.6 s into the level. Stored in `Store.data.choices`.
- **Sam’s diary** `DIARY[levelId]`: a page per finished level (base line + the chosen option's `d`), shown on the results card and as a page in the Notebook. Stored in `Store.data.diary`.

### Systems
Difficulty (Easy/Normal/Hardcore + Practice profile) · power-ups (Tailwind, Magnet, Shield) · skim bonus (fly close to surfaces) · **ghost** of best run with splits and top 5 · ~45 achievements + stats in **Sam's Notebook** (also lists Overheard lines and jokes) · Daily flight with a twist (`MODS`) · challenge modes on the story card (Normal / **Time attack** / **Iron paper**) · Marathon · 2-player split screen (race/co-op) · keyboard, mouse, touch, gamepad · per-level music themes (`THEMES`) · bloom post effect · settings for quality, camera, sensitivity, audio, etc.

### Save data (`Store.data`)
settings, unlocked, best, skin, plane, stats, ach, heard, rel, quests, mia, jokes, top, deco, courses, daily, chal, cuts, marathonBest, mp, seenIntro, choices, diary (the last two are created lazily by `CH()`/`DI()`), seen (`{lv, sk, ach}` — what the player has already looked at, for NEW badges; created by `SEEN()`, which marks everything already unlocked as seen for old saves). **When you add a field, default it on load** — old saves must keep working. Never rename the save key.

## 4. Code map (`src.html`)
Order: CSS → HTML overlays (title, menus/panels, HUD, touch controls) → one `<script type="module">`:
1. `Store` (~line 356) — load/save/migrate.
2. Renderer, post shader, materials, procedural textures, geometry helpers, colliders.
3. Flight model (`Flyer`), crafts, power-ups, particles, audio.
4. `LEVELS` (~2543) — story level defs with their `build`.
5. `Person` and helpers `kid()`, `seated()`, `adult()`, `sprayer()` (~3371); boss.
6. `Game` (~4273) — title → story card → begin → play → results; HUD; `Game.mode`; multiplayer.
7. **Feature blocks appended before the final `boot();`** (~6767): systems (achievements, ghost, daily, notebook, skim) → bonus levels art/roof → Social/Overheard → cast/quests/Mia/themes/splits → decorator/course maker/bus → chatter/jokes/teachers → town/cutscenes/challenges/marathon.
8. **v10 block (last before `boot();`)** — storybook art + menu polish + phones:
   - `ART` (paths) and `Art` (`window.__art`): a fixed `#art` layer between the canvas and `#screens`. `Art.pick()` maps `UI.state` → picture (title/confirm/settings-from-title/2 players → `title`; levels/courses/cnew → `map`; `bossintro` and the boss story card → `grimsby`; results/notebook → `diary`; ending → `ending`). `UI.show` is wrapped to call `Art.sync()`, which also tags `#scr` with `art-<name>` for per-picture CSS. Images load lazily (`Art.prefetch()` on idle from the title) with a shimmer + “unfolding the picture…” while loading; on error the body gets `art-fail-<name>` and the 3D scene stays. `body.art-ok-<name>` gates CSS that only makes sense with the real picture (e.g. right-aligned title menu). While a picture fully covers the screen, `Game.render` skips the 3D frame.
   - `Game.bossIntro(i)`: a card over `pf_grimsby` before the Main Hall story card (text on the right; on phones a paper card at the bottom). `acts.bossGo` continues.
   - Ending: the old ending card plus a **credits roll** (`.roll`), over `pf_ending`.
   - Menu states: hover/pressed (`.press` flash on activate)/keyboard focus ring (`body.kbnav` — set by arrows/Tab/gamepad, cleared by mouse/touch; real DOM focus follows `UI.focus`)/disabled/locked (`.lockn` requirement on level cards, 🔒 on paper and stickers)/equipped badge/NEW badges (`.newb`, `.newdot`)/empty states (`.empty`, `.empty-ink`)/screen fade-in (skipped when re-rendering the same screen). All motion is off under `prefers-reduced-motion`.
   - Phones: safe-area insets on every edge, `pointer: coarse` → 44 px minimum targets, landscape phones get a two-column title menu, touch flight controls moved to the bottom-right with the meters bottom-left. `#rotate` (`window.__rot`) asks to turn a portrait phone sideways during play only (menus work upright); “Fly upright anyway” sets `__rot.allow`. `resize()` caps pixel ratio at 1.25 on small screens.
   - The v10 `<style>` is appended to `body` (after the game's own style element) so equal-specificity rules override.
9. **v11 block — painted skies** (purely visual):
   - `SKY_ART` (paths), `SKY_OF` (level id → painting: yard/town → day, roof → night, bus/party/free (Golden Hour)/home → sunset, rain → rain, everything else → day; custom courses use their room's id), `SKY_CFG` per painting (source crop — the sunset sheet has a paper border —, `span` = radians above the horizon the picture covers, `v0` = how far the bottom edge sits below the horizon, `sunU` = where the painted sun/moon is across the width so it's turned to the level's light, `rep` = mirrored copies around the horizon (day 4, others 2), `tint`/`sat` to deepen the pale day sky, `glow` = keep the old sun glow).
   - `Sky` (`window.__sky`): loads the level's painting lazily when the level is built (wrapped `setupLights` → `Sky.pre`/`Sky.post`; never in menus), draws it to a canvas (512 px wide on Low, 1024 Medium, 1376 High) and averages cap/horizon/ground colours from it. Shared uniforms `Sky.U` + `SKY_GLSL` (`skyLook(dir)`: azimuth → mirrored u, elevation → v, cap colour above, ground colour below).
   - Outdoors: `makeSky` is wrapped — the old gradient dome keeps its uniforms (rain recolours them) and fades to the painting via `Sky.domeK` once the texture is ready; fog and hemisphere light are tinted toward the painted horizon/top (`Sky.pre` when already loaded, live otherwise), `scene.background` = horizon colour.
   - Indoors: `M.glass` (window panes, patched in the wrapped `initMats` with `onBeforeCompile`) blends to the sky along the view ray (`Sky.glassK`), tilted up a little so eye level shows the lower sky with the skyline just below. Outdoor levels keep the warm lit-window glass.
   - Fallback: if a painting fails, `st[k] = 'fail'` and the gradient dome / warm glass stay. Never put `//` comments inside injected one-line GLSL (it swallows the rest of the line).
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
- **New level:** make a def object, `LEVELS.push(DEF)`; bonus levels need `bonus: true`. Ending logic checks `id === 'yard'` — never `LEVELS.length - 1`. Give it story lines, outro, 20 specials, chatter, cast/teachers, a quest, a cutscene, a `CHOICES` entry and a `DIARY` line so it matches the rest.
- **Wrappers that loop over `LEVELS` only touch the levels that existed when they ran.** A level pushed later must call `v7wireL(DEF)` (cast queue, teacher queue, `LEVEL_CHAT`) — see party/home. A level can reuse another's build (`rain` calls the yard's wrapped build, then restyles it; `L.def.id` tells them apart).
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
- `node v7.js [indexes]` screenshots the new levels along their route (and the boss at phase 4); `node v7ui.js [w h]` checks hangar, a cutscene choice, the story card, results diary and notebook (`390 844` for phone); `node par.js` measures each route against its gold par.
- The sandbox's software GL runs game time ~10× slower than wall time: cutscenes take minutes unless a probe fast-forwards `Game.cut.t` (v7ui.js does). Run all 16 levels in two batches (`0,…,8` then `9,…,15`) to stay under the 10-minute command limit.
- `bash build-test.sh` also copies `../assets` into `tools/assets` so the test page loads the pictures.
- `node menus.js [desktop|mobile]` walks every menu and state (fresh save → empty states; progress → NEW badges, locked, equipped; keyboard focus ring; pressed; hangar, decorator, settings, confirm, daily, 2 players, boss intro, cutscene choice, story, results, pause, pause settings, notebook + diary, ending), screenshots 1440×900 and 390×844 into `tools/shots/`, asserts that all 5 images load, the focus ring is visible, the right picture is behind each screen and that a failed image falls back. ~8 min for desktop, ~4 min mobile in software GL — run them separately.
- `node mobile.js` checks 390×844, 844×390 and 768×1024 (touch): no horizontal overflow in 7 menus, touch targets ≥ 44 px, touch controls vs HUD overlap during the boss level (with hints, toasts, Overheard, quest, split and power-ups all showing), and the rotate prompt (portrait only, dismissable). ~4.5 min. Screens: `tools/shots/m_*.png`.
- **Read the screenshots** after any UI change — tune crops (`object-position` per picture and orientation in the v10 CSS) and overlays by eye.
- `node sky.js [ids]` flies to each level (default yard, roof, bus, town, party, rain, free, class, home, gym), waits for the painted sky to fade in, screenshots three views per level into `tools/shots/sky_*` and asserts it loaded with no console errors (~2–4 min per level in software GL — run a few ids at a time, in the background). `Q=low` / `W=390 H=844` env vars for quality and viewport.
- `node daily.js` is the old daily-flight/menu probe (was `menus.js`).
- `bash runall.sh` runs all 16 levels in small batches (one level is ~1–2 min in software GL; the Town much longer) — start it in the background. It kills stray browsers between batches with `pkill -f '[p]w-browsers/chrom'` (a bare `pkill -f chromium` matches and kills the calling shell itself).
- `node look8.js [indexes] [tag]` screenshots each level from its spawn (High quality, render scale pinned); `node ppl8.js [level] [tag]` takes close-ups of people; `node v8probe.js` checks Thorne, a secret room, winter/spring and the Rocket/Dragon.
- `run.js` now runs on Low quality (contact shadows off) — the semi-realistic renderer is several times slower in software GL. `runall.sh` covers all 17 levels.
- Last known state: all 17 levels completable, no console errors.

## 4b. Systems added in v8–v12 (blocks after v11, before `boot();`)
- **Renderer (v8):** every material is `MeshStandardMaterial` (`StdM`, `toon()` now returns it; textured ones get `bumpMap` + roughness from `map.userData.rough/bump` set by `surf()`), a baked studio environment (`ENV`), soft shadows (4096 on High), screen-space contact shadows (`post.aoK`), ink lines faded to `inkK` 0.12, per-level colour grading (`L.grade`: day/outdoor/night/rain/evening). Quality has **Auto** (`QUAL()`: guesses from cores/memory/touch). Procedural textures were redone at 1024 px with `grain()` (plaster, tiles, wood, planks, brick, grass, asphalt, bark).
- **People (v8–v12):** `Person` is reassigned several times to subclasses (rounded body parts `PEOPLE.rbox`, helmet hair `PEOPLE.helm`, glossy eyes, smile/frown arc, oval mouth, collar/belt/soles, mitten hands with thumbs and a pointing finger, talking mouth shapes, blush near Mia). `LOOK.hair(p, style)` (bangs, side, buzz, messy, braids, afro), `LOOK.role(p, r)` outfits, `LOOK.teacher(p, id)` outfits (applied in `Class.attach`). Expressions in a `Person.prototype.update` wrapper. `p.roleOv = { o: pose|fn(t), t }` is a temporary pose that only applies while idle (`POSE` table).
- **Roles & class life (v8e/v9/v12):** `ROLES` (jake clown, priya nerd, tom sleepy, max bully, emma pet; `ally` = Max after redemption), name tags show `ROLE_IC`. `Class` director (attached per level in `Game.loadLevel`): lesson Q&A (`LESSONS` per teacher), clown bits, bully vs nerd, pet, sleepy, mischief, group work (every 3.5–6.5 s); bigger scenes every 14–22 s (prank — warn the teacher by flying past —, tattle, substitute jokes); pop quiz (answer rings), fire drill (`DOORS`, `body.alarm`), substitute teacher (35% in class/lab/music/art), lunch boxes + food fight (canteen), class pet duty (`PETSPOT`), exam day (30% in class: noise meter, teacher looks up, cheat sheet Priya → Jake). Bully throws paper balls at the plane. Recess games in the yard (tag, hopscotch, skipping rope).
- **Story (v9/v12):** Max holds a page of Sam's note in corridor/canteen/gym (`Store.data.maxPages`); all 3 → `MAX_GOOD()` → he's an ally (tailwind boost when you pass, distracts Grimsby). Priya's volcano in the lab (erupting thermal every 9 s). Report cards in the Notebook (`REPORT`, grades from `rel`).
- **World (v8):** Vice Principal Thorne in the Gym (extra stage 2, leaf-blower pull zone), Rocket and Dragon crafts, squirrels/goldfish/tortoise, `SECRETS` secret rooms (vent → room 40 units above the level, golden note; 13 levels have one; `SEC_BUILD`), seasons (`SEASON()`, setting), day→dusk light drift, ambience/paper sounds/fuller music. Less clutter: at most ~4 bubbles at once, none on top of each other, name tags fade beyond 8 m.

## 7. Publishing
- **Vercel:** pushing to `main` deploys https://game-paper-flight.vercel.app automatically (it serves `index.html` + `assets/`). So: regenerate `index.html`, run tests, commit, push.
- **Artifact:** publish `src.html` with the Artifact tool to `https://claude.ai/artifact/27TqcQ9ocr6Et7eq8vMzuG` (read it first from a new conversation — the tool requires a read before updating). Same URL every time. Pass the pictures as supporting files with a `files` map so the relative paths resolve: `files: {"assets/pf_title.webp": "assets/pf_title.webp", "assets/pf_map.webp": "assets/pf_map.webp", "assets/pf_grimsby.webp": "assets/pf_grimsby.webp", "assets/pf_diary.webp": "assets/pf_diary.webp", "assets/pf_ending.webp": "assets/pf_ending.webp"}` plus the four `assets/pf_sky_*.webp` panoramas.
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
- Must work on phones (390×844 portrait for menus, 844×390 landscape for flight, 768×1024 tablet), safe areas, 44 px touch targets, and stay smooth on Low quality.
- Illustrations: storybook style — coloured pencil + watercolour on lined notebook paper, no text in the picture. Keep text off faces: title menu sits right of Sam, boss text on the empty right side, ending card in the sky band.

### Writing
- Story cards: 4 short lines, present tense, a little wry, kid's-eye view ("One sheet of paper. One good fold. Throw it."). Outros are one line ending with a small joke ("Nobody saw a thing. Probably.").
- Dialogue: short (under ~40 characters for bubbles), natural school talk, each character has a voice: Jake jokes, Priya states facts, Zoe protects Mia, Leo is competitive, Tom is sleepy, Ana sees colours, Ollie is shyly excited; teachers are strict but kind; Grimsby is pompous.
- Mia is always just ahead — glimpsed, never caught until the end. Keep the romance sweet and age-appropriate.
- English UI text, curly quotes and en/em dashes as in the existing text.

### Code
- Plain modern JS in one module, no frameworks. Short names in hot code (`L` level, `b` builder, `fl` flyer). Comments explain intent, not mechanics.
- Self-contained feature blocks; wrappers over edits; guards so a missing table entry never crashes a level.
- Textures, sounds and music stay procedural. The only external images are the five menu illustrations and the four sky panoramas in `assets/` (skies are the only art in the 3D world, loaded through `Sky`); new ones go there as 1024×572 WebP, referenced relatively, loaded through `Art`, with a fallback.

## 10. Ideas to offer next
Ghost races shared by code · photo mode · voiced lines (TTS) · accessibility (colour-blind, reduced motion, one-button mode) · a snow day level · a school-fair level · a second boss (the vice principal) · Mia’s point of view chapter · choices that branch which rooms you visit · a pet you can befriend and carry notes · Rosa’s school paper as an in-game newspaper of your runs · tuning par times with real play data (current pars are evened out by route length only).
