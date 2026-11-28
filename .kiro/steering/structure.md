# Structure

Letters in brackets show the owning part: A = sendori, B = zenquessence, C = nabotz. The authoritative map is `.kiro/ownership.json` (see the ownership steering).

```
src/
  core/              pure logic: no DOM, Three.js, or Web Audio imports
    model/           shared data model and step()                      [C]
    critters/        critter movement rules, called by step()          [B]
    share/           share-link encode and decode                      [C]
    scale.ts         scales and color-to-note mapping                  [A]
  audio/             Web Audio engine, instrument voices, scheduler    [A]
  render/
    scene/           Three.js scene, camera, grid, painting input      [A]
    creatures/       critter models, animation, particles              [B]
  ui/                toolbar, palette, controls, onboarding            [B]
  main.ts            wires core, audio, render, and ui together        [shared, PR only]
tests/
  core/              mirrors src/core
index.html           Vite entry page; loads src/main.ts, no design     [shared, PR only]
public/              static assets                                     [B]
docs/                team docs and per-person Kiro logs
.kiro/               specs, steering, hooks, ownership map (must stay committed)
```

- One module per concept. Keep files small.
- Tests mirror source paths. `src/core/foo.ts` is tested in `tests/core/foo.test.ts` (unit) and `tests/core/foo.prop.test.ts` (property-based). `src/core/critters/move.ts` is tested in `tests/core/critters/move.test.ts`.
- Tests are written by the owner of the code they test. Shared fast-check generators for valid states live in `tests/core/model/` [C].
- Only `src/core` gets automated tests. Logic that needs tests belongs in `src/core`; code in `audio/`, `render/`, and `ui/` is checked in the browser.
- If a new file doesn't fit an existing folder, ask before creating a new folder. A new folder also needs an entry in `.kiro/ownership.json`, which only nabotz changes.
