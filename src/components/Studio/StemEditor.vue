<template>
  <div
    class="stem-editor"
    :class="{ 'stem-editor--drop': dropping }"
    @dragover.prevent="dropping = canDrop"
    @dragleave.self="dropping = false"
    @drop.prevent="onDrop"
  >
    <!-- Transport, editing and zoom -->
    <div class="stem-editor__toolbar">
      <div class="stem-editor__group">
        <q-btn flat round dense :icon="ionPlaySkipBack" aria-label="Back to start" :disable="!ready" @click="toStart">
          <q-tooltip>Back to start</q-tooltip>
        </q-btn>
        <q-btn
          round
          unelevated
          color="glass"
          class="white-glass !flex-none"
          :aria-label="playing ? 'Pause' : 'Play'"
          :disable="!ready"
          @click="togglePlay"
        >
          <q-icon size="22px" :name="playing ? ionPause : ionPlay" />
          <q-tooltip>{{ playing ? 'Pause' : 'Play' }} (Space)</q-tooltip>
        </q-btn>
        <q-btn flat round dense :icon="ionStop" aria-label="Stop" :disable="!ready" @click="stop">
          <q-tooltip>Stop</q-tooltip>
        </q-btn>
        <div class="stem-editor__clock" aria-live="off">
          {{ formatClock(time) }} <span class="text-grey-6">/ {{ formatClock(duration) }}</span>
        </div>
        <q-btn
          flat
          round
          dense
          :icon="ionRepeat"
          :class="{ 'text-toneflix': loop }"
          :aria-label="loop ? 'Stop looping the selection' : 'Loop the selection'"
          :disable="!ready || !hasSelection"
          @click="toggleLoop"
        >
          <q-tooltip>{{ hasSelection ? (loop ? 'Looping the selection' : 'Loop the selection') : 'Drag across the timeline to select a part to loop' }}</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          :icon="ionChatbubbleEllipses"
          aria-label="Message about the selected part"
          :disable="!ready || !hasSelection"
          @click="messageAboutSelection"
          v-if="commentable"
        >
          <q-tooltip>{{ hasSelection ? 'Message about this part' : 'Drag across the timeline to select a part to talk about' }}</q-tooltip>
        </q-btn>
      </div>

      <div class="stem-editor__group" v-if="!readonly">
        <q-btn flat round dense :icon="ionCut" aria-label="Split at the playhead" :disable="!ready || !selectedTrackId" @click="split">
          <q-tooltip>Split the selected stem at the playhead (S)</q-tooltip>
        </q-btn>
        <q-btn flat round dense :icon="ionArrowUndo" aria-label="Undo" :disable="!canUndo" @click="undo">
          <q-tooltip>Undo (Ctrl+Z)</q-tooltip>
        </q-btn>
        <q-btn flat round dense :icon="ionArrowRedo" aria-label="Redo" :disable="!canRedo" @click="redo">
          <q-tooltip>Redo (Ctrl+Shift+Z)</q-tooltip>
        </q-btn>
      </div>

      <div class="stem-editor__group">
        <q-btn flat round dense :icon="ionRemove" aria-label="Zoom out" :disable="!ready || zoom >= zoomLevels.length - 1" @click="setZoom(zoom + 1)">
          <q-tooltip>Zoom out</q-tooltip>
        </q-btn>
        <q-btn flat round dense :icon="ionScan" aria-label="Fit to screen" :disable="!ready" @click="fit">
          <q-tooltip>Fit everything on screen</q-tooltip>
        </q-btn>
        <q-btn flat round dense :icon="ionAdd" aria-label="Zoom in" :disable="!ready || zoom <= 0" @click="setZoom(zoom - 1)">
          <q-tooltip>Zoom in</q-tooltip>
        </q-btn>
      </div>

      <div class="stem-editor__group stem-editor__master">
        <q-icon :name="masterVolume ? ionVolumeHigh : ionVolumeMute" size="20px" class="!flex-none" />
        <q-slider
          dense
          color="toneflix"
          track-size="3px"
          thumb-size="12px"
          :min="0"
          :max="100"
          :model-value="masterVolume"
          :disable="!ready"
          aria-label="Master volume"
          @update:model-value="setMasterVolume"
        />
        <q-btn flat round dense :icon="ionHelpCircleOutline" aria-label="How to use the editor" class="max-sm:!hidden">
          <q-menu dark anchor="bottom right" self="top right" class="p-4 max-w-80">
            <div class="mb-2 font-bold">Using the editor</div>
            <ul class="pl-4 space-y-1 text-sm list-disc">
              <li><b>Space</b> plays and pauses.</li>
              <li>Click the timeline to move the playhead. Drag across it to select a part, then loop it.</li>
              <li v-if="!readonly">Drag a stem's clip to move it. Drag its edges to trim it.</li>
              <li v-if="!readonly">Click a stem, then <b>S</b> splits it at the playhead.</li>
              <li v-if="!readonly"><b>Ctrl+Z</b> undoes, <b>Ctrl+Shift+Z</b> redoes.</li>
              <li>Each stem has its own volume, pan, mute (M) and solo (S).</li>
              <li v-if="!readonly">Drop audio files here to upload them as stems.</li>
            </ul>
          </q-menu>
        </q-btn>
      </div>
    </div>

    <!-- Fades for the selected stem. Always shown, so the timeline doesn't jump. -->
    <div class="stem-editor__selected" v-if="!readonly">
      <template v-if="selected">
        <div class="font-bold truncate !flex-none max-w-40">{{ selected.name }}</div>
        <label class="stem-editor__fade">
          <span>Fade in</span>
          <q-slider dense color="toneflix" :min="0" :max="maxFade" :step="0.1" v-model="fade.in" @change="applyFades" />
          <span class="w-10 text-right">{{ fade.in.toFixed(1) }}s</span>
        </label>
        <label class="stem-editor__fade">
          <span>Fade out</span>
          <q-slider dense color="toneflix" :min="0" :max="maxFade" :step="0.1" v-model="fade.out" @change="applyFades" />
          <span class="w-10 text-right">{{ fade.out.toFixed(1) }}s</span>
        </label>
      </template>
      <div class="text-grey-5" v-else>Click a stem to fade it in or out.</div>
    </div>

    <div ref="host" class="stem-editor__host" />

    <div class="stem-editor__dropzone" v-if="dropping">
      <q-icon :name="ionCloudUpload" size="40px" />
      <div class="mt-2 text-lg font-bold">Drop audio files to add them as stems</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ionAdd,
  ionChatbubbleEllipses,
  ionArrowRedo,
  ionArrowUndo,
  ionCloudUpload,
  ionCut,
  ionHelpCircleOutline,
  ionPause,
  ionPlay,
  ionPlaySkipBack,
  ionRemove,
  ionRepeat,
  ionScan,
  ionStop,
  ionVolumeHigh,
  ionVolumeMute,
} from '@quasar/extras/ionicons-v8';
import type { DawEditorElement } from '@dawcore/components';
import type { NativePlayoutAdapter } from '@dawcore/transport';
import type { ClipTrack } from '@waveform-playlist/core';
import type { EngineState } from '@waveform-playlist/engine';
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import { useQuasar } from 'quasar';
import { usePlayerStore } from 'src/stores/player-store';
import { notify } from 'src/utils/helpers';
import { encodeMp3, encodeWav, formatClock, mixdown, Stem, StemMeta, stemClips, stemToTrack, trackToMeta } from 'src/utils/daw';
import { allowedAudioExts } from 'src/utils/presets';

/**
 * A multi-track stem editor built on the dawcore web components
 * (waveform-playlist). Each stem is one track. Stems can be moved, trimmed,
 * split, faded, mixed (volume, pan, mute, solo) and played in a loop.
 */
const props = defineProps<{
  stems: Stem[];
  /** Viewing only: no editing, removing or dropping files */
  readonly?: boolean;
  /** Show the button for messaging about a selected part */
  commentable?: boolean;
}>();

const emit = defineEmits<{
  /** A stem's remove button was pressed; the parent confirms and deletes it */
  remove: [stem: Stem];
  /** Audio files were dropped on the editor */
  files: [files: File[]];
  /** Whether there are changes since the last save */
  dirty: [dirty: boolean];
  /** Stems this person changed, to share with everyone else on the track */
  change: [stems: Record<string, StemMeta>];
  /** Someone wants to message about the selected part */
  comment: [region: { start: number; end: number; stemId?: string | number; stemName?: string }];
  ready: [];
}>();

const $q = useQuasar();
const host = ref<HTMLElement>();
const editor = shallowRef<DawEditorElement>();
let adapter: NativePlayoutAdapter | null = null;
let context: AudioContext | null = null;

const zoomLevels = [128, 256, 512, 1024, 2048, 4096, 8192];

const ready = ref(false);
const playing = ref(false);
const time = ref(0);
const duration = ref(0);
const zoom = ref(4);
const canUndo = ref(false);
const canRedo = ref(false);
const loop = ref(false);
const selection = ref<{ start: number; end: number } | null>(null);
const selectedTrackId = ref<string | null>(null);
const masterVolume = ref(100);
const dropping = ref(false);
const fade = reactive({ in: 0, out: 0 });

/** Track id in the editor → stem */
const tracks = new Map<string, Stem>();
/** Each stem's saved state, to tell when there are unsaved changes */
let saved: Record<string, string> = {};
/** Each stem's state as others last saw it, so only new changes are shared */
let shared: Record<string, string> = {};
let shareTimer: ReturnType<typeof setTimeout> | undefined;

const hasSelection = computed(() => !!selection.value && selection.value.end - selection.value.start > 0.05);
const canDrop = computed(() => !props.readonly);

const engineTrack = (trackId: string | null): ClipTrack | undefined =>
  trackId ? editor.value?.engine?.getState().tracks.find((t) => t.id === trackId) : undefined;

const selected = computed(() => {
  const id = selectedTrackId.value;
  return id && tracks.has(id) ? { id, name: tracks.get(id)!.title || tracks.get(id)!.name } : null;
});

const maxFade = computed(() => {
  const track = engineTrack(selected.value?.id ?? null);
  const first = track?.clips[0];
  return first ? Math.max(0.5, Math.floor((first.durationSamples / first.sampleRate) * 10) / 10) : 10;
});

/** The stems' `meta`, read from the editor, keyed by stem id. */
const snapshot = (): Record<string, StemMeta> => {
  const out: Record<string, StemMeta> = {};
  const state = editor.value?.engine?.getState();
  if (!state) return out;

  for (const track of state.tracks) {
    const stem = tracks.get(track.id);
    if (stem) out[String(stem.id)] = trackToMeta(stem, track);
  }
  return out;
};

/**
 * Share what changed since the last share. Runs shortly after the last edit,
 * so a drag sends a few updates rather than one per frame.
 */
const scheduleShare = () => {
  if (props.readonly) return;
  clearTimeout(shareTimer);
  shareTimer = setTimeout(() => {
    const changed: Record<string, StemMeta> = {};
    for (const [id, meta] of Object.entries(snapshot())) {
      const json = JSON.stringify(meta);
      if (shared[id] === undefined) shared[id] = json;
      else if (shared[id] !== json) {
        shared[id] = json;
        changed[id] = meta;
      }
    }
    if (Object.keys(changed).length) emit('change', changed);
  }, 150);
};

const checkDirty = () => {
  if (!ready.value) return;
  scheduleShare();
  const now = snapshot();
  let dirty = false;
  for (const [id, meta] of Object.entries(now)) {
    const json = JSON.stringify(meta);
    // A stem seen for the first time (just loaded or uploaded) is saved as is.
    saved[id] ??= json;
    if (saved[id] !== json) dirty = true;
  }
  emit('dirty', dirty);
};

/** Call after saving, so the current state counts as saved. */
const markSaved = () => {
  saved = Object.fromEntries(Object.entries(snapshot()).map(([id, meta]) => [id, JSON.stringify(meta)]));
  shared = { ...saved };
  emit('dirty', false);
};

const trackIdOf = (stemId: string | number) => {
  for (const [trackId, stem] of tracks) if (String(stem.id) === String(stemId)) return trackId;
  return null;
};

const newClipId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `clip-${Date.now()}-${Math.random()}`;

/**
 * Show a change someone else made to a stem: its clips, fades, volume, pan,
 * mute and solo. The audio already loaded is reused. With `asSaved`, the
 * result also counts as saved (they saved it). Otherwise it only counts as
 * unsaved here if this person had their own unsaved changes on that stem.
 */
const applyRemote = (stemId: string | number, meta: StemMeta, asSaved = false) => {
  const engine = editor.value?.engine;
  const trackId = trackIdOf(stemId);
  const track = engineTrack(trackId);
  const stem = trackId ? tracks.get(trackId) : undefined;
  if (!engine || !trackId || !track?.clips.length || !stem) return;

  const id = String(stemId);
  const before = snapshot()[id];
  const wasDirty = !!before && saved[id] !== undefined && saved[id] !== JSON.stringify(before);

  const current = [...track.clips].sort((a, b) => a.startSample - b.startSample);
  const template = current[0]!;
  const rate = template.sampleRate;
  const sourceLength = template.audioBuffer?.length ?? template.sourceDurationSamples;
  const incoming = stemClips({ ...stem.meta, ...meta, clips: meta.clips });

  const clips = incoming.map((c, i) => {
    const base = current[i] ?? template;
    const offsetSamples = Math.round(c.offset * rate);
    const durationSamples = c.duration
      ? Math.round(c.duration * rate)
      : Math.max(0, sourceLength - offsetSamples);
    return {
      ...base,
      id: current[i]?.id ?? newClipId(),
      startSample: Math.round(c.start * rate),
      // Recomputed from startSample by the engine.
      startTick: undefined,
      offsetSamples,
      durationSamples,
      gain: c.gain ?? 1,
      fadeIn: c.fadeIn ? { duration: c.fadeIn, type: 'linear' as const } : undefined,
      fadeOut: c.fadeOut ? { duration: c.fadeOut, type: 'linear' as const } : undefined,
    };
  });

  const layout = (list: typeof clips | ClipTrack['clips']) =>
    JSON.stringify(
      [...list]
        .sort((a, b) => a.startSample - b.startSample)
        .map((c) => [c.startSample, c.offsetSamples, c.durationSamples, c.gain, c.fadeIn?.duration ?? 0, c.fadeOut?.duration ?? 0]),
    );

  if (layout(clips) !== layout(track.clips)) engine.updateTrack(trackId, { ...track, clips });

  // Through the editor, so the track's controls move too.
  const mixer: { volume?: number; pan?: number; muted?: boolean; soloed?: boolean } = {};
  if (meta.gain !== undefined && Math.abs(meta.gain - track.volume) > 0.001) mixer.volume = meta.gain;
  if (meta.stereoPan !== undefined && Math.abs(meta.stereoPan - track.pan) > 0.001) mixer.pan = meta.stereoPan;
  if (meta.muted !== undefined && !!meta.muted !== track.muted) mixer.muted = !!meta.muted;
  if (meta.soloed !== undefined && !!meta.soloed !== track.soloed) mixer.soloed = !!meta.soloed;
  if (Object.keys(mixer).length) editor.value?.updateTrack(trackId, mixer);

  stem.meta = { ...stem.meta, ...meta };

  // The track controls hand changes to the engine a moment later, so work
  // out the resulting state rather than reading it back now.
  const after = JSON.stringify(
    trackToMeta(stem, {
      ...track,
      clips: layout(clips) !== layout(track.clips) ? clips : track.clips,
      volume: mixer.volume ?? track.volume,
      pan: mixer.pan ?? track.pan,
      muted: mixer.muted ?? track.muted,
      soloed: mixer.soloed ?? track.soloed,
    }),
  );
  // Already seen by everyone, so not shared again.
  shared[id] = after;
  if (asSaved || !wasDirty) saved[id] = after;
  if (selectedTrackId.value === trackId) syncFades();
  checkDirty();
};

const onState = (state: EngineState) => {
  canUndo.value = state.canUndo;
  canRedo.value = state.canRedo;
  duration.value = state.duration;
  if (!playing.value) time.value = state.currentTime;
  checkDirty();
};

const syncFades = () => {
  const track = engineTrack(selectedTrackId.value);
  if (!track?.clips.length) return;
  const clips = [...track.clips].sort((a, b) => a.startSample - b.startSample);
  fade.in = clips[0]!.fadeIn?.duration ?? 0;
  fade.out = clips[clips.length - 1]!.fadeOut?.duration ?? 0;
};

/**
 * Set fades on a track's clips in the engine. `fades` pairs with the clips
 * in timeline order.
 */
const setFades = (trackId: string, fades: { fadeIn?: number; fadeOut?: number }[]) => {
  const engine = editor.value?.engine;
  const track = engineTrack(trackId);
  if (!engine || !track?.clips.length) return;

  const order = [...track.clips].sort((a, b) => a.startSample - b.startSample).map((c) => c.id);
  engine.updateTrack(track.id, {
    ...track,
    clips: track.clips.map((c) => {
      const f = fades[order.indexOf(c.id)] ?? {};
      return {
        ...c,
        fadeIn: f.fadeIn ? { duration: f.fadeIn, type: 'linear' as const } : undefined,
        fadeOut: f.fadeOut ? { duration: f.fadeOut, type: 'linear' as const } : undefined,
      };
    }),
  });
};

/** Fade in the selected stem's first clip and fade out its last one. */
const applyFades = () => {
  const track = engineTrack(selectedTrackId.value);
  if (!track?.clips.length) return;
  const count = track.clips.length;
  setFades(
    track.id,
    Array.from({ length: count }, (_, i) => ({
      fadeIn: i === 0 ? fade.in : 0,
      fadeOut: i === count - 1 ? fade.out : 0,
    })),
  );
  checkDirty();
};

const togglePlay = async () => {
  const ed = editor.value;
  if (!ed) return;
  if (playing.value) return ed.pause();

  if (loop.value && selection.value) {
    const { start, end } = selection.value;
    const from = time.value >= start && time.value < end ? time.value : start;
    await ed.play(from);
  } else {
    await ed.play();
  }
};

const stop = () => editor.value?.stop();

const toStart = () => {
  const ed = editor.value;
  if (!ed) return;
  if (playing.value) {
    ed.stop();
    void ed.play(0);
  } else {
    ed.seekTo(0);
    time.value = 0;
  }
};

const toggleLoop = () => {
  const engine = editor.value?.engine;
  if (!engine || !selection.value) return;
  loop.value = !loop.value;
  if (loop.value) engine.setLoopRegion(selection.value.start, selection.value.end);
  engine.setLoopEnabled(loop.value);
};

const split = () => {
  if (!editor.value?.splitAtPlayhead()) {
    notify('Move the playhead over the selected stem to split it.', 'info');
  }
};

/** The stem row a pointer last went down on, so a selection knows which stem it's on */
let pointerTrackId: string | null = null;
let selectionTrackId: string | null = null;

const onPointerDown = (e: Event) => {
  const row = e.composedPath().find((el) => el instanceof HTMLElement && el.dataset?.trackId) as HTMLElement | undefined;
  pointerTrackId = row?.dataset.trackId ?? null;
};

const messageAboutSelection = () => {
  if (!selection.value) return;
  const id = selectionTrackId ?? selectedTrackId.value;
  const stem = id ? tracks.get(id) : undefined;
  emit('comment', {
    start: Math.round(selection.value.start * 1000) / 1000,
    end: Math.round(selection.value.end * 1000) / 1000,
    ...(stem ? { stemId: stem.id, stemName: stem.title || stem.name } : {}),
  });
};

/**
 * Show a part of the track: select it, move the playhead to its start,
 * scroll it into view and flash a colour over it that fades away. With a
 * stem, only that stem's row is coloured.
 */
const highlight = (region: { start: number; end: number; stemId?: string | number | null }) => {
  const ed = editor.value;
  const root = ed?.shadowRoot;
  if (!ed || !root || !ready.value) return false;

  const start = Math.max(0, region.start);
  const end = Math.max(start + 0.05, region.end);
  ed.setSelection(start, end);
  selection.value = { start, end };
  if (!playing.value) {
    ed.seekTo(start);
    time.value = start;
  }

  const rate = ed.effectiveSampleRate || ed.sampleRate;
  const left = (start * rate) / ed.samplesPerPixel;
  const width = Math.max(4, ((end - start) * rate) / ed.samplesPerPixel);

  const trackId = region.stemId ? trackIdOf(region.stemId) : null;
  const row = trackId ? root.querySelector<HTMLElement>(`.track-row[data-track-id="${trackId}"]`) : null;
  const target = row ?? root.querySelector<HTMLElement>('.timeline');
  const area = root.querySelector<HTMLElement>('.scroll-area');
  if (!target) return false;

  if (area) {
    area.scrollTo({
      left: Math.max(0, left - Math.max(24, (area.clientWidth - width) / 2)),
      top: row ? Math.max(0, row.offsetTop - 8) : area.scrollTop,
      behavior: 'smooth',
    });
  }
  host.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  const overlay = document.createElement('div');
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'absolute',
    top: '0',
    bottom: '0',
    left: `${left}px`,
    width: `${width}px`,
    zIndex: '20',
    pointerEvents: 'none',
    borderRadius: '4px',
    background: 'rgba(255, 196, 0, 0.32)',
    boxShadow: 'inset 0 0 0 2px rgba(255, 196, 0, 0.95), 0 0 24px rgba(255, 196, 0, 0.45)',
  });
  target.appendChild(overlay);
  overlay
    .animate(
      [
        { opacity: 0 },
        { opacity: 1, offset: 0.08 },
        { opacity: 1, offset: 0.55 },
        { opacity: 0 },
      ],
      { duration: 3200, easing: 'ease-out' },
    )
    .finished.finally(() => overlay.remove());
  return true;
};

const undo = () => editor.value?.undo();
const redo = () => editor.value?.redo();

const setZoom = (index: number) => {
  const ed = editor.value;
  if (!ed) return;
  zoom.value = Math.max(0, Math.min(zoomLevels.length - 1, index));
  ed.samplesPerPixel = zoomLevels[zoom.value]!;
};

/** Pick the closest zoom that shows the whole project. */
const fit = () => {
  const ed = editor.value;
  if (!ed || !host.value) return;
  const controls = $q.screen.lt.sm ? 110 : 180;
  const width = Math.max(200, host.value.clientWidth - controls - 16);
  const needed = (duration.value * ed.sampleRate) / width;
  const index = zoomLevels.findIndex((spp) => spp >= needed);
  setZoom(index === -1 ? zoomLevels.length - 1 : index);
};

const setMasterVolume = (value: number | null) => {
  masterVolume.value = value ?? 0;
  editor.value?.engine?.setMasterVolume(masterVolume.value / 100);
};

/** Stem ids already in the editor, so a stem is never added twice */
const added = new Set<string>();

const addStem = async (stem: Stem) => {
  const ed = editor.value;
  // Before the editor is up, stems come in through the `stems` prop.
  if (!ed || added.has(String(stem.id))) return;
  added.add(String(stem.id));
  const el = await ed.addTrack(stemToTrack(stem));
  tracks.set(el.trackId, stem);
  // The editor doesn't load fades from clips yet, so they are set on the engine.
  const clips = stemClips(stem.meta || ({} as StemMeta));
  if (clips.some((c) => c.fadeIn || c.fadeOut)) setFades(el.trackId, clips);
  return el.trackId;
};

const removeStem = (stemId: string | number) => {
  for (const [trackId, stem] of tracks) {
    if (String(stem.id) === String(stemId)) {
      editor.value?.removeTrack(trackId);
      tracks.delete(trackId);
      added.delete(String(stemId));
      if (selectedTrackId.value === trackId) selectedTrackId.value = null;
    }
  }
  delete saved[String(stemId)];
  delete shared[String(stemId)];
  checkDirty();
};

const renameStem = (stemId: string | number, title: string) => {
  for (const [trackId, stem] of tracks) {
    if (String(stem.id) !== String(stemId)) continue;
    stem.title = title;
    // The track controls read the track element; clip headers read the engine.
    editor.value?.updateTrack(trackId, { name: title });
    const track = engineTrack(trackId);
    if (track) {
      editor.value?.engine?.updateTrack(trackId, {
        ...track,
        name: title,
        clips: track.clips.map((c) => ({ ...c, name: title })),
      });
    }
  }
};

/** Mix every stem down to one audio file: MP3, or WAV if MP3 can't be made. */
const render = async (): Promise<File> => {
  const ed = editor.value;
  if (!ed) throw new Error('The editor is not ready.');
  const state = ed.engine?.getState();
  if (!state) throw new Error('The editor is not ready.');
  const mix = await mixdown(state.tracks, masterVolume.value / 100, ed.sampleRate || 44100);
  try {
    return new File([await encodeMp3(mix)], 'preview.mp3', { type: 'audio/mpeg' });
  } catch (e) {
    console.warn('[stem editor] MP3 encoding failed, using WAV', e);
    return new File([encodeWav(mix)], 'preview.wav', { type: 'audio/wav' });
  }
};

const onDrop = (e: DragEvent) => {
  dropping.value = false;
  if (props.readonly) return;
  const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
    allowedAudioExts.some((ext) => f.name.toLowerCase().endsWith(ext)),
  );
  if (files.length) emit('files', files);
  else notify('Only audio files can be added as stems.', 'info');
};

/** The editor removes tracks itself; route the request to the parent instead. */
const onRemoveRequest = (e: Event) => {
  e.stopPropagation();
  if (props.readonly) return;
  const stem = tracks.get((e as CustomEvent<{ trackId: string }>).detail.trackId);
  if (stem) emit('remove', stem);
};

const listeners: [string, EventListener][] = [
  ['daw-play', () => {
    playing.value = true;
    // Only one thing plays at a time.
    usePlayerStore().pause();
  }],
  ['daw-pause', () => (playing.value = false)],
  ['daw-stop', () => {
    playing.value = false;
    time.value = editor.value?.currentTime ?? 0;
  }],
  ['daw-timeupdate', (e) => (time.value = (e as CustomEvent<{ time: number }>).detail.time)],
  ['daw-seek', (e) => (time.value = (e as CustomEvent<{ time: number }>).detail.time)],
  ['daw-selection', (e) => {
    const { start, end } = (e as CustomEvent<{ start: number; end: number }>).detail;
    selection.value = end - start > 0.05 ? { start, end } : null;
    selectionTrackId = selection.value ? pointerTrackId : null;
    const engine = editor.value?.engine;
    if (!engine) return;
    if (selection.value && loop.value) engine.setLoopRegion(start, end);
    if (!selection.value && loop.value) {
      loop.value = false;
      engine.setLoopEnabled(false);
    }
  }],
  ['daw-track-select', (e) => {
    selectedTrackId.value = (e as CustomEvent<{ trackId: string }>).detail.trackId;
    syncFades();
  }],
  ['daw-track-control', () => setTimeout(checkDirty)],
  ['daw-track-error', (e) => {
    const { trackId, reason } = (e as CustomEvent<{ trackId: string; reason?: string }>).detail;
    if (reason) return;
    const stem = tracks.get(trackId);
    notify(`"${stem?.title || stem?.name || 'A stem'}" couldn't be loaded.`, 'error');
  }],
  ['daw-error', (e) => console.warn('[stem editor]', (e as CustomEvent).detail)],
];

onMounted(async () => {
  // The web components need the browser, so they load here and not during SSR.
  const [, { NativePlayoutAdapter }] = await Promise.all([
    import('@dawcore/components'),
    import('@dawcore/transport'),
  ]);

  const ed = document.createElement('daw-editor');
  ed.setAttribute('eager-resume', 'document');
  ed.samplesPerPixel = zoomLevels[zoom.value]!;
  ed.waveHeight = $q.screen.lt.sm ? 64 : 80;
  ed.mono = true;
  ed.timescale = true;
  ed.clipHeaders = true;
  ed.interactiveClips = !props.readonly;
  // Rows and ruler run the full width, even when the track is shorter than the view.
  ed.fillViewport = true;

  const shortcuts = document.createElement('daw-keyboard-shortcuts');
  shortcuts.setAttribute('playback', '');
  if (!props.readonly) {
    shortcuts.setAttribute('splitting', '');
    shortcuts.setAttribute('undo', '');
  }
  ed.appendChild(shortcuts);

  context = new AudioContext();
  adapter = new NativePlayoutAdapter(context);
  ed.adapter = adapter;

  host.value!.addEventListener('daw-track-remove', onRemoveRequest, true);
  listeners.forEach(([name, fn]) => ed.addEventListener(name, fn));
  ed.addEventListener('pointerdown', onPointerDown, true);
  host.value!.appendChild(ed);
  editor.value = ed;

  const engine = await ed.ready();
  engine.on('statechange', onState);

  await Promise.allSettled(props.stems.map(addStem));
  // Loading isn't something to undo.
  engine.clearHistory();
  canUndo.value = false;
  canRedo.value = false;

  ready.value = true;
  duration.value = ed.duration;
  fit();
  markSaved();
  emit('ready');
});

onBeforeUnmount(() => {
  clearTimeout(shareTimer);
  const ed = editor.value;
  ed?.engine?.off('statechange', onState);
  ed?.stop();
  ed?.remove();
  host.value?.removeEventListener('daw-track-remove', onRemoveRequest, true);
  ed?.removeEventListener('pointerdown', onPointerDown, true);
  void context?.close();
});

defineExpose({ addStem, removeStem, renameStem, applyRemote, snapshot, markSaved, render, stop, highlight });
</script>

<style lang="scss" scoped>
.stem-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: #121212;

  &__toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 16px;
    padding: 8px 12px;
    background: rgba(32, 32, 32, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__group {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 4px;

    > * {
      flex: none;
    }
  }

  &__clock {
    min-width: 7.5em;
    margin: 0 8px;
    font-variant-numeric: tabular-nums;
    font-size: 0.95rem;
  }

  &__master {
    margin-left: auto;

    .q-slider {
      flex: none;
      width: 110px;
    }
  }

  &__selected {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 20px;
    min-height: 48px;
    padding: 6px 12px;
    font-size: 0.85rem;
    background: rgba(3, 191, 255, 0.08);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__fade {
    display: flex;
    flex: none;
    align-items: center;
    gap: 8px;

    .q-slider {
      width: 120px;
    }
  }

  &__host {
    min-height: 220px;
  }

  &__dropzone {
    position: absolute;
    inset: 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed #03bfff;
    border-radius: 12px;
    background: rgba(3, 191, 255, 0.12);
    pointer-events: none;
  }
}

:deep(daw-editor) {
  --daw-wave-color: #03bfff;
  --daw-progress-color: #7fdfff;
  --daw-playhead-color: #ffffff;
  --daw-background: #121212;
  --daw-track-background: #181818;
  --daw-ruler-color: #9e9e9e;
  --daw-ruler-background: #0d0d0d;
  --daw-selection-color: rgba(3, 191, 255, 0.18);
  --daw-controls-background: #1c1c1c;
  --daw-controls-text: #e0e0e0;
  --daw-clip-header-background: rgba(3, 191, 255, 0.22);
  --daw-clip-header-text: #ffffff;
  --daw-controls-width: 180px;
  --daw-min-height: 200px;
  display: block;

  @media (max-width: 599px) {
    --daw-controls-width: 110px;
  }
}
</style>
