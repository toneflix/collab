import type { AudioEngine, Clip, Track } from '@toneflix/studio';
import { buildChain, chainNodes, disposeChain, type BuiltChain } from './chain';
import type { StemEffect } from './effects';
import { encodeFlac } from './flac';

/** The track's tempo and meter, so tempo-synced plugins lock to it. */
export interface PrintTempo {
  bpm: number;
  beats: number;
  unit: number;
}

/** Seconds kept after the last clip, so echoes and reverb can ring out. */
const TAIL = 4;

/**
 * Render a track's clips through its effect chain, plugins included, the way
 * it plays in the studio before volume and pan. Overlapping clips play as the
 * editor plays them. The audio starts at `start` seconds on the timeline.
 */
export const printTrack = async (
  engine: AudioEngine,
  track: Track,
  clips: readonly Clip[],
  effects: StemEffect[],
  tempo: PrintTempo,
) => {
  const own = clips.filter((c) => c.track === track.id && !c.notes && c.duration > 0 && engine.hasBuffer(c.source));
  if (!own.length) return null;

  const { AudioEngine: Engine } = await import('@toneflix/studio');
  const start = Math.min(...own.map((c) => c.start));
  const end = Math.max(...own.map((c) => c.start + c.duration));
  const solo = new Engine({ context: engine.context });
  const chains: BuiltChain[] = [];

  try {
    for (const clip of own) solo.setBuffer(clip.source, engine.getBuffer(clip.source)!);
    solo.load({ tracks: [{ ...track, automation: undefined }], clips: own });

    const audio = await solo.render({
      from: start,
      to: end + TAIL,
      effects: async (id, context, atStart) => {
        if (id !== track.id) return [];

        const chain = await buildChain(context, effects, { plugins: true, canLoad: true });
        if (chain.errors.length) throw new Error('A plugin could not load.');
        chains.push(chain);

        // Tell plugins the song is playing from `start`, as the studio's transport does live.
        const bar = (tempo.beats * 60 * 4) / (tempo.bpm * tempo.unit);
        const currentBar = Math.floor(start / bar);
        for (const { plugin, effect } of chain.live) {
          if (!plugin) continue;
          if (effect.state !== undefined) atStart(() => plugin.audioNode.setState(effect.state));
          atStart(() =>
            (plugin.audioNode as { scheduleEvents?: (...events: unknown[]) => void }).scheduleEvents?.({
              type: 'wam-transport',
              time: 0,
              data: {
                playing: true,
                tempo: tempo.bpm,
                timeSigNumerator: tempo.beats,
                timeSigDenominator: tempo.unit,
                currentBar,
                currentBarStarted: currentBar * bar - start,
              },
            }),
          );
        }

        return chainNodes(chain);
      },
    });

    return { audio, start };
  } finally {
    chains.forEach(disposeChain);
    solo.destroy();
  }
};

/** The printed audio as 16-bit FLAC, about half the size of WAV. */
export const flacOf = (audio: AudioBuffer) =>
  encodeFlac(
    Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, c) => audio.getChannelData(c)),
    audio.sampleRate,
  );

/** A short fingerprint of what a print was made from. */
export const printKey = async (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest('SHA-1', bytes);

  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
