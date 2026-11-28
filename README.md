# TombsPad

Submission for [Kiroween 2026](https://kiroween.devpost.com/), **Resurrection** category.

A browser music toy inspired by SimTunes (Maxis, 1996). Paint colored pixels on a 3D canvas, and Halloween-themed critters crawl over them, playing notes locked to a musical scale. Share your creation with a link.

Built with Three.js and the Web Audio API.

## Setup
Requires Node.js 22.13+ or 24+.

```
npm install
npm run dev      # start the dev server
npm test         # run unit and property-based tests once
npm run lint     # check ESLint and Prettier (no auto-fix)
npm run format   # apply Prettier formatting
npm run build    # type-check and build into dist/
```

## How Kiro was used
- **Specs:** `.kiro/specs`
- **Steering:** `.kiro/steering`
- **Hooks:** `.kiro/hooks`
- **Property-based testing:** fast-check tests in `tests/`

## License
MIT. See [LICENSE](LICENSE).

SimTunes is a trademark of Electronic Arts. This project is not affiliated with or endorsed by Electronic Arts or Maxis.
