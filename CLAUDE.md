# Ink Town: notes for Claude Code

Ink Town is a cozy mobile town builder drawn like a paper-and-ink cartoon. It's the sister game to Ink Nine (`../ink-nine`) and Ink Rally (`../ink-rally`) and shares their look, fonts and way of working. The player is a town planner with a starter budget who grows a hamlet into a city while keeping the books balanced.

## Who you're working with
Otis is the designer. He doesn't read code. He judges changes by playing them on his phone.
- Explain every change in plain language: what the player will see and feel, not how the code works.
- Keep replies short. Ask one question at a time when a design decision is his to make.

## How the project is built
- **No build step, no frameworks, no npm packages in the game.** Plain HTML, CSS and JavaScript files served as-is. The only outside code is Google Fonts. There is no online play yet, so there's no Supabase.
- `play/js/config.js` — `VERSION`, the starting money and how long a day lasts.
- `index.html` — the front page (a little ink street filling up with houses, and a Play button).
- `play/index.html` — the game page. It loads `styles.css` and then the scripts in `play/js/` **in the order listed there**.
- The scripts are classic scripts that share one global scope. Order matters: a file can only use things defined in files above it *while it is loading*. Calls that happen later (on tap, per frame) can use anything.
- `manifest.webmanifest`, `sw.js`, `icons/` — home-screen install. When you change files the service worker caches, bump `CACHE` in `sw.js`.

| File | What's in it |
|---|---|
| config.js | `VERSION`, `START_MONEY`, `DAY_SECONDS` (a whole day, 900 s), `SUNRISE`/`SUNSET` (hours), `STEP_HOURS` (how often the town ticks) |
| engine.js | Maths helpers, the 48×48 map grid, and the starting landscape (river and woods) |
| items.js | Everything you can build (`ITEMS`), the dock categories, town ranks, residents' needs, taxes, the loan, tasks, town name ideas |
| town.js | The town `T`, saving and loading, planning and building, clearing, upgrading, undo, `money()` formatting |
| sim.js | The town clock (`darkness`, `clockText`), how the town lives: road connections, appeal, noise, service cover, happiness, demand, money per hour (`simRefresh`), and one 10-minute step passing (`stepTick`) |
| render.js | Canvas, ink patterns, the camera and zoom |
| draw.js | Drawing water, roads, paths, hedges, flower beds and every building (`DRAW`) |
| agents.js | Game state `S`, cars and walkers, dust and smoke, floating numbers |
| audio.js | Procedural sounds and birdsong |
| ui.js | HUD, the build dock and trays, item icons, the info sheet, toasts, hints, callouts |
| screens.js | Cards: home screen, founding a town, menu, town ledger, tasks, how people feel, what the town wants, new rank |
| input.js | Touch, mouse and keys: tap, drag-to-build, pinch, pan, undo, speed |
| scene.js | Drawing one frame in front-to-back order, night hatching and lights, the build preview and cost tag |
| main.js | Main loop, the town clock (`clockStep`), what happens each step (`onStep`), startup (always last) |

## How it plays
- **Controls.** The dock at the bottom has seven categories. Picking one opens a tray of items and selects the first. Buildings are placed with a tap (one-finger drag moves the map). Roads, paths and hedges are dragged as a straight or L-shaped line; flower beds, ponds and Clear are dragged as a rectangle; trees are brushed on. While dragging, a cost tag follows your finger, and nothing is built until you let go. Two fingers always move and zoom. Tapping the active category again (or Done) puts the tools away; then tapping anything opens its info sheet.
- **Roads.** Buildings need a road beside them that joins back to the town hall. Roads and paths can cross water as bridges (they cost more).
- **People.** Each home fills towards a share of its size set by its happiness and by demand. Happiness comes from appeal (trees, gardens, water, parks), minus noise (workshops, factories), plus or minus services depending on the town's size (`NEEDS`), minus unemployment and shop shortages, plus or minus taxes.
- **Time.** A day lasts 15 minutes at normal speed (2× and 4× speed it up). Daylight runs 5:00 to 22:30 (about 73%); night is shown by cross-hatching the map with pools of light from lived-in buildings, lamps and headlights. The town ticks every 10 minutes of town time (about 6 seconds): money arrives in slices and people move in or out, so play stays brisk even though days are long.
- **Money.** Everything is counted per hour: residents' tax, business tax per filled job, and shop sales, minus upkeep and any loan repayment. Each step pays a sixth of the hourly figure. Constants are at the top of sim.js; prices and hourly upkeep are in items.js.
- **Ranks.** Hamlet, Village, Town, Borough, City (`RANKS`). Each pays a grant and unlocks buildings (`rank` on an item).
- There's no game over. If money runs out you can't build, and the game suggests raising taxes or taking a loan.

## Every change
1. Work on a new branch, never directly on `main`.
2. Bump `VERSION` in `play/js/config.js` (patch for fixes, minor for features) and add a line to `CHANGELOG.md` in plain language.
3. Test locally: run `python -m http.server` in the repo folder and open http://localhost:8000/play/ at a phone size (390 × 844). On a computer the mouse wheel zooms, right-drag or arrow keys move the map, Ctrl+Z undoes and space pauses.
4. If you change prices, incomes or happiness, play a town from scratch to Village and check it still feels fair.

## Protect players' saved towns
Towns are kept in the browser's localStorage. An update must never wipe or break them.
- Keys: `inktown-save` (`v`, `name`, `seed`, `day`, `clock` (hours, 0 to 24), `money`, `tax`, `loan` (`left` counts 10-minute steps), `rank`, `task`, `hist` (money made in each recent hour), `created`, `ground` as one digit per tile, and `objs` as `[item id, x, y, residents]`), `inktown-meta` (`v`, `sound`, `seen`).
- Never rename an item `id` or a task's position in `TASKS` (the save stores how many tasks are done). Add new tasks at the end.
- Never rename or remove a saved field. Add new fields with defaults.
- Changing an item's size (`w`, `h`) would break saved towns that have one built. Make a new item instead.

## Look and feel (same as Ink Nine and Ink Rally; keep it consistent)
- Paper and ink only: white `#fff` and black `#000`, with grey only for secondary text. Shading is hatching and stippling, never color.
- Fonts: Fraunces (display, often italic 900) and Figtree (UI).
- Motion follows Disney's principles: squash and stretch, anticipation, follow-through, slow in and out. New buildings pop up with a squash and settle.
- Mobile first, portrait, one thumb for building, two fingers for the map. Respect safe areas and `prefers-reduced-motion`.
- Writing: sentence case, short and plain, no jargon.

## Smoke test
- First launch shows the home screen with "Found a town". Naming a town shows the welcome card, then the Roads tray is open.
- Drag a road from the stub under the town hall: a dashed preview and a cost tag follow your finger; letting go builds it with dust puffs and the money drops.
- Tap Homes and tap beside the road: a cottage pops up. Within a few seconds "+1"s float up as people move in, and the population chip rises.
- A building away from any road shows a "!" bubble; tapping it (with the tools put away) says it has no road.
- The task pill ticks along and pays out with a toast and a sparkle over the town hall.
- Clear knocks things down and gives half back; Undo puts them back.
- Leave it running (or on 4×): the time ticks on beside the day, night falls at 10:30 pm with hatching and lights, the dial shows a moon, and "Good morning" appears at 5 am.
- The town ledger shows income and costs per hour, the tax buttons change the daily figure, and the loan works.
- Reach 60 people: "Village!" appears, then a card with the grant and new buildings.
- Refresh the page: the town, money, taxes and loan are all still there.
- No errors in the browser console.
