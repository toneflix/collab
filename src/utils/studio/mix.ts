import { timelineEnd, type AudioEngine } from '@toneflix/studio';
import { buildChain, chainNodes, disposeChain, type BuiltChain } from './chain';
import type { StemEffect } from './effects';
import { encodeFlac } from './flac';

/** The track's tempo and meter, so tempo-synced plugins lock to it. */
export interface MixTempo {
  bpm: number;
  beats: number;
  unit: number;
}

/** Seconds kept after the last clip, so echoes and reverb can ring out. */
const TAIL = 4;

/** Highest peak a mix may reach, as a gain (-0.1 dBFS). */
export const CEILING = 10 ** (-0.1 / 20);

/**
 * Render the whole track as it plays in the studio: every clip, effect and
 * plugin (when `plugins` is on), volume, pan, mute, solo and the master.
 * `effectsOf` gives a track's chain, or the master's for null. Null when
 * there is nothing to mix.
 */
export const renderMix = async (
  engine: AudioEngine,
  effectsOf: (track: string | null) => StemEffect[],
  tempo: MixTempo,
  plugins: boolean,
) => {
  const state = engine.state;
  if (!state.clips.some((c) => c.duration > 0)) return null;

  const chains: BuiltChain[] = [];

  try {
    const audio = await engine.render({
      from: 0,
      to: timelineEnd(state) + TAIL,
      effects: async (track, context, atStart) => {
        const chain = await buildChain(context, effectsOf(track), { plugins, canLoad: true });
        if (chain.errors.length) throw new Error('A plugin could not load.');
        chains.push(chain);

        // Tell plugins the song is playing from the start, as the studio's transport does live.
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
                currentBar: 0,
                currentBarStarted: 0,
              },
            }),
          );
        }

        return chainNodes(chain);
      },
    });

    limit(audio);

    return audio;
  } finally {
    chains.forEach(disposeChain);
  }
};

/** Turn the audio down to the ceiling when it would clip. */
export const limit = (audio: AudioBuffer) => {
  let peak = 0;
  const channels = Array.from({ length: audio.numberOfChannels }, (_, c) => audio.getChannelData(c));

  for (const data of channels) {
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i]!);
      if (v > peak) peak = v;
    }
  }
  if (peak <= CEILING) return;

  const gain = CEILING / peak;
  for (const data of channels) {
    for (let i = 0; i < data.length; i++) data[i] = data[i]! * gain;
  }
};

/** The mix as 16-bit FLAC, about half the size of WAV. */
export const flacOf = (audio: AudioBuffer) =>
  encodeFlac(
    Array.from({ length: Math.min(2, audio.numberOfChannels) }, (_, c) => audio.getChannelData(c)),
    audio.sampleRate,
  );
