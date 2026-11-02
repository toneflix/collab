<template>
  <div
    class="stem-editor"
    :class="{ 'stem-editor--drop': dropping }"
    @dragover.prevent="dropping = canDrop"
    @dragleave.self="dropping = false"
    @drop.prevent="onDrop"
  >
    <!-- The studio's toolbar: transport, editing, zoom, mixer and browser -->
    <div ref="toolbarHost" class="stem-editor__toolbar" />

    <q-dialog v-model="helpOpen">
      <q-card dark class="max-w-[28rem]">
        <q-card-section class="flex items-center gap-2 py-3">
          <div class="font-bold">Using the editor</div>
          <q-space />
          <IconBtn icon="lucide-x" aria-label="Close" v-close-popup />
        </q-card-section>
        <q-card-section class="pt-0">
          <ul class="pl-6 space-y-1 text-sm list-disc">
            <li><b>Space</b> plays and pauses.</li>
            <li>Click the timeline to move the playhead. Drag across it to select a part, then loop it.</li>
            <li v-if="!readonly">Drag a clip to move it, even onto another stem or over another clip (the later one plays on top). Drag its edges to trim it, its top corners to fade it.</li>
            <li v-if="!readonly">Click a stem, then <b>S</b> splits it at the playhead.</li>
            <li v-if="aiEditable && !readonly">Drag across a stem to select a part, then the wand button changes it with AI.</li>
            <li v-if="!readonly"><b>Ctrl+Z</b> undoes, <b>Ctrl+Shift+Z</b> redoes. <b>Delete</b> removes the selected clips.</li>
            <li>The mixer button opens the mixer: each stem's fader, pan, mute, solo and effects, and the master.</li>
            <li v-if="!readonly">The browser button opens sounds and effects. Drag one onto the timeline or a stem.</li>
            <li v-if="!readonly">Use a stem's ⋮ menu to move it up or down, duplicate or remove it.</li>
            <li><b>↑ ↓</b> pick the stem above or below. <b>M</b> mutes it, <b>Shift+S</b> solos it.</li>
            <li v-if="!readonly"><b>Alt+↑ ↓</b> move it, <b>Ctrl+D</b> duplicates it.</li>
            <li><b>+ −</b> zoom, <b>0</b> fits, <b>F</b> follows the playhead, <b>Home</b> goes to the start.</li>
            <li v-if="!readonly">Drop audio files here to upload them as stems.</li>
            <li v-if="!readonly">
              An instrument stem (synth, drums or sampler) plays notes, not audio. <b>Edit notes</b> opens its piano roll and step grid,
              <b>Keys</b> plays it live and <b>Sound</b> changes how it sounds.
            </li>
            <li v-if="!readonly">
              The flag button adds a marker at the playhead, and double clicking the strip above the ruler adds one there. The gauge
              button changes the tempo from the next bar. Drag a marker or tempo change to move it; right click it to rename, change or
              delete it.
            </li>
            <li>The project files button exports the track as a REAPER project to open in another DAW<span v-if="!readonly">, or adds the tracks of a REAPER or Toneflix Studio project as new stems</span>.</li>
            <li v-if="!readonly">A stem's ⋮ menu shows its volume or pan automation. Click the lane to add points and drag them to shape it.</li>
            <li v-if="!readonly">With an instrument stem picked, the record button records the notes you play on the keys or your computer keyboard.</li>
          </ul>
        </q-card-section>
      </q-card>
    </q-dialog>

    <div class="stem-editor__recording" role="status" v-if="recording || countingIn || recordingNotes">
      <span class="rec-dot" />
      <template v-if="recordingNotes">Recording notes. Play the keys, then press the record button again when you're done.</template>
      <template v-else-if="countingIn">Count-in {{ countBeat }}…</template>
      <template v-else>Recording {{ formatClock(recordedFor) }}. Press the record button again when you're done.</template>
    </div>

    <div class="stem-editor__missing" v-if="missing.length">
      <div class="stem-editor__missing-row" :key="stem.id" v-for="stem in missing">
        <q-icon name="lucide-circle-alert" size="18px" class="text-amber-5 flex-none!" />
        <div class="flex-1 min-w-0">
          <div class="text-sm font-bold truncate">{{ stem.title || stem.name }}</div>
          <div class="text-xs text-grey-5">
            Its audio couldn't be loaded, so it plays silence.<template v-if="!readonly"> Upload the file again or remove the stem.</template>
          </div>
        </div>
        <template v-if="!readonly">
          <q-btn
            outline
            rounded
            dense
            no-caps
            size="sm"
            color="grey-4"
            class="flex-none! px-4"
            icon="lucide-cloud-upload"
            label="Replace audio"
            @click="pickReplacement(stem)"
          />
          <IconBtn size="sm"
            color="grey-5"
            class="flex-none!"
            icon="lucide-trash-2"
            aria-label="Remove stem"
            @click="emit('remove', stem)"
          />
        </template>
      </div>
      <input
        ref="replaceInput"
        type="file"
        class="hidden"
        :accept="acceptFor(audioExts())"
        @change="onReplacementPicked"
      />
    </div>

    <div ref="stage" class="stem-editor__stage">
      <StemActivity :items="[...activity.values()]" :finished="finished" v-if="activity.size" />
      <div ref="host" class="stem-editor__host" />
      <DawSkeleton class="stem-editor__skeleton" :lanes="Math.min(Math.max(stems.length, 2), 6)" v-if="!ready" />
    </div>

    <q-dialog v-model="colorsOpen">
      <q-card dark>
        <q-card-section class="py-4">
          <div class="font-bold">Colour of {{ selected?.name }}</div>
        </q-card-section>
        <q-card-section class="pt-0">
          <div class="stem-colors" role="radiogroup" aria-label="Stem colour" v-if="selected">
            <button
              type="button"
              role="radio"
              class="stem-colors__swatch"
              :class="{ 'stem-colors__swatch--on': c === selectedColor }"
              :style="{ background: c }"
              :aria-checked="c === selectedColor"
              :aria-label="`Colour ${i + 1}`"
              :key="c"
              v-for="(c, i) in STEM_COLORS"
              v-close-popup
              @click="setColor(selected.id, c)"
            />
          </div>
        </q-card-section>
      </q-card>
    </q-dialog>

    <div class="stem-editor__dropzone" v-if="dropping">
      <q-icon name="lucide-cloud-upload" size="40px" />
      <div class="mt-2 text-lg font-bold">Drop audio files to add them as stems</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  AudioEngine,
  ChannelSettings,
  LibrarySource,
  PluginChoice,
  PluginRack,
  NoteRecorder,
  Recorder,
  SnapTo,
  StudioInstrumentPanel,
  StudioKeys,
  StudioPianoRoll,
  StudioBrowser,
  StudioMixer,
  StudioTimeline,
  StudioToolbar,
  Take,
  TimelineState,
  ToolbarAction,
  Track,
  Waveforms,
} from '@toneflix/studio';
import { computed, getCurrentInstance, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, render, shallowRef, watch } from 'vue';
import { LocalStorage } from 'quasar';
import StemActivity, { type StemActivityItem } from './StemActivity.vue';
import StemTrackHeader, { type StripHost } from './StemTrackHeader.vue';
import { arrangementJson, withArrangement } from 'src/utils/studio/arrangement';
import DawSkeleton from 'src/components/Skeletons/DawSkeleton.vue';
import { stemAudio } from 'src/utils/studio/stem-audio';
import { isPlugin, parseEffects, serializeEffects, addFaustEffects, type StemEffect } from 'src/utils/studio/effects';
import { EFFECT_CHANGE, effectCatalog, effectsToRack, rackLoader, rackToEffects } from 'src/utils/studio/rack-effects';
import { loadFaustEffectsRequest } from 'src/utils/requests/effects';
import { flacOf, renderMix } from 'src/utils/studio/mix';
import {
  instrumentClips,
  instrumentTrack,
  readInstrument,
  saveInstrument,
  starterBeat,
  type InstrumentKind,
} from 'src/utils/studio/instrument-notes';
import { uploadSoundRequest } from 'src/utils/requests/sounds';
import {
  applyStemClips,
  fillLengths,
  sourceStem,
  stemChannel,
  stemColor,
  STEM_COLORS,
  stemSource,
  stemToClips,
  stemAutomation,
  stemToTrack,
  trackToMeta,
} from 'src/utils/studio/stem-timeline';
import { QIcon, useQuasar } from 'quasar';
import { loadLibrarySoundsRequest, loadMySoundsRequest, loadSoundsStatusRequest, type Sound } from 'src/utils/requests/sounds';
import { usePlayerStore } from 'src/stores/player-store';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { encodeWav, formatClock, SectionSelection, Stem, StemMeta, stemTitle } from 'src/utils/daw';
import { acceptFor, audioExts, hasExtension } from 'src/utils/presets';

type Studio = typeof import('@toneflix/studio');

/**
 * A multi-track stem editor on Toneflix Studio. Each stem is one track. Clips
 * move freely, overlap (the later one on top) and move between stems; stems
 * are mixed (volume, pan, mute, solo, effects) and played in a loop.
 */
const props = defineProps<{
  stems: Stem[];
  /** Viewing only: no editing, removing or dropping files */
  readonly?: boolean;
  /** Show the button for messaging about a selected part */
  commentable?: boolean;
  /** Show the button for rewriting a selected part of a stem with AI */
  aiEditable?: boolean;
  /** The track's tempo */
  bpm?: number;
  /** The track's meter, like "4/4" */
  timeSignature?: string;
  /** The saved master volume, 0 to 1 */
  mixVolume?: number;
  /** The saved master effect chain, as JSON text */
  masterEffects?: string;
  /** The saved markers and tempo changes, as JSON text */
  arrangement?: string;
  /** The track's title, for exported projects */
  title?: string;
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
  /** Someone wants AI to rewrite the selected part of a stem */
  'ai-edit': [region: SectionSelection];
  /** The tempo or meter was changed here */
  tempo: [value: { bpm: number; timeSignature: string }];
  /**
   * A take was recorded, or a track imported, onto a new track; the parent
   * uploads it and calls adoptStem. An imported one stays unsaved until the next save.
   */
  recorded: [take: { trackId: string; file: File; start: number; duration: number; name: string; imported?: boolean }];
  /** A new instrument track was made; the parent saves it as a stem (no audio) and calls adoptStem */
  instrument: [instrument: { trackId: string; title: string; meta: StemMeta }];
  /** Copy a stem onto the track, with these settings for the copy */
  duplicate: [stem: Stem, meta: StemMeta];
  /** A sound from the browser was put on a new track; the parent adds it as a stem and calls adoptStem */
  sound: [sound: { trackId: string; soundId: number; start: number; name: string }];
  /** New audio was picked for a stem whose audio couldn't be loaded */
  replace: [stem: Stem, file: File];
  ready: [];
}>();

const $q = useQuasar();
const appContext = getCurrentInstance()!.appContext;
const host = ref<HTMLElement>();
const toolbarHost = ref<HTMLElement>();
const stage = ref<HTMLElement>();
const helpOpen = ref(false);
const timeline = shallowRef<StudioTimeline>();
let studio: Studio | null = null;
let engine: AudioEngine | null = null;
let recorder: Recorder | null = null;
let waveforms: Waveforms | null = null;
let context: AudioContext | null = null;
let rack: PluginRack | null = null;
let toolbar: StudioToolbar | null = null;
let mixer: StudioMixer | null = null;
let browser: StudioBrowser | null = null;
let pianoRoll: StudioPianoRoll | null = null;
let keys: StudioKeys | null = null;
let instrumentPanel: StudioInstrumentPanel | null = null;
let notes: NoteRecorder | null = null;
const unlink: (() => void)[] = [];

/** Track id → its output level, 0 to 1, while playing */
const levels = reactive(new Map<string, number>());
/** Track id → its mixer settings, mirrored from the engine */
const channels = reactive(new Map<string, ChannelSettings>());
/** The timeline's tracks, mirrored so the page and headers can show them */
const trackList = shallowRef<readonly Track[]>([]);

/** Zoom limits and steps, in pixels per second */
const MIN_ZOOM = 2;
const MAX_ZOOM = 400;

const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8'];

const ready = ref(false);
const playing = ref(false);
const time = ref(0);
const zoom = ref(40);
const selection = ref<{ start: number; end: number } | null>(null);
const selectedTrackId = ref<string | null>(null);
const dropping = ref(false);

// Tempo and grid. The tempo belongs to the track; the rest is remembered on this device.
const tempo = ref(props.bpm && props.bpm >= 20 ? props.bpm : 120);
const meter = ref(TIME_SIGNATURES.includes(props.timeSignature || '') ? props.timeSignature! : '4/4');
const pref = <T,>(key: string, fallback: T): T => {
  try {
    return ((LocalStorage.getItem(`studio.${key}`) as T | null) ?? fallback) as T;
  } catch {
    return fallback;
  }
};
const remember = (key: string, value: unknown) => {
  try {
    LocalStorage.set(`studio.${key}`, value as string);
  } catch {
    // Storage can be unavailable, e.g. in private browsing.
  }
};
const grid = ref(pref('grid', false));
const snap = ref<SnapTo>(pref<SnapTo>('snap', 'beat'));
const countIn = ref(pref('countIn', true));
const follow = ref(pref('follow', true));

// Recording
const canRecord =
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof AudioWorkletNode !== 'undefined';
const recording = ref(false);
const startingRecording = ref(false);
const countingIn = ref(false);
const countBeat = ref(0);
const recordedFor = ref(0);
const recordingNotes = ref(false);
let recordTrackId: string | null = null;
let recordStartedAt = 0;
let recordTimer: ReturnType<typeof setInterval> | undefined;
let takes = 0;

/** The master bus effect chain, and how it was last saved */
const master = ref<StemEffect[]>(parseEffects(props.masterEffects));
let masterSaved = serializeEffects(master.value);
/** The markers and tempo changes as last saved */
let arrangementSaved = '';

/** Track id → its effect chain */
const effects = reactive(new Map<string, StemEffect[]>());

/** Track id → stem */
const tracks = new Map<string, Stem>();
/** Audio recorded or picked here, by source id → the stem it was saved as */
const aliases = new Map<string, string | number>();
/** Clips that run to the end of audio whose length isn't known yet */
const openEnded = new Set<string>();
/** Each stem's saved state, to tell when there are unsaved changes */
let saved: Record<string, string> = {};
/** Each stem's state as others last saw it, so only new changes are shared */
let shared: Record<string, string> = {};
let shareTimer: ReturnType<typeof setTimeout> | undefined;

const hasSelection = computed(() => !!selection.value && selection.value.end - selection.value.start > 0.05);
const canDrop = computed(() => !props.readonly);

const state = (): TimelineState => timeline.value?.state ?? { tracks: [], clips: [] };
const trackOf = (trackId: string | null) => (trackId ? state().tracks.find((t) => t.id === trackId) : undefined);
const clipsOf = (trackId: string | null) =>
  state()
    .clips.filter((c) => c.track === trackId)
    .sort((a, b) => a.start - b.start);
const channelOf = (trackId: string): ChannelSettings => engine?.mixer.channel(trackId).settings ?? { volume: 1, pan: 0, mute: false, solo: false };

/** The name of a stem in the editor, for clips that play its audio elsewhere. */
const stemName = (stemId: string | number) => {
  const trackId = trackIdOf(stemId);
  return trackId ? trackOf(trackId)?.name : undefined;
};

/** A source's length in seconds, once its audio is in. */
const lengthOf = (source: string) => engine?.getBuffer(source)?.duration;

const selected = computed(() => {
  const id = selectedTrackId.value;
  const track = trackList.value.find((t) => t.id === id);
  return id && track && tracks.has(id) ? { id, name: track.name } : null;
});

const selectedColor = computed(() => trackList.value.find((t) => t.id === selected.value?.id)?.color);
/** The instrument an instrument track plays, like "synth" or "drums", or null for an audio track. */
const instrumentOf = (trackId: string | undefined) => trackList.value.find((t) => t.id === trackId)?.instrument?.id ?? null;
const selectedInstrument = computed(() => instrumentOf(selected.value?.id));

/** Links to the audio of instrument samples, by source id, so they're saved with the stem */
const sampleUrls = new Map<string, string>();

/** Whether a track still waits for the length of audio it runs to the end of. */
const unresolved = (trackId: string) => state().clips.some((c) => c.track === trackId && openEnded.has(c.id));

/** The stems' `meta`, read from the editor, keyed by stem id. */
const snapshot = (): Record<string, StemMeta> => {
  const out: Record<string, StemMeta> = {};
  const now = state();

  now.tracks.forEach((track, order) => {
    const stem = tracks.get(track.id);
    // A stem still waiting for its audio's length keeps the arrangement it was saved with.
    if (!stem || unresolved(track.id)) return;
    out[String(stem.id)] = withExtras(stem, track.id, trackToMeta(stem, track, now.clips, channelOf(track.id), order, aliases));
  });

  return out;
};

/** Add what the timeline doesn't keep: the stem's effects, and an instrument stem's notes. */
function withExtras(stem: Stem, trackId: string, meta: StemMeta): StemMeta {
  const fx = serializeEffects(effects.get(trackId) ?? []);
  const track = trackOf(trackId);
  const instrument = track?.instrument ? JSON.stringify(saveInstrument(state(), track, (source) => sampleUrls.get(source))) : null;
  return {
    ...meta,
    ...(fx ? { effects: fx } : {}),
    ...(instrument ? { instrument } : {}),
    ...(stem.meta?.sound ? { sound: stem.meta.sound } : {}),
  };
}

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
  let dirty = false;
  for (const [id, meta] of Object.entries(snapshot())) {
    const json = JSON.stringify(meta);
    // A stem seen for the first time (just loaded or uploaded) is saved as is.
    saved[id] ??= json;
    if (saved[id] !== json) dirty = true;
  }
  emit('dirty', dirty || serializeEffects(master.value) !== masterSaved || arrangementJson(state()) !== arrangementSaved);
};

/** Call after saving, so the current state counts as saved. */
const markSaved = () => {
  saved = Object.fromEntries(Object.entries(snapshot()).map(([id, meta]) => [id, JSON.stringify(meta)]));
  shared = { ...saved };
  masterSaved = serializeEffects(master.value);
  arrangementSaved = arrangementJson(state());
  emit('dirty', false);
};

/** A track's place from the top of the editor, or -1. */
const orderOf = (trackId: string) => state().tracks.findIndex((t) => t.id === trackId);

const trackIdOf = (stemId: string | number) => {
  for (const [trackId, stem] of tracks) if (String(stem.id) === String(stemId)) return trackId;
  return null;
};

/** Change the timeline without an undo step, as for changes from elsewhere. */
const quietly = (next: TimelineState) => {
  if (next !== state()) timeline.value?.model.load(next);
};

/**
 * Show a change someone else made to a stem: its clips, fades, colour, place,
 * volume, pan, mute, solo and effects. With `asSaved`, the result also counts
 * as saved (they saved it). Otherwise it only counts as unsaved here if this
 * person had their own unsaved changes on that stem.
 */
const applyRemote = (stemId: string | number, meta: StemMeta, asSaved = false) => {
  const trackId = trackIdOf(stemId);
  const stem = trackId ? tracks.get(trackId) : undefined;
  if (!studio || !engine || !trackId || !stem) return;

  const id = String(stemId);
  const before = snapshot()[id];
  const wasDirty = !!before && saved[id] !== undefined && saved[id] !== JSON.stringify(before);

  const incoming: Stem = { ...stem, meta: { ...stem.meta, ...meta, clips: meta.clips } };
  const notesSave = meta.instrument ? readInstrument(incoming) : null;
  let next = notesSave ? withNotes(state(), incoming, trackId) : applyStemClips(state(), incoming, trackId, lengthOf, openEnded, stemName);
  const track = next.tracks.find((t) => t.id === trackId);
  if (meta.color && track && meta.color !== track.color) next = studio.updateTrack(next, trackId, { color: stemColor(meta.color, 0) });
  if (meta.order !== undefined && meta.order !== next.tracks.findIndex((t) => t.id === trackId)) next = studio.moveTrack(next, trackId, meta.order);
  const automation = stemAutomation(meta);
  if (track && JSON.stringify(automation ?? null) !== JSON.stringify(track.automation ?? null)) next = studio.updateTrack(next, trackId, { automation });
  quietly(next);

  const channel: Partial<ChannelSettings> = {};
  const current = channelOf(trackId);
  const wanted = stemChannel({ ...stem.meta, ...meta });
  if (meta.gain !== undefined && Math.abs(wanted.volume - current.volume) > 0.001) channel.volume = wanted.volume;
  if (meta.stereoPan !== undefined && Math.abs(wanted.pan - current.pan) > 0.001) channel.pan = wanted.pan;
  if (meta.muted !== undefined && wanted.mute !== current.mute) channel.mute = wanted.mute;
  if (meta.soloed !== undefined && wanted.solo !== current.solo) channel.solo = wanted.solo;
  if (Object.keys(channel).length) engine.mixer.set(trackId, channel);

  // Effects someone else changed.
  if (meta.effects !== undefined || stem.meta?.effects) {
    const incomingFx = parseEffects(meta.effects ?? '');
    if (serializeEffects(incomingFx) !== serializeEffects(effects.get(trackId) ?? [])) {
      effects.set(trackId, incomingFx);
      void loadChain(trackId, incomingFx);
    }
  }

  stem.meta = { ...stem.meta, ...meta };

  const after = snapshot()[id];
  if (after) {
    const json = JSON.stringify(after);
    // Already seen by everyone, so not shared again.
    shared[id] = json;
    if (asSaved || !wasDirty) saved[id] = json;
  }
  checkDirty();
};

/**
 * Put an instrument stem's saved instrument and note clips on its track.
 * Clips keep their ids in order, so an open piano roll stays open.
 */
function withNotes(now: TimelineState, stem: Stem, trackId: string): TimelineState {
  const save = readInstrument(stem);
  if (!save || !studio) return now;

  const s = studio;
  const old = now.clips
    .filter((c) => c.track === trackId)
    .sort((a, b) => a.start - b.start)
    .map((c) => c.id);
  let i = 0;
  const clips = instrumentClips(stem, save, trackId, () => old[i++] ?? s.uid('c'));
  void loadSamples(save.samples);

  return {
    ...s.updateTrack(now, trackId, { instrument: save.instrument }),
    clips: [...now.clips.filter((c) => c.track !== trackId), ...clips],
  };
}

/** Load the audio of instrument samples by their links, so the instruments can play them. */
const loadSamples = async (samples: Record<string, string> | undefined) => {
  await Promise.all(
    Object.entries(samples ?? {}).map(async ([source, url]) => {
      sampleUrls.set(source, url);
      if (!engine || !context || engine.getBuffer(source)) return;
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        engine.setBuffer(source, await context.decodeAudioData(await res.arrayBuffer()));
      } catch (error) {
        console.warn('[stem editor] sample', source, error);
      }
    }),
  );
};

/** Show changes to several stems, moving stems top first so each lands where it was put. */
const applyRemoteAll = (changes: Record<string, StemMeta>, asSaved = false) =>
  Object.entries(changes)
    .sort(([, a], [, b]) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .forEach(([id, meta]) => applyRemote(id, meta, asSaved));

/** Mirror the timeline after any change. */
const onChange = ({ state: now, final }: { state: TimelineState; final: boolean }) => {
  trackList.value = now.tracks;
  if (final) {
    engine?.mixer.sync(now.tracks);
    // A selected clip moved to another stem takes the selection with it.
    const moved = now.clips.find((c) => c.id === timeline.value?.selection[0])?.track;
    if (moved && moved !== selectedTrackId.value) selectedTrackId.value = moved;
    if (selectedTrackId.value && !now.tracks.some((t) => t.id === selectedTrackId.value)) selectedTrackId.value = null;
    checkDirty();
  }
};

const togglePlay = () => {
  if (!engine) return;
  if (engine.isPlaying) engine.pause();
  else void engine.play();
};

const stop = () => engine?.stop();

const toStart = () => seek(0);

/** Move the playhead, carrying on playing from there if it was playing. */
const seek = (seconds: number) => {
  engine?.seek(Math.max(0, seconds));
  time.value = Math.max(0, seconds);
};

/** Split the selected clips at the playhead, or the selected stem's clip under it. */
const split = () => {
  const tl = timeline.value;
  if (!tl || !engine) return;
  const at = engine.time;
  if (!tl.selection.length && selectedTrackId.value) {
    tl.select(clipsOf(selectedTrackId.value).filter((c) => c.start < at && c.start + c.duration > at).map((c) => c.id));
  }
  if (!tl.selection.length) {
    notify('Move the playhead over the selected stem to split it.', 'info');
    return;
  }
  tl.split(at);
};

const selectionTrackId = () => {
  const range = timeline.value?.range;
  return range?.tracks.length === 1 ? range.tracks[0]! : selectedTrackId.value;
};

const messageAboutSelection = () => {
  if (!selection.value) return;
  const id = selectionTrackId();
  const stem = id ? tracks.get(id) : undefined;
  emit('comment', {
    start: Math.round(selection.value.start * 1000) / 1000,
    end: Math.round(selection.value.end * 1000) / 1000,
    ...(stem ? { stemId: stem.id, stemName: trackOf(id)?.name || stemTitle(stem) } : {}),
  });
};

/**
 * Hand the selected part of a stem to the AI tools, with its times in the
 * stem's audio file as well as on the timeline. The part must sit inside one
 * clip of the stem's own audio, so it maps to one stretch of that audio.
 */
const editSelection = () => {
  if (!selection.value) return;
  const id = selectionTrackId();
  const stem = id ? tracks.get(id) : undefined;
  if (!stem || !id) {
    notify('Drag across a stem to select the part to change.', 'info');
    return;
  }

  const { start, end } = selection.value;
  const clip = clipsOf(id).find(
    (c) => sourceStem(c.source, aliases) === String(stem.id) && start >= c.start - 0.01 && end <= c.start + c.duration + 0.01,
  );
  if (!clip) {
    notify('Select a part inside one clip of the stem.', 'info');
    return;
  }

  const round = (n: number) => Math.round(n * 1000) / 1000;
  const offset = clip.offset - clip.start;
  emit('ai-edit', {
    stem,
    start: round(Math.max(0, start + offset)),
    end: round(Math.max(0, end + offset)),
    at: round(start),
    until: round(end),
  });
};

const setFollow = (on: boolean) => {
  follow.value = on;
  remember('follow', on);
  timeline.value?.setOptions({ follow: on });
  toolbar?.refresh();
};

/**
 * Show a part of the track: select it, move the playhead to its start,
 * scroll it into view and flash a colour over it that fades away. With a
 * stem, only that stem's lane is coloured.
 */
const highlight = (region: { start: number; end: number; stemId?: string | number | null }) => {
  const tl = timeline.value;
  if (!tl || !ready.value) return false;

  const start = Math.max(0, region.start);
  const end = Math.max(start + 0.05, region.end);
  const trackId = region.stemId ? trackIdOf(region.stemId) : null;
  tl.setRange({ start, end, tracks: trackId ? [trackId] : state().tracks.map((t) => t.id) });
  if (!playing.value) seek(start);

  const pps = tl.pxPerSecond;
  const left = start * pps;
  const width = Math.max(4, (end - start) * pps);
  const lane = trackId ? tl.root.querySelector<HTMLElement>(`.tfs-lane[data-track="${trackId}"]`) : null;
  const lanes = lane ? [lane] : [...tl.root.querySelectorAll<HTMLElement>('.tfs-lane')];
  const scroller = tl.root.querySelector<HTMLElement>('.tfs-scroll');
  if (!lanes.length) return false;

  if (scroller) {
    const header = scroller.clientWidth - (lanes[0]!.parentElement?.clientWidth ?? 0) + lanes[0]!.clientWidth;
    scroller.scrollTo({
      left: Math.max(0, left - Math.max(24, (scroller.clientWidth - Math.max(0, header) - width) / 2)),
      top: lane ? Math.max(0, (lane.parentElement?.offsetTop ?? 0) - 8) : scroller.scrollTop,
      behavior: 'smooth',
    });
  }
  host.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  for (const target of lanes) {
    const overlay = document.createElement('div');
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: `${left}px`,
      width: `${width}px`,
      zIndex: '4',
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
  }
  return true;
};

const setZoom = (pxPerSecond: number) => {
  timeline.value?.setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pxPerSecond)));
};

/** Send the tempo, meter, grid and snap settings to the timeline and metronome. */
const applyTempo = () => {
  const [beats, unit] = meter.value.split('/').map(Number) as [number, number];
  const options = { bpm: tempo.value, meter: [beats, unit] as [number, number], snap: snap.value };
  timeline.value?.setGrid({ ...options, show: grid.value });
  engine?.metronome.grid.set(options);
  toolbar?.refresh();
};

const emitTempo = () => emit('tempo', { bpm: tempo.value, timeSignature: meter.value });

/** Take the tempo, meter or snap changed in the toolbar. */
const onToolbarChange = () => {
  const g = timeline.value?.grid;
  if (!g) return;

  if (g.snap !== snap.value) {
    snap.value = g.snap;
    remember('snap', g.snap);
  }

  const bpm = Math.round(Math.min(300, Math.max(20, g.bpm)) * 100) / 100;
  const sig = `${g.meter[0]}/${g.meter[1]}`;
  const changed = bpm !== tempo.value || (TIME_SIGNATURES.includes(sig) && sig !== meter.value);
  if (TIME_SIGNATURES.includes(sig)) meter.value = sig;
  tempo.value = bpm;
  // Keep the grid inside what the track allows.
  if (bpm !== g.bpm || !TIME_SIGNATURES.includes(sig)) applyTempo();
  if (changed) {
    rack?.syncTransport();
    emitTempo();
  }
};

const setGrid = (on: boolean) => {
  grid.value = on;
  remember('grid', on);
  applyTempo();
};

const setCountIn = (on: boolean) => {
  countIn.value = on;
  remember('countIn', on);
  toolbar?.refresh();
};

// Someone else changed the track's tempo, or it was saved.
watch(
  () => [props.bpm, props.timeSignature] as const,
  ([bpm, sig]) => {
    let changed = false;
    if (bpm && bpm >= 20 && bpm !== tempo.value) {
      tempo.value = bpm;
      changed = true;
    }
    if (sig && TIME_SIGNATURES.includes(sig) && sig !== meter.value) {
      meter.value = sig;
      changed = true;
    }
    if (changed) applyTempo();
  },
);

// Someone else saved new markers or tempo changes; unsaved ones here are kept.
watch(
  () => props.arrangement,
  (value) => {
    if (!ready.value || arrangementJson(state()) !== arrangementSaved) return;
    quietly(withArrangement(state(), value));
    arrangementSaved = arrangementJson(state());
  },
);

/** Where the playhead is, in seconds. */
const currentTime = () => engine?.time ?? time.value;

/** Play one bar of clicks before recording, showing the beats. */
const playCountIn = async () => {
  if (!engine || !context) return;
  const [beats, unit] = meter.value.split('/').map(Number) as [number, number];
  const beat = (60 / tempo.value) * (4 / unit);
  const at = context.currentTime + 0.1;
  const was = engine.metronome.enabled;

  engine.metronome.enabled = true;
  engine.metronome.play(Array.from({ length: beats }, (_, i) => ({ time: i * beat, at: i * beat, when: at + i * beat, accent: i === 0 })));
  engine.metronome.enabled = was;

  countingIn.value = true;
  for (let i = 1; i <= beats; i++) {
    countBeat.value = i;
    await new Promise((resolve) => setTimeout(resolve, i === 1 ? 100 + beat * 1000 : beat * 1000));
  }
  countingIn.value = false;
};

/**
 * Record from the microphone onto a new track, starting at the playhead.
 * The other stems play along. When it stops, the take is handed to the
 * parent to upload as a stem.
 */
const toggleRecording = async () => {
  if (!engine || !recorder || !studio) return;
  if (recording.value) return void stopRecording();

  // An instrument track records the notes played on the keys instead.
  if (notes?.isRecording) {
    notes.stop();
    engine.pause();
    return;
  }
  const noteTrack = selectedTrackId.value && instrumentOf(selectedTrackId.value) ? selectedTrackId.value : null;
  if (noteTrack && notes) {
    keys?.setTrack(noteTrack);
    keys?.show();
    await notes.start(noteTrack);
    return;
  }

  startingRecording.value = true;
  try {
    await recorder.open();
  } catch (e) {
    startingRecording.value = false;
    notify((e as DOMException)?.name === 'NotAllowedError' ? 'Allow microphone access to record.' : 'No microphone was found.', 'error');
    return;
  }

  try {
    takes++;
    const id = studio.uid('rec');
    quietly(studio.addTrack(state(), { id, name: `Recording ${takes}`, color: stemColor(undefined, state().tracks.length) }));
    recordTrackId = id;
    if (playing.value) engine.pause();
    const from = engine.time;
    if (countIn.value) await playCountIn();
    recorder.arm(id);
    await recorder.start({ track: id, from });
    recording.value = true;
    recordStartedAt = performance.now();
    recordedFor.value = 0;
    recordTimer = setInterval(() => (recordedFor.value = (performance.now() - recordStartedAt) / 1000), 200);
  } catch (e) {
    console.warn('[stem editor] recording failed', e);
    notify('Recording couldn\'t start.', 'error');
    cleanupRecording(true);
  } finally {
    startingRecording.value = false;
  }
};

const stopRecording = async () => {
  try {
    await recorder?.stop();
  } finally {
    engine?.stop();
  }
};

/** Let go of the microphone. With `dropTrack`, also remove the track made for the take. */
const cleanupRecording = (drop = false) => {
  clearInterval(recordTimer);
  recorder?.arm(null);
  recorder?.close();
  if (drop && recordTrackId) dropTrack(recordTrackId);
  recordTrackId = null;
  recording.value = false;
  countingIn.value = false;
};

const onTake = (take: Take) => {
  const name = trackOf(take.track)?.name || `Recording ${takes}`;
  recordTrackId = null;
  cleanupRecording();
  if (take.duration < 0.2) {
    dropTrack(take.track);
    notify('That take was too short to keep.', 'info');
    return;
  }
  // Uploaded lossless; the server does any encoding.
  const file = new File([encodeWav(take.buffer)], `${name}.wav`, { type: 'audio/wav' });
  emit('recorded', {
    trackId: take.track,
    file,
    start: Math.round(take.start * 1000) / 1000,
    duration: take.duration,
    name,
  });
};

/**
 * Link a track already in the editor (a recorded take, or a file put on
 * before upload) to the stem it was saved as, so it saves and syncs like any
 * other stem.
 */
const adoptStem = (trackId: string, stem: Stem, unsaved = false) => {
  tracks.set(trackId, stem);
  added.add(String(stem.id));
  for (const clip of clipsOf(trackId)) if (!clip.notes && !clip.source.startsWith('stem:')) aliases.set(clip.source, stem.id);
  renameStem(stem.id, stemTitle(stem));
  const meta = snapshot()[String(stem.id)];
  // An imported track's clips, mix and automation are saved with the next save.
  if (unsaved) saved[String(stem.id)] = '';
  else if (meta) {
    saved[String(stem.id)] = JSON.stringify(meta);
    shared[String(stem.id)] = saved[String(stem.id)]!;
  }
  checkDirty();
};

/** Drop a track that isn't a saved stem, like a take that couldn't be saved. */
const dropTrack = (trackId: string) => {
  if (tracks.has(trackId) || !studio || !trackOf(trackId)) return;
  quietly(studio.removeTrack(state(), trackId));
  timeline.value?.history.clear();
};

/** Web Audio Module plugins, which an admin can turn on. */
const pluginsOn = computed(() => !!useBootstrapStore().configuration.studio_plugins);

/** Effects the mixer's add button offers; Faust ones join once they load. */
const catalog: PluginChoice[] = [];

/** Chains being loaded from saved effects, whose rack changes aren't edits */
let restoring = 0;

/** Plugin names by URL, as the plugins call themselves */
const pluginNames = new Map<string, string>();

/** A chain as saved: each plugin's URL, bypass and settings. */
const savedChain = async (track: string | null) =>
  Promise.all(
    (rack?.slots(track) ?? []).map(async (slot) => ({
      url: slot.url,
      bypass: slot.bypass,
      state: await slot.plugin.audioNode.getState().catch(() => undefined),
    })),
  );

/** Read a chain back from the rack into the stem's (or master's) saved effects. */
const syncEffects = async (track: string | null) => {
  if (!rack) return;
  for (const slot of rack.slots(track)) if (!slot.name.endsWith('(off)')) pluginNames.set(slot.url, slot.name);
  const list = rackToEffects(await savedChain(track), (url) => pluginNames.get(url));

  if (track === null) master.value = list;
  else if (tracks.has(track)) effects.set(track, list);
};

/** Put a saved chain into the rack, replacing what's there. */
const loadChain = async (track: string | null, list: StemEffect[]) => {
  if (!rack) return;
  restoring++;
  try {
    rack.clear(track);
    for (const e of list) if (isPlugin(e) && e.url && e.name) pluginNames.set(e.url, e.name);
    for (const saved of effectsToRack(list)) {
      try {
        const slot = await rack.add(track, saved.url, { state: saved.state, bypass: saved.bypass });
        // Many plugins only take their settings once made.
        if (saved.state !== undefined) await slot.plugin.audioNode.setState(saved.state).catch(() => undefined);
      } catch (error) {
        notify(`An effect couldn't load: ${String((error as Error)?.message ?? error)}`, 'error');
      }
    }
  } finally {
    restoring--;
  }
};

/** Read every plugin's settings back into the saved effects, so they're saved too. */
const keepPluginStates = async () => {
  await syncEffects(null);
  for (const trackId of tracks.keys()) await syncEffects(trackId);
};

/**
 * Mix the whole track as it plays here, as FLAC, or null when there is
 * nothing to mix. Throws while a stem's audio is still loading.
 */
const mixdown = async () => {
  if (!engine || !rack) return null;
  const clips = state().clips.filter((c) => !c.notes);
  if (clips.some((c) => openEnded.has(c.id) || !engine!.hasBuffer(c.source))) {
    throw new Error("Some stems are still loading. Save again once they've loaded.");
  }

  const [beats, unit] = meter.value.split('/').map(Number) as [number, number];
  const audio = await renderMix(engine, rack, { bpm: tempo.value, beats, unit });

  return audio ? flacOf(audio) : null;
};

/** Load the server's Faust effects so the add menu offers them and saved ones can play. */
const loadFaust = async () => {
  try {
    const { data } = await loadFaustEffectsRequest().send();
    addFaustEffects(data ?? []);
  } catch (err) {
    console.warn('[stem editor] faust effects', err);
  }
};

/** The effects the mixer and browser offer: ours, then plugins when they're on. */
const fillCatalog = () => {
  const plugins = pluginsOn.value && studio ? [...studio.curatedWams(), ...studio.communityWams({ allow: (plugin) => !plugin.isInstrument })] : [];
  catalog.splice(0, catalog.length, ...effectCatalog(), ...plugins.map((p) => ({ name: p.name, url: p.url })));
};

/** Settings changed in an effect's own controls: read every chain back. */
const onEffectChange = () => void keepPluginStates().then(checkDirty);

// The toolbar's own buttons follow the editor's state.
watch([recording, countingIn, startingRecording, hasSelection, recordingNotes, selectedInstrument], () => toolbar?.refresh());

/** Show the mixer, where each stem's effects are. */
const openMixer = () => {
  mixer?.show();
  toolbar?.refresh();
};

/** Open an instrument track's notes in the piano roll, adding a clip at the playhead when it has none. */
const editNotes = (trackId: string) => {
  const tl = timeline.value;
  if (!pianoRoll || !tl) return;
  const clip = clipsOf(trackId).find((c) => c.notes) ?? (props.readonly ? null : tl.addNoteClip(trackId, currentTime(), 2));
  if (clip) pianoRoll.edit(clip.id);
};

const INSTRUMENT_NAMES: Record<InstrumentKind, string> = { synth: 'Synth', drums: 'Drums', sampler: 'Sampler' };

/**
 * Add an instrument track with a clip at the bar the playhead is in, open
 * it in the piano roll, and ask the parent to save it as a stem.
 */
const addInstrument = (kind: InstrumentKind) => {
  const tl = timeline.value;
  if (!studio || !tl || props.readonly) return null;

  const s = studio;
  const title = `${INSTRUMENT_NAMES[kind]} ${state().tracks.filter((t) => t.instrument?.id === kind).length + 1}`;
  const bar = tl.grid.position(currentTime()).bar;
  const start = tl.grid.barTime(bar);
  const track: Track = { id: s.uid('t'), name: title, color: stemColor(undefined, state().tracks.length), instrument: { id: kind } };
  const clip = {
    id: s.uid('c'),
    track: track.id,
    source: `notes:${s.uid('p')}`,
    name: title,
    start,
    offset: 0,
    duration: tl.grid.barTime(bar + (kind === 'drums' ? 1 : 2)) - start,
    gain: 1,
    fadeIn: 0,
    fadeOut: 0,
    notes: kind === 'drums' ? starterBeat(tempo.value) : [],
  };

  quietly(s.addClips(s.addTrack(state(), track), [clip]));
  // A stem added on the server isn't something to undo here.
  tl.history.clear();
  selectTrack(track.id);
  pianoRoll?.edit(clip.id);

  const now = state();
  const meta = trackToMeta({ id: track.id, meta: {} } as unknown as Stem, track, now.clips, channelOf(track.id), now.tracks.length - 1);
  const instrument = JSON.stringify(saveInstrument(now, track, () => undefined));
  emit('instrument', { trackId: track.id, title, meta: { ...meta, name: title, instrument } });

  return track.id;
};

/**
 * A sample put on an instrument here: one from the sound library already has
 * a link; one from a file is uploaded to My sounds for one.
 */
const onSampleSource = async (source: string, buffer: AudioBuffer) => {
  if (sampleUrls.has(source) || props.readonly) return;
  const known = soundUrls.get(source);
  if (known) {
    sampleUrls.set(source, known);
    return;
  }
  try {
    const file = new File([encodeWav(buffer)], 'Sample.wav', { type: 'audio/wav' });
    const { data } = await uploadSoundRequest(file, { name: 'Instrument sample', duration: buffer.duration }).send();
    sampleUrls.set(source, data.url);
    checkDirty();
  } catch (e) {
    console.warn('[stem editor] sample upload', e);
    notify("The sample couldn't be saved, so it won't be kept with the stem.", 'error');
  }
};

/** Ask the parent to copy a stem, placed just below it. */
const duplicate = (trackId: string) => {
  const stem = tracks.get(trackId);
  const meta = stem ? snapshot()[String(stem.id)] : undefined;
  if (!stem || !meta || props.readonly) return;
  emit('duplicate', stem, { ...meta, order: orderOf(trackId) + 1 });
};

/** Move a track to a place from the top. */
const moveTrack = (trackId: string, index: number) => {
  if (!studio || orderOf(trackId) < 0) return;
  timeline.value?.moveTrack(trackId, Math.max(0, Math.min(state().tracks.length - 1, index)));
};

/** Move a stem to a place from the top. */
const moveStem = (stemId: string | number, index: number) => {
  const trackId = trackIdOf(stemId);
  if (trackId && studio) quietly(studio.moveTrack(state(), trackId, Math.max(0, Math.min(state().tracks.length - 1, index))));
};

const setColor = (trackId: string, color: string) => {
  if (!studio) return;
  timeline.value?.model.apply('Colour', (now) => studio!.updateTrack(now, trackId, { color }));
};

/** Select a stem, as clicking its controls does. */
const selectTrack = (trackId: string) => {
  if (!trackOf(trackId) || selectedTrackId.value === trackId) return;
  selectedTrackId.value = trackId;
};

const colorsOpen = ref(false);

/** The automation lane shown under each track */
const automationLanes = reactive(new Map<string, 'volume' | 'pan'>());

/** What each track header shows and does. */
const strips: StripHost = reactive({
  readonly: computed(() => !!props.readonly),
  channel: (id: string) => channels.get(id) ?? { volume: 1, pan: 0, mute: false, solo: false },
  name: (id: string) => trackList.value.find((t) => t.id === id)?.name ?? '',
  color: (id: string) => trackList.value.find((t) => t.id === id)?.color ?? STEM_COLORS[0]!,
  effects: (id: string) => effects.get(id)?.length ?? 0,
  level: (id: string) => levels.get(id) ?? 0,
  index: (id: string) => trackList.value.findIndex((t) => t.id === id),
  count: () => trackList.value.length,
  selected: () => selectedTrackId.value,
  hasStem: (id: string) => tracks.has(id),
  hasNotes: (id: string) => !!instrumentOf(id) && !props.readonly,
  select: selectTrack,
  setChannel: (id: string, patch: Partial<ChannelSettings>, commit = false) => {
    if (props.readonly) return;
    engine?.mixer.set(id, patch);
    if (commit || 'mute' in patch || 'solo' in patch) checkDirty();
  },
  committed: () => checkDirty(),
  openEffects: (id: string) => {
    if (!tracks.has(id)) return;
    selectTrack(id);
    openMixer();
  },
  openColors: (id: string) => {
    selectTrack(id);
    colorsOpen.value = true;
  },
  editNotes: (id: string) => editNotes(id),
  openInstrument: (id: string) => instrumentPanel?.open(id),
  automation: (id: string) => automationLanes.get(id) ?? null,
  showAutomation: (id: string, param: 'volume' | 'pan' | null) => timeline.value?.showAutomation(id, param),
  duplicate,
  move: moveTrack,
  remove: (id: string) => {
    const stem = tracks.get(id);
    if (stem && !props.readonly) emit('remove', stem);
  },
}) as unknown as StripHost;

/** Each track's header: a Vue component rendered into the timeline's header cell. */
const renderHeader = (track: Track, cell: HTMLElement) => {
  const vnode = h(StemTrackHeader, { trackId: track.id, host: strips });
  vnode.appContext = appContext;
  render(vnode, cell);

  return () => render(null, cell);
};

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/** Keyboard shortcuts for playback, the selected stem and the view. Clip edits are the timeline's own. */
const onKey = (e: KeyboardEvent) => {
  if (!engine || !ready.value || e.defaultPrevented || typing(e.target) || e.composedPath().some((el) => typing(el))) return;
  if (document.querySelector('.q-dialog')) return;

  const order = state().tracks.map((t) => t.id);
  const current = selectedTrackId.value;
  const index = current ? order.indexOf(current) : -1;
  const key = e.key.toLowerCase();
  const mod = e.ctrlKey || e.metaKey;
  let handled = true;

  if (e.key === ' ' && !mod && !(e.target instanceof HTMLButtonElement)) togglePlay();
  else if (mod && key === 'd' && current) duplicate(current);
  else if (mod) handled = false;
  else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
    const by = e.key === 'ArrowUp' ? -1 : 1;
    if (e.altKey && current && !props.readonly) moveTrack(current, Math.max(0, index + by));
    else {
      const next = order[Math.max(0, Math.min(order.length - 1, index + by))];
      if (next) selectTrack(next);
    }
  } else if (key === 'm' && current) strips.setChannel(current, { mute: !channelOf(current).mute });
  else if (key === 's' && e.shiftKey && current) strips.setChannel(current, { solo: !channelOf(current).solo });
  else if (key === 's' && !props.readonly) split();
  else if (e.key === '+' || e.key === '=') setZoom(zoom.value * 2);
  else if (e.key === '-' || e.key === '_') setZoom(zoom.value / 2);
  else if (e.key === '0') fit();
  else if (key === 'f') setFollow(!follow.value);
  else if (e.key === 'Home') toStart();
  else handled = false;

  if (handled) e.preventDefault();
};

/** Zoom so the whole project fits on screen. */
const fit = () => timeline.value?.fit();


/** Stem ids already in the editor, so a stem is never added twice */
const added = new Set<string>();

/** Stems whose audio couldn't be loaded, shown so they can be fixed or removed */
const missing = ref<Stem[]>([]);
const replaceInput = ref<HTMLInputElement>();
let replacing: Stem | null = null;

const pickReplacement = (stem: Stem) => {
  replacing = stem;
  replaceInput.value?.click();
};

const onReplacementPicked = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file && replacing) emit('replace', replacing, file);
  replacing = null;
};

/** What's loading or uploading, keyed by stem or track */
const activity = reactive(new Map<string, StemActivityItem>());
/** How many finished since the editor was last idle */
const finished = ref(0);

const setActivity = (key: string, patch: Partial<StemActivityItem>) => {
  const current = activity.get(key) ?? { key, name: '', phase: 'download' as const, loaded: 0, total: 0 };
  activity.set(key, { ...current, ...patch });
};

const endActivity = (key: string) => {
  if (activity.delete(key)) finished.value++;
  if (!activity.size) finished.value = 0;
};

/** Stem id → its audio being read from this device or downloaded */
const audioLoads = new Map<string, Promise<Blob>>();

const fetchAudio = (stem: Stem) => {
  const id = String(stem.id);
  const running = audioLoads.get(id);
  if (running) return running;

  const key = `stem-${id}`;
  setActivity(key, { name: stemTitle(stem), phase: 'download', loaded: 0, total: stem.size || 0 });
  const load = stemAudio.get(stem, ({ loaded, total, cached }) =>
    setActivity(key, { phase: cached ? 'cached' : 'download', loaded, total }),
  );
  audioLoads.set(id, load);

  return load;
};

/** Hand decoded audio to the engine and the timeline, with its waveform. */
const useAudio = (source: string, audio: AudioBuffer, peaksKey: string) => {
  if (!engine || !timeline.value) return;
  engine.setBuffer(source, audio);
  timeline.value.setSource({ id: source, duration: audio.duration });
  quietly(fillLengths(state(), source, audio.duration, openEnded));
  void waveforms
    ?.get(peaksKey, () => audio)
    .then((peaks) => timeline.value?.setSource({ id: source }, peaks))
    .catch(() => undefined);
};

/**
 * Put a stem on the timeline with its clips, controls and effects before
 * its audio is in. Clips stay silent until the audio arrives.
 */
const placeStem = async (stem: Stem): Promise<string | undefined> => {
  if (!studio || !engine || !timeline.value || added.has(String(stem.id))) return;
  added.add(String(stem.id));

  const index = state().tracks.length;
  const s = studio;
  const save = readInstrument(stem);
  const track = save ? instrumentTrack(stem, save, index) : stemToTrack(stem, index);
  const clips = save
    ? instrumentClips(stem, save, track.id, () => s.uid('c'))
    : stemToClips(stem, track.id, lengthOf, openEnded, stemName);
  quietly(studio.addClips(studio.addTrack(state(), track), clips));
  if (save) void loadSamples(save.samples);
  tracks.set(track.id, stem);
  engine.mixer.set(track.id, stemChannel(stem.meta));

  const fx = parseEffects(stem.meta?.effects);
  if (fx.length) {
    effects.set(track.id, fx);
    await loadChain(track.id, fx);
  }

  return track.id;
};

/** Load a placed stem's audio. Instrument stems have none: their notes are already on the timeline. */
const fillStem = async (stem: Stem, trackId: string) => {
  if (readInstrument(stem)) return;
  const key = `stem-${stem.id}`;
  const id = String(stem.id);
  try {
    const blob = await fetchAudio(stem);
    setActivity(key, { phase: 'decode' });
    const audio = await context!.decodeAudioData(await blob.arrayBuffer());
    if (tracks.get(trackId) !== stem) return;

    const wasUnresolved = unresolved(trackId);
    useAudio(stemSource(stem.id), audio, `stem:${stem.id}:${stem.size}:${stem.src}`);
    missing.value = missing.value.filter((s) => String(s.id) !== id);

    // A stem that just learnt its length counts as saved as it now stands.
    const meta = snapshot()[id];
    if (meta && wasUnresolved) {
      saved[id] = JSON.stringify(meta);
      shared[id] = saved[id]!;
    }
    checkDirty();
  } catch {
    missing.value = [...missing.value.filter((s) => String(s.id) !== id), stem];
  } finally {
    audioLoads.delete(id);
    endActivity(key);
  }
};

const addStem = async (stem: Stem) => {
  const trackId = await placeStem(stem);
  if (trackId) await fillStem(stem, trackId);

  return trackId;
};

/**
 * Put a file on the timeline straight away, before it's uploaded. The parent
 * uploads it and calls adoptStem, or dropTrack if that fails.
 */
const addLocal = async (file: File, name: string): Promise<string | null> => {
  if (!studio || !context || !timeline.value) return null;

  try {
    const audio = await context.decodeAudioData(await file.arrayBuffer());
    const source = studio.uid('local');
    const track: Track = { id: studio.uid('t'), name, color: stemColor(undefined, state().tracks.length) };
    const clip = studio.makeClip({ track: track.id, source, name, start: 0, offset: 0, duration: audio.duration });

    useAudio(source, audio, `local:${file.name}:${file.size}:${file.lastModified}`);
    quietly(studio.addClips(studio.addTrack(state(), track), [clip]));

    return track.id;
  } catch {
    return null;
  }
};

/** The app named in exported projects */
const APP = { name: 'Toneflix Music', id: 'toneflix-music', extension: 'tfproject', url: 'https://toneflix.net' };

/** Download the track as a project for another DAW: Toneflix Studio's own format, or REAPER. */
const exportProject = (format: 'app' | 'reaper') => {
  const tl = timeline.value;
  if (!studio || !tl || !engine) return;
  const name = props.title || 'Toneflix track';

  return studio
    .saveProject(format, tl, engine, { app: APP, name, plugins: rack ?? undefined })
    .then(({ blob, fileName }) => {
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: fileName });
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    })
    .catch((error: unknown) => notify(error instanceof Error ? error.message : "The project couldn't be saved.", 'error'));
};

/** Ask whether to export the track for another DAW, or import a project's tracks. */
const openProjectFiles = () =>
  $q
    .dialog({
      title: 'Project files',
      message: 'Move this track to and from other DAWs: stems, clips, mix, automation and markers.',
      options: {
        type: 'radio',
        model: 'reaper',
        items: [
          { label: 'Export as a REAPER project (.zip, without plugins)', value: 'reaper' },
          { label: `Export as a ${APP.name} project (.${APP.extension})`, value: 'app' },
          ...(props.readonly ? [] : [{ label: 'Import the tracks of a project…', value: 'import' }]),
        ],
      },
      cancel: true,
      dark: true,
    })
    .onOk((choice: 'app' | 'reaper' | 'import') => (choice === 'import' ? pickProject() : void exportProject(choice)));

/**
 * Add the tracks of a REAPER or Toneflix Studio project as new stems, with
 * their clips, mix, automation and markers. A track that plays several audio
 * files is bounced into one. Effects and plugins aren't brought in.
 */
const importProject = async (input: File | File[]) => {
  const tl = timeline.value;
  if (!studio || !tl || !engine || !context || props.readonly) return;

  const s = studio;
  const holder = document.createElement('div');
  const scratchTl = new s.StudioTimeline(holder, {});
  const scratch = new s.AudioEngine({ context });
  if (rack) scratch.setInstruments(rack.instruments());
  const activity = 'import-project';
  setActivity(activity, { name: 'Opening project', phase: 'decode', loaded: 0, total: 0 });

  try {
    const opened = await s.openProject(input, scratchTl, scratch);
    const from = scratchTl.state;
    if (!from.tracks.length) {
      notify('That project has no tracks.', 'info');
      return;
    }

    let next = state();
    const created: { id: string; name: string; audio?: AudioBuffer; start: number; instrument: boolean }[] = [];

    for (const [i, track] of from.tracks.entries()) {
      const clips = from.clips.filter((c) => c.track === track.id);
      if (!clips.length) continue;

      const id = s.uid('t');
      const lane: Track = {
        id,
        name: track.name || `Track ${i + 1}`,
        color: stemColor(undefined, next.tracks.length),
        ...(track.automation ? { automation: track.automation } : {}),
        ...(track.instrument ? { instrument: track.instrument } : {}),
      };
      const sources = [...new Set(clips.filter((c) => !c.notes).map((c) => c.source))];
      let moved = clips.map((c) => ({ ...c, id: s.uid('c'), track: id }));
      let audio: AudioBuffer | undefined;

      if (!track.instrument && sources.length === 1) {
        audio = scratch.getBuffer(sources[0]!);
        if (!audio) continue;
        const source = s.uid('local');
        moved = moved.map((c) => ({ ...c, source }));
        useAudio(source, audio, `import:${source}`);
      } else if (!track.instrument) {
        // Several files on one track: bounce it from its first clip into one file.
        const start = Math.min(...clips.map((c) => c.start));
        scratch.load({ tracks: [{ id: track.id, name: track.name }], clips });
        scratch.mixer.set(track.id, { volume: 1, pan: 0, mute: false, solo: false });
        audio = await scratch.render({ from: start });
        const source = s.uid('local');
        moved = [s.makeClip({ track: id, source, name: lane.name, start, offset: 0, duration: audio.duration })];
        useAudio(source, audio, `import:${source}`);
      }

      next = s.addClips(s.addTrack(next, lane), moved);
      engine.mixer.set(id, scratch.mixer.channel(track.id).settings);
      created.push({ id, name: lane.name, audio, start: Math.min(...moved.map((c) => c.start)), instrument: !!track.instrument });
    }

    for (const marker of from.markers ?? []) next = { ...next, markers: [...(next.markers ?? []), { ...marker, id: s.uid('m') }] };
    quietly(next);
    engine.mixer.sync(state().tracks);

    for (const item of created) {
      if (item.instrument) {
        const lane = trackOf(item.id)!;
        const draft: Stem = { id: item.id, src: '', size: 0, name: item.name, meta: { name: item.name } };
        const meta = trackToMeta(draft, lane, [], channelOf(item.id), orderOf(item.id));
        const instrument = JSON.stringify(saveInstrument(state(), lane, () => undefined));
        emit('instrument', { trackId: item.id, title: item.name, meta: { ...meta, instrument } });
      } else if (item.audio) {
        const file = new File([encodeWav(item.audio)], `${item.name}.wav`, { type: 'audio/wav' });
        emit('recorded', { trackId: item.id, file, start: item.start, duration: item.audio.duration, name: item.name, imported: true });
      }
    }

    const bpm = Math.round(scratchTl.grid.bpm);
    const note = bpm !== Math.round(tempo.value) ? ` It was made at ${bpm} BPM.` : '';
    const missingFiles = opened.missing.length ? ` ${opened.missing.length} audio file(s) were missing.` : '';
    notify(`Added ${created.length} track(s) from the project.${note}${missingFiles} Save to keep their arrangement.`, 'success');
  } catch (error) {
    notify(error instanceof Error ? error.message : "The project couldn't be opened.", 'error');
  } finally {
    endActivity(activity);
    scratchTl.destroy();
    scratch.destroy();
  }
};

/** Pick a project file (.zip, .rpp or our own) to import. */
const pickProject = () => {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: `.zip,.rpp,.${APP.extension},.tfstudio` });
  input.addEventListener('change', () => {
    const files = [...(input.files ?? [])];
    if (files.length) void importProject(files.length === 1 ? files[0]! : files);
  });
  input.click();
};

/** Show an upload's progress under the toolbar until `done` is called. */
const trackUpload = (key: string, name: string) => {
  const id = `upload-${key}`;
  setActivity(id, { name, phase: 'upload', loaded: 0, total: 0 });

  return {
    progress: (loaded: number, total: number) => setActivity(id, { loaded, total }),
    done: () => endActivity(id),
  };
};

const removeStem = (stemId: string | number) => {
  missing.value = missing.value.filter((s) => String(s.id) !== String(stemId));
  added.delete(String(stemId));
  for (const [trackId, stem] of [...tracks]) {
    if (String(stem.id) !== String(stemId)) continue;
    tracks.delete(trackId);
    effects.delete(trackId);
    rack?.clear(trackId);
    if (studio) quietly(studio.removeTrack(state(), trackId));
    // Undo can't bring back a stem that was deleted.
    timeline.value?.history.clear();
    if (selectedTrackId.value === trackId) selectedTrackId.value = null;
  }
  delete saved[String(stemId)];
  delete shared[String(stemId)];
  checkDirty();
};

const renameStem = (stemId: string | number, title: string) => {
  for (const [trackId, stem] of tracks) {
    if (String(stem.id) !== String(stemId) || !studio) continue;
    stem.title = title;
    quietly({
      ...studio.updateTrack(state(), trackId, { name: title }),
      clips: state().clips.map((c) => (c.track === trackId ? { ...c, name: title } : c)),
    });
  }
};

const onDrop = (e: DragEvent) => {
  dropping.value = false;
  if (props.readonly) return;
  const files = Array.from(e.dataTransfer?.files || []).filter((f) => hasExtension(f.name, audioExts()));
  if (files.length) emit('files', files);
  else notify('Only audio files can be added as stems.', 'info');
};

/** Follow the playhead and the level meters while playing. */
let frame = 0;
const tick = () => {
  if (!engine) return;
  time.value = engine.time;
  for (const track of state().tracks) {
    const [left, right] = engine.mixer.channel(track.id).levels();
    levels.set(track.id, Math.min(1, Math.max(left, right)));
  }
  frame = playing.value ? requestAnimationFrame(tick) : 0;
};

const quiet = () => {
  cancelAnimationFrame(frame);
  frame = 0;
  levels.clear();
};

/** A Quasar icon as an element, for the studio's toolbar buttons. */
const icon = (name: string) => () => {
  const el = document.createElement('span');
  const vnode = h(QIcon, { name, size: '20px' });
  vnode.appContext = appContext;
  render(vnode, el);

  return el.firstElementChild ?? el;
};

/** Collab's own toolbar buttons, beside the studio's. */
const toolbarActions = (): ToolbarAction[] => {
  const editing = !props.readonly;

  return [
    ...(editing
      ? [
          {
            id: 'record-stem',
            label: 'Record from your microphone onto a new stem, or the keys onto the selected instrument',
            icon: icon('lucide-circle-dot'),
            pressed: () => recording.value || countingIn.value || recordingNotes.value,
            disabled: () => (!canRecord && !selectedInstrument.value) || startingRecording.value,
            onClick: () => toggleRecording(),
          },
          {
            id: 'count-in',
            label: 'Count in one bar before recording',
            icon: icon('lucide-timer'),
            pressed: () => countIn.value,
            onClick: () => setCountIn(!countIn.value),
          },
        ]
      : []),
    ...(editing
      ? [
          {
            id: 'marker',
            label: 'Add a marker at the playhead, like Verse or Chorus',
            icon: icon('lucide-flag'),
            onClick: () => {
              const tl = timeline.value;
              if (tl) tl.editMarkerName(tl.addMarker().id);
            },
          },
          {
            id: 'tempo-change',
            label: 'Change the tempo from the next bar',
            icon: icon('lucide-gauge'),
            onClick: () => {
              const tl = timeline.value;
              if (!tl) return;
              // Tempo changes sit on the bar lines, so show them.
              if (!grid.value) setGrid(true);
              const change = tl.addTempoChange();
              if (change) tl.editTempo(change.id);
            },
          },

        ]
      : []),
    ...(props.commentable
      ? [
          {
            id: 'comment',
            label: 'Message about the selected part',
            icon: icon('lucide-message-square'),
            disabled: () => !hasSelection.value,
            onClick: () => messageAboutSelection(),
          },
        ]
      : []),
    ...(props.aiEditable && editing
      ? [
          {
            id: 'ai-edit',
            label: 'Edit the selected part with AI',
            icon: icon('lucide-wand-sparkles'),
            disabled: () => !hasSelection.value,
            onClick: () => editSelection(),
          },
        ]
      : []),
    {
      id: 'project-files',
      label: 'Export or import a project for another DAW',
      icon: icon('lucide-folder-output'),
      onClick: () => openProjectFiles(),
    },
    {
      id: 'grid',
      label: 'Show bars and beats',
      icon: icon('lucide-grid-3x3'),
      pressed: () => grid.value,
      onClick: () => setGrid(!grid.value),
    },
    {
      id: 'follow',
      label: 'Follow the playhead while it plays',
      icon: icon('lucide-locate-fixed'),
      pressed: () => follow.value,
      onClick: () => setFollow(!follow.value),
    },
    {
      id: 'help',
      label: 'How to use the editor',
      icon: icon('lucide-circle-question-mark'),
      onClick: () => void (helpOpen.value = true),
    },
  ];
};

/** The toolbar's buttons, in order. */
const toolbarItems = () =>
  props.readonly
    ? ['play', 'stop', 'loop', '|', 'display', '|', 'zoomOut', 'fit', 'zoomIn', 'follow', '|', 'mixer', 'comment', 'grid', 'project-files', 'help']
    : [
        'browser',
        '|',
        'play',
        'stop',
        'record-stem',
        'count-in',
        'keys',
        'loop',
        'metronome',
        '|',
        'display',
        '|',
        'split',
        'duplicate',
        'delete',
        'undo',
        'redo',
        '|',
        'marker',
        'tempo-change',
        'comment',
        'ai-edit',
        '|',
        'zoomOut',
        'fit',
        'zoomIn',
        'follow',
        '|',
        'snap',
        'grid',
        '|',
        'mixer',
        'project-files',
        'help',
      ];

/** Links to sounds listed in the browser, by source id, for samples taken from them */
const soundUrls = new Map<string, string>();
const rememberSound = (source: string, url: string) => {
  soundUrls.set(source, url);
  return url;
};

/** A tab of sounds from the site's library or the person's own. */
const soundsSource = (id: 'library' | 'mine', label: string): LibrarySource => ({
  id,
  label,
  list: async ({ search, page }) => {
    const params = { search: search || undefined, page };
    const res = await (id === 'library' ? loadLibrarySoundsRequest(params) : loadMySoundsRequest(params)).send();

    return {
      items: res.data.map((sound: Sound) => ({
        id: String(sound.id),
        name: sound.name,
        kind: 'audio' as const,
        detail: [sound.category, sound.author].filter(Boolean).join(' · ') || undefined,
        duration: sound.duration,
        url: rememberSound(`sound:${sound.id}`, sound.url),
        source: `sound:${sound.id}`,
        data: { soundId: sound.id },
      })),
      more: res.meta.currentPage < res.meta.lastPage,
    };
  },
});

/** Our effects, and plugins when they're on, as a browser tab. */
const effectsSource = (): LibrarySource => ({
  id: 'effects',
  label: 'Effects',
  list: ({ search }) => {
    const items = catalog
      .map((c) => ({ id: c.url, name: c.name, kind: 'plugin' as const, url: c.url }))
      .filter((item) => !search || item.name.toLowerCase().includes(search.toLowerCase()));

    return { items };
  },
});

/**
 * A sound added from the browser becomes its own stem. A sound put on an
 * existing stem moves to a new track first, then the parent saves it.
 */
const onBrowserAdd = ({ item, track, clip }: { item: { name: string; data?: unknown }; track: string | null; clip?: { id: string; start: number } }) => {
  const soundId = (item.data as { soundId?: number } | undefined)?.soundId;
  if (!clip || !track || !studio || soundId === undefined) return;

  let trackId = track;
  if (tracks.has(track)) {
    trackId = studio.uid('t');
    const now = state();
    const moved = studio.addTrack(now, { id: trackId, name: item.name, color: stemColor(undefined, now.tracks.length) });
    quietly({ ...moved, clips: moved.clips.map((c) => (c.id === clip.id ? { ...c, track: trackId } : c)) });
  }
  // A stem added on the server isn't something to undo here.
  timeline.value?.history.clear();
  emit('sound', { trackId, soundId, start: Math.round(clip.start * 1000) / 1000, name: item.name });
};

onMounted(async () => {
  // Start on the audio while the editor itself loads.
  props.stems.filter((stem) => !readInstrument(stem)).forEach((stem) => void fetchAudio(stem).catch(() => undefined));

  studio = await import('@toneflix/studio');
  const s = studio;
  engine = new s.AudioEngine();
  context = engine.context as AudioContext;
  const faust = loadFaust();
  recorder = new s.Recorder(engine, { channels: 2 });
  waveforms = new s.Waveforms();
  rack = new s.PluginRack(engine, { load: rackLoader(() => pluginsOn.value), mouseOnly: (url) => s.isMouseOnlyWam(url) });
  // Instrument tracks play the built-in synth, drums and sampler, and WAM instruments when plugins are on.
  engine.setInstruments(rack.instruments());
  notes = new s.NoteRecorder(engine);
  engine.mixer.set(null, { volume: props.mixVolume ?? 1 });

  const tl = new s.StudioTimeline(host.value!, {
    grid: { bpm: tempo.value, snap: snap.value },
    showGrid: grid.value,
    pxPerSecond: zoom.value,
    minPxPerSecond: MIN_ZOOM,
    maxPxPerSecond: MAX_ZOOM,
    trackHeight: $q.screen.lt.sm ? 72 : 84,
    headerWidth: $q.screen.lt.sm ? 124 : 200,
    readonly: !!props.readonly,
    follow: follow.value,
    editTracks: false,
    instrumentTracks: [],
    palette: STEM_COLORS,
    renderHeader,
  });
  timeline.value = tl;

  // The mixer and browser slide over the timeline.
  mixer = new s.StudioMixer(stage.value!, {
    timeline: tl,
    engine,
    plugins: props.readonly ? undefined : rack,
    catalog,
    hidden: true,
    maxVolume: 1,
  });
  browser = props.readonly
    ? null
    : new s.StudioBrowser(stage.value!, {
        timeline: tl,
        engine,
        plugins: rack,
        hidden: true,
        labels: { title: 'Sounds and effects' },
        onSource: (id, buffer) => void waveforms?.get(`library:${id}`, () => buffer).then((peaks) => timeline.value?.setSource({ id }, peaks)),
        sources: [effectsSource()],
      });
  // Instruments: keys to play them live, a piano roll and step grid for their notes, and their settings.
  keys = new s.StudioKeys(stage.value!, { timeline: tl, engine, recorder, notes, hidden: true });
  instrumentPanel = new s.StudioInstrumentPanel({
    timeline: tl,
    engine,
    instruments: [...s.DEFAULT_INSTRUMENT_OPTIONS, ...(pluginsOn.value ? s.communityWamInstruments() : [])],
  });
  pianoRoll = new s.StudioPianoRoll(stage.value!, {
    timeline: tl,
    engine,
    keys,
    instrumentPanel,
    hidden: true,
    onSource: (id, buffer) => void onSampleSource(id, buffer),
  });

  // Sound tabs join once we know which the site offers.
  if (browser) {
    void loadSoundsStatusRequest()
      .send()
      .then((status) =>
        browser?.setSources([...(status.library ? [soundsSource('library', 'Sounds')] : []), soundsSource('mine', 'My sounds'), effectsSource()]),
      )
      .catch(() => undefined);
  }
  toolbar = new s.StudioToolbar(toolbarHost.value!, {
    timeline: tl,
    engine,
    mixer,
    ...(browser ? { browser } : {}),
    keys,
    plugins: rack,
    items: toolbarItems(),
    actions: toolbarActions(),
  });
  toolbarHost.value!.addEventListener('change', onToolbarChange);
  applyTempo();

  unlink.push(
    s.linkPlayback(tl, engine, { space: false }),
    s.linkRecorder(tl, recorder, { waveforms, name: () => `Recording ${takes}`, onTake }),
    s.linkNoteRecorder(tl, notes, { name: (n) => `Take ${n}` }),
    notes.on('start', () => (recordingNotes.value = true)),
    notes.on('stop', () => (recordingNotes.value = false)),
    tl.on('change', onChange),
    tl.on('zoom', ({ pxPerSecond }) => (zoom.value = pxPerSecond)),
    tl.on('automation', ({ track, param }) => (param ? automationLanes.set(track, param) : automationLanes.delete(track))),
    tl.on('select', ({ clips }) => {
      const track = state().clips.find((c) => c.id === clips[0])?.track;
      if (track) selectTrack(track);
    }),
    tl.on('range', ({ range }) => {
      selection.value = range && range.end - range.start > 0.05 ? { start: range.start, end: range.end } : null;
      if (range?.tracks.length === 1) selectTrack(range.tracks[0]!);
      toolbar?.refresh();
    }),
    tl.on('seek', ({ time: at }) => (time.value = at)),
    engine.on('play', () => {
      playing.value = true;
      cancelAnimationFrame(frame);
      tick();
      // Only one thing plays at a time.
      usePlayerStore().pause();
    }),
    engine.on('pause', ({ time: at }) => {
      playing.value = false;
      time.value = at;
      quiet();
    }),
    engine.on('end', ({ time: at }) => {
      playing.value = false;
      time.value = at;
      quiet();
    }),
    engine.on('seek', ({ time: at }) => (time.value = at)),
    engine.mixer.on('change', ({ track, settings }) => {
      if (track !== null) channels.set(track, { ...settings });
    }),
    recorder.on('error', ({ error }) => {
      console.warn('[stem editor] recording error', error);
      notify('Recording failed.', 'error');
      cleanupRecording(true);
    }),
    recorder.on('stop', ({ take }) => {
      if (!take) cleanupRecording(true);
    }),
    rack.on('change', ({ track }) => {
      if (restoring) return;
      void syncEffects(track).then(checkDirty);
    }),
    rack.on('error', ({ url, error }) => console.warn('[stem editor] plugin', url, error)),
    ...(browser ? [browser.on('add', onBrowserAdd)] : []),
  );
  // An effect's own controls changed a setting.
  document.addEventListener(EFFECT_CHANGE, onEffectChange);
  document.addEventListener('keydown', onKey);

  await faust;
  fillCatalog();
  if (master.value.length) await loadChain(null, master.value);

  const order = [...props.stems].sort((a, b) => (a.meta?.order ?? Infinity) - (b.meta?.order ?? Infinity));
  const placed = await Promise.all(order.map((stem) => placeStem(stem).catch(() => undefined)));
  quietly(withArrangement(state(), props.arrangement));
  // Loading isn't something to undo.
  tl.history.clear();
  toolbar.refresh();

  ready.value = true;
  await nextTick();
  fit();
  markSaved();
  emit('ready');

  order.forEach((stem, i) => {
    const trackId = placed[i];
    if (trackId) void fillStem(stem, trackId);
  });
});

onBeforeUnmount(() => {
  clearTimeout(shareTimer);
  quiet();
  if (recording.value) void recorder?.stop();
  cleanupRecording();
  document.removeEventListener('keydown', onKey);
  document.removeEventListener(EFFECT_CHANGE, onEffectChange);
  unlink.forEach((off) => off());
  if (notes?.isRecording) notes.stop();
  toolbar?.destroy();
  pianoRoll?.destroy();
  keys?.destroy();
  instrumentPanel?.destroy();
  notes?.destroy();
  browser?.destroy();
  mixer?.destroy();
  rack?.destroy();
  timeline.value?.destroy();
  recorder?.destroy();
  engine?.destroy();
  void context?.close();
});

defineExpose({
  addStem,
  addInstrument,
  addLocal,
  trackUpload,
  removeStem,
  renameStem,
  applyRemote,
  applyRemoteAll,
  snapshot,
  markSaved,
  mixVolume: () => engine?.mixer.master.settings.volume ?? props.mixVolume ?? 1,
  masterEffects: () => serializeEffects(master.value),
  arrangement: () => arrangementJson(state()),
  moveStem,
  stop,
  keepPluginStates,
  mixdown,
  highlight,
  currentTime,
  seek,
  adoptStem,
  dropTrack,
});
</script>

<style lang="scss" scoped>
.stem-editor {
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: #121212;

  &__missing {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  &__missing-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__toolbar {
    padding: 4px 8px;
    background: rgba(32, 32, 32, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  /* Holds the timeline; loading progress floats over its top edge. */
  &__stage {
    position: relative;
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 0;
  }

  &__skeleton {
    position: absolute;
    inset: 0;
    z-index: 3;
  }

  /* Fills what's left of the editor; the timeline scrolls its stems. */
  &__host {
    position: relative;
    flex: 1 1 auto;
    min-height: 160px;
  }

  /* Phones: the toolbar and the selected stem's bar scroll sideways */
  @media (max-width: 639.98px) {
    &__toolbar {
      overflow-x: auto;
      scrollbar-width: none;

      :deep(.tfs-toolbar) {
        flex-wrap: nowrap;
        width: max-content;
      }
    }

    &__selected {
      flex-wrap: nowrap;
      gap: 12px;
      min-height: 0;
      overflow-x: auto;
      scrollbar-width: none;

      > * {
        flex: none;
      }
    }

    /* The piano roll's and keys' bars wrap so every control stays in reach */
    &__stage :deep(.tfs-roll-bar) {
      flex-wrap: wrap;
      row-gap: 2px;
    }
  }

  &__recording {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    font-size: 0.85rem;
    color: #ffd7d7;
    background: rgba(229, 57, 53, 0.16);
    border-bottom: 1px solid rgba(229, 57, 53, 0.35);
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

.stem-colors {
  display: flex;
  flex: none;
  flex-wrap: wrap;
  gap: 10px;

  &__swatch {
    flex: none;
    width: 32px;
    height: 32px;
    padding: 0;
    cursor: pointer;
    border: 2px solid transparent;
    border-radius: 50%;
    outline: none;

    &:focus-visible,
    &--on {
      border-color: #fff;
    }
  }
}

.rec-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #ff4d4d;
  animation: rec-pulse 1s ease-in-out infinite;
}

@keyframes rec-pulse {
  50% {
    opacity: 0.35;
  }
}

.stem-editor {
  --tfs-toolbar-bg: transparent;
  --tfs-mixer-bg: #161616;
  --tfs-menu-bg: #1f1f1f;
}

.stem-editor__host :deep(.tfs) {
  --tfs-bg: #121212;
  --tfs-lane: #181818;
  --tfs-lane-alt: #1b1b1b;
  --tfs-header: #1c1c1c;
  --tfs-text: #e0e0e0;
  --tfs-clip: #03bfff;
  --tfs-playhead: #ffffff;
  --tfs-loop: #03bfff;
  --tfs-range: rgba(3, 191, 255, 0.18);
  position: absolute;
  inset: 0;
  height: auto;
}
</style>

<style lang="scss">
/* An effect's own controls, shown in the mixer's plugin window */
.tf-effect-gui {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: min(300px, 86vw);
  padding: 12px 14px;
  font-size: 0.85rem;
  color: #e0e0e0;

  &__about {
    margin: 0;
    color: #9e9e9e;
  }

  &__row {
    display: grid;
    grid-template-columns: 7.5em 1fr 5.5em;
    align-items: center;
    gap: 10px;

    input {
      width: 100%;
      accent-color: #03bfff;
    }

    output {
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
  }
}
</style>
