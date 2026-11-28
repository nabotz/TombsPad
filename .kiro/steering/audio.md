---
inclusion: fileMatch
fileMatchPattern: "src/audio/**"
---
# Audio area steering

- All audio synthesis uses the Web Audio API — no audio files.
- AudioContext is created lazily on first user gesture.
- Signal chain: OscillatorNode → BiquadFilterNode → GainNode (ADSR) → ConvolverNode → GainNode (master) → destination.
- Reverb is generated programmatically via impulse response (generateImpulseResponse in impulseResponse.ts).
- triggerNote accepts getCellColorFn as a parameter — do NOT import from render/ directly.
- Owner: sendori
