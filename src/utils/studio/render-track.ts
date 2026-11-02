import type { TimelineState } from '@toneflix/studio';
import type { Stem } from 'src/utils/daw';
import type { FaustEffect } from 'src/utils/requests/effects';
import { addFaustEffects, parseEffects, type StemEffect } from './effects';
import { flacOf, renderMix } from './mix';
import { effectsToRack, rackLoader } from './rack-effects';
import { stemChannel, stemSource, stemToClips, stemToTrack } from './stem-timeline';

/** A saved track as the render page mixes it. */
export interface RenderTrack {
  bpm: number;
  timeSignature: string;
  /** Master volume, 0 to 1 */
  mixVolume: number;
  /** Master effects, as JSON text like a stem's `meta.effects` */
  masterEffects: string;
  stems: Stem[];
}

export interface MixTrackOptions {
  /** Whether Web Audio Module plugins may load */
  plugins: boolean;
  faust?: FaustEffect[];
}

/**
 * Mix a saved track exactly as the studio plays it, without the editor:
 * every stem's clips, volume, pan, mute, solo and effects, then the master.
 * Returns the mix as FLAC, or null when there is nothing to mix.
 */
export const mixTrack = async (track: RenderTrack, options: MixTrackOptions): Promise<Blob | null> => {
  const s = await import('@toneflix/studio');
  if (options.faust?.length) addFaustEffects(options.faust);

  const engine = new s.AudioEngine();
  const rack = new s.PluginRack(engine, { load: rackLoader(() => options.plugins) });

  try {
    const stems = [...track.stems].sort((a, b) => (a.meta?.order ?? Infinity) - (b.meta?.order ?? Infinity));

    await Promise.all(
      stems.map(async (stem) => {
        const res = await fetch(stem.src);
        if (!res.ok) throw new Error(`"${stem.title || stem.id}" couldn't be downloaded (${res.status}).`);

        engine.setBuffer(stemSource(stem.id), await engine.context.decodeAudioData(await res.arrayBuffer()));
      }),
    );

    let state: TimelineState = { tracks: [], clips: [] };
    const lengthOf = (source: string) => engine.getBuffer(source)?.duration;

    stems.forEach((stem, i) => {
      const lane = stemToTrack(stem, i);
      state = s.addClips(s.addTrack(state, lane), stemToClips(stem, lane.id, lengthOf));
    });
    engine.load(state);

    engine.mixer.set(null, { volume: track.mixVolume });
    await loadChain(rack, null, parseEffects(track.masterEffects));
    for (const [i, stem] of stems.entries()) {
      const id = state.tracks[i]!.id;
      engine.mixer.set(id, stemChannel(stem.meta));
      await loadChain(rack, id, parseEffects(stem.meta?.effects));
    }

    const [beats, unit] = (track.timeSignature || '4/4').split('/').map(Number) as [number, number];
    const audio = await renderMix(engine, rack, { bpm: track.bpm || 120, beats: beats || 4, unit: unit || 4 });

    return audio ? flacOf(audio) : null;
  } finally {
    rack.destroy();
    engine.destroy();
  }
};

/** Put a saved effect chain on a track, or the master with null. */
const loadChain = async (rack: import('@toneflix/studio').PluginRack, track: string | null, list: StemEffect[]) => {
  for (const saved of effectsToRack(list)) {
    const slot = await rack.add(track, saved.url, { state: saved.state, bypass: saved.bypass });
    // Many plugins only take their settings once made.
    if (saved.state !== undefined) await slot.plugin.audioNode.setState(saved.state).catch(() => undefined);
  }
};
