/**
 * Programmatic reverb impulse response generator.
 * Produces a stereo AudioBuffer using pure synthesis — no audio files required.
 *
 * @param ctx      - Web Audio API AudioContext instance
 * @param duration - Buffer length in seconds (e.g. 2.0)
 * @param decay    - Decay exponent controlling tail shape (e.g. 2.0)
 * @param reverse  - When true, the buffer is reversed (pre-reverb effect)
 */
export function generateImpulseResponse(
  ctx: AudioContext,
  duration: number,
  decay: number,
  reverse: boolean
): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);

    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
    }

    if (reverse) data.reverse();
  }

  return buffer;
}
