import { createClip, type AudioClip, type ClipTrack } from '@waveform-playlist/core';
import type { StemClip } from 'src/utils/daw';

type Engine = {
  getState(): { tracks: ClipTrack[]; canUndo: boolean; canRedo: boolean };
  updateTrack(trackId: string, track: ClipTrack): void;
};

/** The engine's private undo and redo stacks, each entry a copy of every track. */
type History = { _undoStack: ClipTrack[][]; _redoStack: ClipTrack[][] };

/** How long a placeholder clip is when the stem doesn't say */
const FALLBACK_SECONDS = 30;

/**
 * Silent stand-ins for stems whose audio is still loading or couldn't be
 * loaded, so every stem keeps its row and clips on the timeline. When the
 * audio arrives it takes the silence's place in the same clips, keeping any
 * edits made meanwhile, without adding an undo step.
 */
export class StemPlaceholders {
  /** One silent buffer, grown when a longer stem needs it */
  private silence: AudioBuffer | null = null;
  private silent = new WeakSet<AudioBuffer>();
  /** Clips that run to the end of their audio, whose real length isn't known yet */
  private openEnded = new Set<string>();

  constructor(private context: BaseAudioContext) {}

  /** Whether a clip still plays silence. */
  isPlaceholder(clip: AudioClip) {
    return !!clip.audioBuffer && this.silent.has(clip.audioBuffer);
  }

  /** Silent clips laid out like a stem's saved clips. */
  clips(clips: StemClip[], name: string): AudioClip[] {
    const rate = this.context.sampleRate;
    const seconds = Math.max(
      1,
      ...clips.map((c) => c.offset + (c.duration || FALLBACK_SECONDS)),
    );
    const buffer = this.buffer(seconds);

    return clips.map((c) => {
      const offsetSamples = Math.round(c.offset * rate);
      const clip = createClip({
        audioBuffer: buffer,
        name,
        startSample: Math.round(c.start * rate),
        offsetSamples,
        durationSamples: Math.round((c.duration || FALLBACK_SECONDS) * rate),
        gain: c.gain ?? 1,
        fadeIn: c.fadeIn ? { duration: c.fadeIn, type: 'linear' } : undefined,
        fadeOut: c.fadeOut ? { duration: c.fadeOut, type: 'linear' } : undefined,
      });
      if (!c.duration) this.openEnded.add(clip.id);

      return clip;
    });
  }

  /** Put the real audio into a track's silent clips. */
  fill(engine: Engine, trackId: string, audio: AudioBuffer) {
    const swap = (clip: AudioClip): AudioClip => {
      if (!this.isPlaceholder(clip)) return clip;

      const room = Math.max(0, audio.length - clip.offsetSamples);
      return {
        ...clip,
        audioBuffer: audio,
        sampleRate: audio.sampleRate,
        sourceDurationSamples: audio.length,
        durationSamples: this.openEnded.has(clip.id) ? room : Math.min(clip.durationSamples, room),
      };
    };
    const patch = (tracks: ClipTrack[]) =>
      tracks.map((t) => (t.id === trackId ? { ...t, clips: t.clips.map(swap) } : t));

    const track = engine.getState().tracks.find((t) => t.id === trackId);
    if (!track) return;

    this.quietly(engine, () => engine.updateTrack(trackId, { ...track, clips: track.clips.map(swap) }), patch);
    track.clips.forEach((c) => this.openEnded.delete(c.id));
  }

  /**
   * Make a change that isn't an undo step. `patch` brings the saved undo and
   * redo states up to date, so stepping through them keeps the change.
   */
  quietly(engine: Engine, change: () => void, patch: (tracks: ClipTrack[]) => ClipTrack[] = (t) => t) {
    const history = engine as unknown as History;
    const undo = [...(history._undoStack ?? [])];
    const redo = [...(history._redoStack ?? [])];

    change();

    history._undoStack = undo.map(patch);
    history._redoStack = redo.map(patch);
  }

  private buffer(seconds: number) {
    const rate = this.context.sampleRate;
    const length = Math.ceil(seconds * rate);
    if (!this.silence || this.silence.length < length) {
      // Rounded up to whole minutes, so most tracks share one buffer.
      this.silence = new AudioBuffer({ length: Math.ceil(seconds / 60) * 60 * rate, sampleRate: rate, numberOfChannels: 1 });
      this.silent.add(this.silence);
    }

    return this.silence;
  }
}
