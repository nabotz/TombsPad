# Structure

```
src/
  core/      pure logic: grid, scales, critters, share encoding (no DOM, Three.js, or audio)
  audio/     Web Audio engine and instrument voices
  render/    Three.js scene, camera, painting input
  ui/        toolbar, palette, scale and tempo controls
  main.ts    wires core, audio, render, and ui together
tests/       mirrors src/core; *.test.ts for unit tests, *.prop.test.ts for property-based tests
public/      static assets
.kiro/       specs, steering, hooks (must stay committed)
```

- One module per concept. Keep files small.
- Tests for `src/core/foo.ts` go in `tests/core/foo.test.ts` and `tests/core/foo.prop.test.ts`.
