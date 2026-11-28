import LZString from 'lz-string';

export interface CanvasState {
  cells: (number | null)[];
  seed?: number;
}

/**
 * Compress a canvas state object to an encoded URI component string.
 * Pure helper — does not touch window.location, so it's safe to use in tests.
 */
export function compress(canvasState: CanvasState): string {
  const json = JSON.stringify(canvasState);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decompress an encoded URI component string back to a canvas state object.
 * Pure helper — does not touch window.location, so it's safe to use in tests.
 */
export function decompress(compressed: string): CanvasState | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return null;
    return JSON.parse(json) as CanvasState;
  } catch {
    return null;
  }
}

/**
 * Encode a canvas state to the URL hash and return the compressed string.
 */
export function encode(canvasState: CanvasState): string {
  const compressed = compress(canvasState);
  window.location.hash = compressed;
  return compressed;
}

/**
 * Decode a hash string (with or without the leading `#`) back to a canvas state object.
 * Returns `null` on any failure.
 */
export function decode(hashString: string): CanvasState | null {
  try {
    const stripped = hashString.startsWith('#') ? hashString.slice(1) : hashString;
    const json = LZString.decompressFromEncodedURIComponent(stripped);
    if (!json) return null;
    return JSON.parse(json) as CanvasState;
  } catch (e) {
    console.warn('[ShareLink] Failed to decode:', e);
    return null;
  }
}
