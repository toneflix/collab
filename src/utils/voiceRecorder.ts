import { onBeforeUnmount, ref, shallowRef } from 'vue';

export type Recording = {
  blob: Blob;
  /** Seconds */
  duration: number;
  /** Loudness bars from 0 to 1 */
  waveform: number[];
  url: string;
};

/** Bars kept for a voice note's waveform */
const BARS = 48;
/** Longest voice note, in seconds */
export const MAX_RECORDING = 300;

const pickMime = () => {
  if (typeof MediaRecorder === 'undefined') return '';
  const options = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
  return options.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
};

/** Squeeze loudness samples into a fixed number of bars, scaled so the loudest is 1. */
export const toBars = (samples: number[], count = BARS) => {
  if (!samples.length) return Array(count).fill(0.05) as number[];
  const bars = Array.from({ length: count }, (_, i) => {
    const from = Math.floor((i * samples.length) / count);
    const to = Math.max(from + 1, Math.floor(((i + 1) * samples.length) / count));
    const slice = samples.slice(from, to);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  const peak = Math.max(...bars, 0.01);
  return bars.map((v) => Math.max(0.05, Math.round((v / peak) * 100) / 100));
};

/**
 * Record a voice note from the microphone. While recording, `levels` holds
 * the latest loudness readings for a live meter.
 */
export const useVoiceRecorder = () => {
  const recording = ref(false);
  const elapsed = ref(0);
  const levels = ref<number[]>([]);
  const error = ref('');
  const supported =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  const recorder = shallowRef<MediaRecorder | null>(null);
  let stream: MediaStream | null = null;
  let context: AudioContext | null = null;
  let chunks: Blob[] = [];
  let samples: number[] = [];
  let startedAt = 0;
  let timer: ReturnType<typeof setInterval> | undefined;
  let finish: ((value: Recording | null) => void) | null = null;
  let keep = false;
  let onLimit: (() => void) | null = null;

  const cleanup = () => {
    clearInterval(timer);
    stream?.getTracks().forEach((t) => t.stop());
    void context?.close().catch(() => undefined);
    stream = null;
    context = null;
    recorder.value = null;
    recording.value = false;
  };

  /** Start recording. `limitReached` runs when the longest allowed note is reached. */
  const start = async (limitReached?: () => void) => {
    error.value = '';
    if (!supported) {
      error.value = 'This browser can\'t record audio.';
      return false;
    }
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      error.value =
        (e as DOMException)?.name === 'NotAllowedError'
          ? 'Allow microphone access to record a voice note.'
          : 'No microphone was found.';
      return false;
    }

    onLimit = limitReached ?? null;
    chunks = [];
    samples = [];
    levels.value = [];
    elapsed.value = 0;

    const mimeType = pickMime();
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      const duration = (performance.now() - startedAt) / 1000;
      const blob = new Blob(chunks, { type: rec.mimeType || mimeType || 'audio/webm' });
      const result = keep && blob.size
        ? { blob, duration, waveform: toBars(samples), url: URL.createObjectURL(blob) }
        : null;
      cleanup();
      finish?.(result);
      finish = null;
    };

    // A meter from the same input, sampled ten times a second.
    context = new AudioContext();
    const analyser = context.createAnalyser();
    analyser.fftSize = 512;
    context.createMediaStreamSource(stream).connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    startedAt = performance.now();
    rec.start(250);
    recorder.value = rec;
    recording.value = true;

    timer = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (const v of data) sum += ((v - 128) / 128) ** 2;
      const level = Math.min(1, Math.sqrt(sum / data.length) * 4);
      samples.push(level);
      levels.value = [...levels.value.slice(-39), level];
      elapsed.value = (performance.now() - startedAt) / 1000;
      if (elapsed.value >= MAX_RECORDING) onLimit?.();
    }, 100);

    return true;
  };

  /** Stop and get the recording (null when it was empty). */
  const stop = () =>
    new Promise<Recording | null>((resolve) => {
      if (!recorder.value || recorder.value.state === 'inactive') return resolve(null);
      keep = true;
      finish = resolve;
      recorder.value.stop();
    });

  /** Stop and throw the recording away. */
  const cancel = () => {
    if (!recorder.value || recorder.value.state === 'inactive') return cleanup();
    keep = false;
    finish = null;
    recorder.value.stop();
  };

  onBeforeUnmount(cancel);

  return { supported, recording, elapsed, levels, error, start, stop, cancel };
};
