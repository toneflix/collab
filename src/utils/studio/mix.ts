import { timelineEnd, type AudioEngine, type PluginRack } from '@toneflix/studio';
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
 * Render the whole track as it plays in the studio: every clip, the rack's
 * effects and plugins, volume, pan, mute, solo and the master. Null when
 * there is nothing to mix.
 */
export const renderMix = async (engine: AudioEngine, rack: PluginRack, tempo: MixTempo) => {
  const state = engine.state;
  if (!state.clips.some((c) => c.duration > 0)) return null;

  const audio = await engine.render({
    from: 0,
    to: timelineEnd(state) + TAIL,
    effects: async (track, context, atStart) => {
      const nodes = await rack.renderEffects(track, context, atStart);

      // Tell plugins the song is playing from the start, as the studio's transport does live.
      for (const node of nodes) {
        atStart(() =>
          (node as { scheduleEvents?: (...events: unknown[]) => void }).scheduleEvents?.({
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

      return nodes;
    },
  });

  limit(audio);

  return audio;
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
