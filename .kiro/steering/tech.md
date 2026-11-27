# Tech

## Stack
- **Language:** TypeScript (strict mode).
- **Build:** Vite.
- **Rendering:** Three.js.
- **Audio:** Web Audio API. Synthesize sounds in code where possible instead of shipping audio files.
- **Tests:** Vitest for unit tests, fast-check for property-based tests.
- **Hosting:** static site (e.g. GitHub Pages). No backend.

## Architecture rules
- Keep the music and grid logic (scales, note mapping, critter movement, share encoding) as pure TypeScript with no Three.js or Web Audio imports, so it can be tested in Node.
- Three.js and Web Audio code only reads state from that core and renders or plays it.
- Audio timing uses the `AudioContext` clock, not `setTimeout` or the render loop.
- The `AudioContext` must be created or resumed after a user gesture (browser autoplay policy).

## Sharing
- Encode the full creation (grid, critters, scale, tempo) into the URL hash. No server storage.
- Decoding must reject or safely ignore malformed input from the URL.

## Property-based testing targets
- Scale lock: any note produced is a member of the selected scale.
- Share link: `decode(encode(state))` equals `state` for any valid state.
- Share link: decoding arbitrary strings never throws and never yields an invalid state.
- Critter movement: critters always stay inside the grid bounds.

## Commands
- `npm run dev`: start the dev server.
- `npm test`: run all tests once.
- `npm run build`: production build.
