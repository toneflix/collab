import { createEffectInstance, type SerializedEffectEntry } from '@dawcore/components';

/** One clip as the engine keeps it. */
export interface PrintClip {
  audioBuffer?: AudioBuffer;
  sampleRate: number;
  startSample: number;
  offsetSamples: number;
  durationSamples: number;
  gain?: number;
  fadeIn?: { duration: number };
  fadeOut?: { duration: number };
}

/** The track's tempo and meter, so tempo-synced plugins lock to it. */
export interface PrintTempo {
  bpm: number;
  beats: number;
  unit: number;
}

/** Seconds kept after the last clip, so echoes and reverb can ring out. */
const TAIL = 4;

/**
 * Render a stem's clips through its effect chain, plugins included, the way
 * it plays in the studio before volume and pan. The audio starts at `start`
 * seconds on the timeline.
 */
export const printStem = async (clips: PrintClip[], chain: SerializedEffectEntry[], tempo: PrintTempo) => {
  const playable = clips.filter((c) => c.audioBuffer && c.durationSamples > 0);
  if (!playable.length) return null;

  const rate = playable[0]!.sampleRate;
  const start = Math.min(...playable.map((c) => c.startSample / c.sampleRate));
  const end = Math.max(...playable.map((c) => (c.startSample + c.durationSamples) / c.sampleRate));
  const ctx = new OfflineAudioContext({
    numberOfChannels: 2,
    length: Math.ceil((end - start + TAIL) * rate),
    sampleRate: rate,
  });
  const cleanups: (() => void)[] = [];

  try {
    const input = ctx.createGain();
    const plugins: { scheduleEvents?: (...events: unknown[]) => void }[] = [];
    let previous: AudioNode = input;

    for (const entry of chain) {
      if (entry.placeholder) continue;
      if (entry.kind === 'native') {
        const created = createEffectInstance(entry.type, ctx, entry.params);
        if (entry.bypassed && !created.wetParam) {
          created.instance.dispose?.();
          continue;
        }
        if (entry.bypassed && created.wetParam) created.instance.applyParams({ [created.wetParam]: 0 });
        if (created.instance.dispose) cleanups.push(created.instance.dispose);
        previous.connect(created.instance.input);
        previous = created.instance.output;
        continue;
      }
      if (entry.bypassed) continue;

      const wam = await import('@dawcore/wam');
      const { hostGroupId } = await wam.ensureWamHost(ctx);
      let plugin;
      if (entry.faustDsp !== undefined) {
        const { compileFaustToWam } = await import('@dawcore/faust');
        const compiled = await compileFaustToWam(entry.faustDsp, { name: entry.faustName });
        const factory = compiled.factory as unknown as Parameters<typeof wam.createWamInstanceFromFactory>[0];
        plugin = await wam.createWamInstanceFromFactory(factory, ctx, hostGroupId, {
          initialState: entry.state,
          label: compiled.name,
        });
      } else {
        plugin = await wam.createWamInstance(entry.url ?? '', ctx, hostGroupId, { initialState: entry.state });
      }
      const live = plugin;
      cleanups.push(() => void live.destroy());
      plugins.push(plugin.audioNode as unknown as (typeof plugins)[number]);
      previous.connect(plugin.audioNode);
      previous = plugin.audioNode;
    }
    previous.connect(ctx.destination);

    // Tell plugins the song is playing from `start`, as the studio's transport does live.
    const bar = (tempo.beats * 60 * 4) / (tempo.bpm * tempo.unit);
    const currentBar = Math.floor(start / bar);
    plugins.forEach((node) =>
      node.scheduleEvents?.({
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

    for (const clip of playable) {
      const when = clip.startSample / clip.sampleRate - start;
      const duration = clip.durationSamples / clip.sampleRate;
      const gain = clip.gain ?? 1;
      const fadeIn = Math.min(clip.fadeIn?.duration ?? 0, duration);
      const fadeOut = Math.min(clip.fadeOut?.duration ?? 0, duration - fadeIn);
      const source = ctx.createBufferSource();
      source.buffer = clip.audioBuffer!;
      const level = ctx.createGain();
      level.gain.setValueAtTime(fadeIn > 0 ? 0 : gain, when);
      if (fadeIn > 0) level.gain.linearRampToValueAtTime(gain, when + fadeIn);
      if (fadeOut > 0) {
        level.gain.setValueAtTime(gain, when + duration - fadeOut);
        level.gain.linearRampToValueAtTime(0, when + duration);
      }
      source.connect(level).connect(input);
      source.start(when, clip.offsetSamples / clip.sampleRate, duration);
    }

    const audio = await ctx.startRendering();

    return { audio, start };
  } finally {
    cleanups.forEach((fn) => {
      try {
        fn();
      } catch {
        // Already gone.
      }
    });
  }
};

/** 16-bit stereo WAV of an AudioBuffer. */
export const wavOf = (audio: AudioBuffer) => {
  const channels = Math.min(2, audio.numberOfChannels);
  const frames = audio.length;
  const data = new DataView(new ArrayBuffer(44 + frames * channels * 2));
  const text = (at: number, s: string) => [...s].forEach((c, i) => data.setUint8(at + i, c.charCodeAt(0)));

  text(0, 'RIFF');
  data.setUint32(4, 36 + frames * channels * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  data.setUint32(16, 16, true);
  data.setUint16(20, 1, true);
  data.setUint16(22, channels, true);
  data.setUint32(24, audio.sampleRate, true);
  data.setUint32(28, audio.sampleRate * channels * 2, true);
  data.setUint16(32, channels * 2, true);
  data.setUint16(34, 16, true);
  text(36, 'data');
  data.setUint32(40, frames * channels * 2, true);

  const samples = Array.from({ length: channels }, (_, c) => audio.getChannelData(c));
  let at = 44;
  for (let i = 0; i < frames; i++) {
    for (const channel of samples) {
      const s = Math.max(-1, Math.min(1, channel[i]!));
      data.setInt16(at, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      at += 2;
    }
  }

  return new Blob([data.buffer], { type: 'audio/wav' });
};

/** A short fingerprint of what a print was made from. */
export const printKey = async (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const hash = await crypto.subtle.digest('SHA-1', bytes);

  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
};
