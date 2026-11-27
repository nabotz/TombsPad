# Product

Name: **TombsPad**

A browser music toy for the Kiroween 2026 hackathon, **Resurrection** category. It brings back the idea of SimTunes (Maxis, 1996): you paint colored pixels on a grid, and little critters crawl over them, playing a note each time they step on a colored cell.

## Core features (MVP)
- **Paint:** users paint and erase colored cells on a flat grid inside a 3D scene, with undo. Each color maps to a note.
- **Critters:** Halloween-themed critters (pumpkin, ghost, bat, spider) walk the grid and play the note of the cell they step on. Each critter has its own synthesized instrument.
- **Predictable movement:** users place critters and pick their direction. Critters move straight and turn or bounce at the grid edge, so users can compose on purpose. No pathfinding.
- **Scale lock:** every note is locked to the selected scale, so any painting sounds musical. Users pick from 2–3 scales, e.g. harmonic minor, Phrygian, minor pentatonic.
- **Playback controls:** play/pause, tempo, mute, and volume.
- **Share:** a creation can be shared as a link that reopens the exact same painting and critters.
- **Onboarding:** a start screen, a 3-step tooltip, and ready-to-play example paintings.

## Stretch goals (only after the MVP works end to end)
1. Special Halloween cells that change critter movement: tombstone (stop), spider web (slow down), candle (turn), portal (teleport).
2. Per-critter behaviors: ghosts pass through walls, bats zig-zag, spiders leave a web trail.
3. Mobile layout.

## Constraints
- Do not use SimTunes or Maxis names, logos, art, or sounds in the app, assets, or demo video. Describing the app as "inspired by SimTunes" in text is fine.
- All assets and sounds must be original or under a license that allows use.
- The app must run in a modern desktop browser with no install.
