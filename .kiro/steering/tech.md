# Tech

## Stack
- **Language:** TypeScript (strict mode).
- **Build:** Vite.
- **Rendering:** Three.js.
- **Audio:** Web Audio API. Synthesize every sound in code (oscillators, filters, envelopes, generated reverb impulses). No audio files.
- **Tests:** Vitest for unit tests, fast-check for property-based tests.
- **Lint and format:** ESLint and Prettier.
- **Hosting:** static site, no backend. Provider not decided yet (GitHub Pages, Netlify, or Vercel).
- **Dependencies:** before adding one, tell the user so they can announce it to the team.

## Architecture rules
- Keep the music and grid logic (data model, scales, note mapping, critter movement, share encoding) as pure TypeScript in `src/core` with no Three.js, Web Audio, or DOM imports, so it can be tested in Node.
- Three.js and Web Audio code only reads state from the core and renders or plays it.
- **One clock.** A pure `step(state) → { state, notes }` in `src/core/model/` moves every critter one cell. It calls the movement rules in `src/core/critters/`.
  - The audio scheduler calls `step()` once per beat on the `AudioContext` clock and schedules the returned notes.
  - Rendering only animates between beats. It never advances state.
- **Deterministic core.** The same state always gives the same next state and notes. No `Math.random()`, `Date`, or timers in `src/core`. If a behavior needs randomness, use a seeded generator whose seed is part of the state.
- Audio timing uses the `AudioContext` clock, not `setTimeout` or the render loop.
- The `AudioContext` must be created or resumed after a user gesture (browser autoplay policy). The Start button on the start screen does this.

## Sharing
- Encode the full creation (grid, critters, scale, tempo) plus a format version into the URL hash, compressed and base64url-encoded. No server storage.
- Decoding must reject or safely ignore malformed input from the URL.

## Property-based testing targets
- Scale lock: any note produced is a member of the selected scale.
- Scale lock: empty cells produce no note and never throw.
- Critter movement: critters always stay inside the grid bounds.
- Determinism: running `step()` from the same state always yields the same sequence of notes.
- Share link: `decode(encode(state))` equals `state` for any valid state.
- Share link: decoding arbitrary strings never throws and never yields an invalid state.

## Commands
- `npm run dev`: start the dev server.
- `npm test`: run all tests once.
- `npm run lint`: check lint and formatting. Hooks only check; they never auto-fix.
- `npm run build`: production build.
