# Paper Flight

**A game by Diego Danylov.**

Friday, 3:14 pm. Sam has written a note for Mia — but she has already left the classroom. Fold it into a paper plane and fly it through the whole school, room by room, before the last bell at 3:30. A 3D browser game made with three.js: 16 levels (9 story rooms + 7 bonus), a principal boss fight, 10 crafts, classmates who remember you, cutscenes with choices, Sam's diary, a course maker, daily flights, a marathon and 2-player split screen.

## Play
- **Web:** https://game-paper-flight.vercel.app
- **Claude artifact:** https://claude.ai/artifact/27TqcQ9ocr6Et7eq8vMzuG
- **More of Diego's games:** https://diego-games.vercel.app
- **Locally:** serve the repo root (`python3 -m http.server`) and open `index.html` — the illustrations in `assets/` load by relative path.

## Controls
| | Keyboard | Gamepad | Touch |
|---|---|---|---|
| Steer | A / D, W / S (climb/dive) | left stick | left thumb anywhere on the left side |
| Craft ability (gust) | Shift | RT | GUST |
| U-turn / brake | X / Ctrl | LT / B | U-TURN |
| Swap craft | Q / E | LB / RB | SWAP |
| Camera | C | Y | — |
| Pause | Esc | Start | II |

Menus: arrows/WASD + Enter, Tab, mouse, gamepad or touch. On a phone, turn it sideways to fly.

## Repo
- `src.html` — the source of truth (artifact body). `index.html` is generated from it by `tools/build-index.sh`.
- `assets/` — storybook illustrations (title, map, Principal Grimsby, diary, ending).
- `tools/` — Playwright test harness.
- `CLAUDE.md` — the full guide for continuing development with Claude.

## Tests
```bash
cd tools && npm install
bash build-test.sh && python3 -m http.server 8765 &
node boot.js                  # title boots without console errors
bash runall.sh                # all 16 levels, every objective, in batches (slow in software GL)
node menus.js desktop         # every menu/state, focus ring, all 5 images load → tools/shots/
node menus.js mobile
node mobile.js                # 390×844, 844×390, 768×1024: overflow, HUD vs touch controls, rotate prompt
```

GitHub: https://github.com/ydanilov/paper-flight
