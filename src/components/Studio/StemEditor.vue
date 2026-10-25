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
        <q-btn
          flat
          round
          dense
          class="record-btn"
          :class="{ 'record-btn--on': recording }"
          :icon="recording ? ionStop : ionRadioButtonOn"
          :aria-label="recording ? 'Stop recording' : 'Record'"
          :loading="startingRecording"
          :disable="!ready || (!recording && !canRecord)"
          @click="toggleRecording"
          v-if="!readonly"
        >
          <q-tooltip>{{ recording ? 'Stop recording' : canRecord ? 'Record from your microphone onto a new stem' : 'This browser can\'t record' }}</q-tooltip>
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

      <div class="stem-editor__group stem-editor__tempo">
        <label class="tempo-field">
          <span class="sr-only">Tempo in beats per minute</span>
          <input
            type="number"
            inputmode="decimal"
            min="20"
            max="300"
            step="1"
            aria-label="Tempo (BPM)"
            :value="tempo"
            :disabled="!ready || readonly || recording"
            @change="onTempoInput"
            @keydown.stop
          />
          <span class="text-grey-5">BPM</span>
          <q-tooltip>The track's tempo, for the beat grid, metronome and instruments</q-tooltip>
        </label>
        <q-select
          dense
          borderless
          dark
          options-dense
          class="meter-select"
          aria-label="Time signature"
          :options="TIME_SIGNATURES"
          :model-value="meter"
          :disable="!ready || readonly || recording"
          @update:model-value="setMeter"
        />
        <q-btn
          flat
          round
          dense
          icon="grid_on"
          :class="{ 'text-toneflix': grid }"
          :aria-label="grid ? 'Hide the beat grid' : 'Show the beat grid'"
          :aria-pressed="grid"
          :disable="!ready"
          @click="setGrid(!grid)"
        >
          <q-tooltip>{{ grid ? 'Hide the beat grid' : 'Show bars and beats, and snap clips to them' }}</q-tooltip>
        </q-btn>
        <q-select
          dense
          borderless
          dark
          options-dense
          emit-value
          map-options
          class="snap-select"
          aria-label="Snap to"
          :options="SNAP_OPTIONS"
          :model-value="snap"
          @update:model-value="setSnap"
          v-if="grid"
        >
          <q-tooltip>What clips snap to when you move them</q-tooltip>
        </q-select>
        <q-btn
          flat
          round
          dense
          icon="av_timer"
          :class="{ 'text-toneflix': metronome }"
          :aria-label="metronome ? 'Turn the metronome off' : 'Turn the metronome on'"
          :aria-pressed="metronome"
          :disable="!ready"
          @click="setMetronome(!metronome)"
        >
          <q-tooltip>Metronome {{ metronome ? 'on' : 'off' }}</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="hourglass_top"
          :class="{ 'text-toneflix': countIn }"
          :aria-label="countIn ? 'Turn the count-in off' : 'Count in one bar before recording'"
          :aria-pressed="countIn"
          :disable="!ready"
          @click="setCountIn(!countIn)"
          v-if="!readonly"
        >
          <q-tooltip>Count in one bar before recording: {{ countIn ? 'on' : 'off' }}</q-tooltip>
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
        <q-btn
          flat
          round
          dense
          :icon="ionLocateOutline"
          :class="{ 'text-toneflix': follow }"
          :aria-label="follow ? 'Stop following the playhead' : 'Follow the playhead'"
          :aria-pressed="follow"
          :disable="!ready"
          @click="setFollow(!follow)"
        >
          <q-tooltip>{{ follow ? 'Following the playhead while it plays' : 'Follow the playhead while it plays' }}</q-tooltip>
        </q-btn>
      </div>

      <div class="stem-editor__group stem-editor__master">
        <q-btn
          outline
          rounded
          dense
          no-caps
          size="sm"
          color="grey-4"
          class="!flex-none px-2 mr-1"
          icon="tune"
          :label="master.length ? `Master FX (${master.length})` : 'Master FX'"
          :disable="!ready"
        >
          <q-tooltip>Effects on the whole mix, after the master volume</q-tooltip>
          <q-menu dark anchor="bottom right" self="top right" class="bg-[#1c1c1c]">
            <EffectsPanel
              name="the master"
              :readonly="readonly"
              :model-value="master"
              @update:model-value="setMasterEffects"
              @param="setMasterEffectParams"
              @commit="checkDirty"
            />
          </q-menu>
        </q-btn>
        <span class="master-meter" aria-hidden="true" :style="{ '--level': masterLevel }"><i /></span>
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
              <li v-if="!readonly">Drag a stem's grip, or use its arrows, to move it up or down.</li>
              <li v-if="!readonly">Drop audio files here to upload them as stems.</li>
            </ul>
          </q-menu>
        </q-btn>
      </div>
    </div>

    <!-- Fades for the selected stem. Always shown, so the timeline doesn't jump. -->
    <div class="stem-editor__selected" v-if="!readonly">
      <template v-if="selected">
        <div class="flex items-center gap-2 !flex-none max-w-48">
          <span class="stem-dot" :style="{ background: selectedColor }" />
          <span class="font-bold truncate">{{ selected.name }}</span>
        </div>
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
        <q-btn
          outline
          rounded
          dense
          no-caps
          size="sm"
          color="grey-4"
          class="!flex-none px-3"
          icon="tune"
          :label="selectedEffects.length ? `Effects (${selectedEffects.length})` : 'Effects'"
        >
          <q-menu ref="effectsMenu" dark anchor="bottom left" self="top left" class="bg-[#1c1c1c]">
            <EffectsPanel
              :name="selected.name"
              :model-value="selectedEffects"
              @update:model-value="setEffects(selected.id, $event)"
              @param="(i, params) => setEffectParams(selected!.id, i, params)"
              @commit="checkDirty"
            />
          </q-menu>
        </q-btn>
        <q-btn
          flat
          round
          dense
          size="sm"
          color="grey-4"
          class="!flex-none"
          :icon="ionCopyOutline"
          aria-label="Duplicate stem"
          @click="duplicate(selected.id)"
        >
          <q-tooltip>Duplicate this stem</q-tooltip>
        </q-btn>
        <div class="stem-colors" role="radiogroup" aria-label="Stem colour">
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
            @click="setColor(selected.id, c)"
          />
        </div>
        <q-btn
          outline
          rounded
          dense
          no-caps
          size="sm"
          color="grey-4"
          class="!flex-none px-3"
          :icon="selectedPattern.kind === 'drums' ? 'grid_view' : 'piano'"
          label="Edit pattern"
          @click="emit('edit-instrument', tracks.get(selected.id)!)"
          v-if="selectedPattern"
        />
      </template>
      <div class="text-grey-5" v-else>Click a stem to fade it, colour it, or add effects like EQ and reverb.</div>
    </div>

    <div class="stem-editor__recording" role="status" v-if="recording || countingIn">
      <span class="rec-dot" />
      <template v-if="countingIn">Count-in {{ countBeat }}…</template>
      <template v-else>Recording {{ formatClock(recordedFor) }}. Press stop when you're done.</template>
    </div>

    <div class="stem-editor__missing" v-if="missing.length">
      <div class="stem-editor__missing-row" :key="stem.id" v-for="stem in missing">
        <q-icon :name="ionAlertCircle" size="18px" class="text-amber-5 !flex-none" />
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
            class="!flex-none px-3"
            :icon="ionCloudUpload"
            label="Replace audio"
            @click="pickReplacement(stem)"
          />
          <q-btn
            flat
            round
            dense
            size="sm"
            color="grey-5"
            class="!flex-none"
            :icon="ionTrash"
            aria-label="Remove stem"
            @click="emit('remove', stem)"
          />
        </template>
      </div>
      <input
        ref="replaceInput"
        type="file"
        class="hidden"
        :accept="allowedAudioExts.join(', ')"
        @change="onReplacementPicked"
      />
    </div>

    <StemActivity :items="[...activity.values()]" :finished="finished" v-if="activity.size" />

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
  ionAlertCircle,
  ionChatbubbleEllipses,
  ionArrowRedo,
  ionArrowUndo,
  ionCloudUpload,
  ionCopyOutline,
  ionCut,
  ionHelpCircleOutline,
  ionLocateOutline,
  ionPause,
  ionPlay,
  ionPlaySkipBack,
  ionRadioButtonOn,
  ionRemove,
  ionRepeat,
  ionScan,
  ionStop,
  ionTrash,
  ionVolumeHigh,
  ionVolumeMute,
} from '@quasar/extras/ionicons-v8';
import type { DawEditorElement } from '@dawcore/components';
import type { NativePlayoutAdapter } from '@dawcore/transport';
import type { ClipTrack } from '@waveform-playlist/core';
import type { EngineState } from '@waveform-playlist/engine';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue';
import { LocalStorage } from 'quasar';
import type { SnapTo } from '@waveform-playlist/core';
import EffectsPanel from './EffectsPanel.vue';
import StemActivity, { type StemActivityItem } from './StemActivity.vue';
import { stemAudio } from 'src/utils/studio/stem-audio';
import { StemPlaceholders } from 'src/utils/studio/placeholders';
import { parseEffects, registerStudioEffects, serializeEffects, type StemEffect } from 'src/utils/studio/effects';
import { parsePattern } from 'src/utils/studio/instruments';
import { patchTrackControls, stemColor, STEM_COLORS, TrackLook } from 'src/utils/studio/track-look';
import { useQuasar } from 'quasar';
import { usePlayerStore } from 'src/stores/player-store';
import { notify } from 'src/utils/helpers';
import {
  encodeWav,
  formatClock,
  Stem,
  StemMeta,
  stemClips,
  stemTitle,
  stemToTrack,
  trackToMeta,
} from 'src/utils/daw';
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
  /** The track's tempo */
  bpm?: number;
  /** The track's meter, like "4/4" */
  timeSignature?: string;
  /** The saved master volume, 0 to 1 */
  mixVolume?: number;
  /** The saved master effect chain, as JSON text */
  masterEffects?: string;
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
  /** The tempo or meter was changed here */
  tempo: [value: { bpm: number; timeSignature: string }];
  /** A take was recorded onto a new track; the parent uploads it and calls adoptStem */
  recorded: [take: { trackId: string; file: File; start: number; duration: number; name: string }];
  /** Open the instrument editor for a stem made from a pattern */
  'edit-instrument': [stem: Stem];
  /** Copy a stem onto the track, with these settings for the copy */
  duplicate: [stem: Stem, meta: StemMeta];
  /** New audio was picked for a stem whose audio couldn't be loaded */
  replace: [stem: Stem, file: File];
  ready: [];
}>();

const $q = useQuasar();
const host = ref<HTMLElement>();
const editor = shallowRef<DawEditorElement>();
let adapter: NativePlayoutAdapter | null = null;
let context: AudioContext | null = null;
let look: TrackLook | null = null;
const effectsMenu = ref<{ show: () => void }>();
/** The master output level, 0 to 1 */
const masterLevel = ref(0);
/** Track id → its colour, mirrored from the track look so the page can show it */
const colors = reactive(new Map<string, string>());

const zoomLevels = [128, 256, 512, 1024, 2048, 4096, 8192];

const TIME_SIGNATURES = ['2/4', '3/4', '4/4', '5/4', '6/8', '7/8', '12/8'];
const SNAP_OPTIONS: { label: string; value: SnapTo }[] = [
  { label: 'No snap', value: 'off' },
  { label: 'Bar', value: 'bar' },
  { label: 'Beat', value: 'beat' },
  { label: '1/8', value: '1/8' },
  { label: '1/16', value: '1/16' },
];

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
const masterVolume = ref(Math.round((props.mixVolume ?? 1) * 100));
const dropping = ref(false);
const fade = reactive({ in: 0, out: 0 });

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
const metronome = ref(false);
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
let recordStream: MediaStream | null = null;
let recordTrackId: string | null = null;
let recordStartedAt = 0;
let recordTimer: ReturnType<typeof setInterval> | undefined;
let takes = 0;

/** The master bus effect chain, and how it was last saved */
const master = ref<StemEffect[]>(parseEffects(props.masterEffects));
let masterSaved = serializeEffects(master.value);

/** Track id in the editor → its effect chain */
const effects = reactive(new Map<string, StemEffect[]>());

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

const selectedEffects = computed(() => (selected.value ? effects.get(selected.value.id) ?? [] : []));
const selectedColor = computed(() => (selected.value ? colors.get(selected.value.id) : undefined));
const selectedPattern = computed(() => {
  // Only stems in the editor's own list are reactive, so read through props.
  const id = selected.value?.id;
  const stem = id ? tracks.get(id) : undefined;
  const fresh = stem ? props.stems.find((s) => String(s.id) === String(stem.id)) ?? stem : undefined;
  return fresh && !props.readonly ? parsePattern(fresh.meta?.instrument) : null;
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

  state.tracks.forEach((track, order) => {
    const stem = tracks.get(track.id);
    // A stem still waiting for audio keeps the arrangement it was saved with.
    if (stem && !placeholders.has(track.id)) out[String(stem.id)] = withExtras(stem, track.id, trackToMeta(stem, track), order);
  });
  return out;
};

/** Add what the engine doesn't keep: the stem's place, its effects, and an instrument stem's pattern. */
function withExtras(stem: Stem, trackId: string, meta: StemMeta, order = orderOf(trackId)): StemMeta {
  const fx = serializeEffects(effects.get(trackId) ?? []);
  return {
    ...meta,
    ...(order >= 0 ? { order } : {}),
    ...(colors.get(trackId) ? { color: colors.get(trackId) } : {}),
    ...(fx ? { effects: fx } : {}),
    ...(stem.meta?.instrument ? { instrument: stem.meta.instrument } : {}),
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
  const now = snapshot();
  let dirty = false;
  for (const [id, meta] of Object.entries(now)) {
    const json = JSON.stringify(meta);
    // A stem seen for the first time (just loaded or uploaded) is saved as is.
    saved[id] ??= json;
    if (saved[id] !== json) dirty = true;
  }
  emit('dirty', dirty || serializeEffects(master.value) !== masterSaved);
};

/** Call after saving, so the current state counts as saved. */
const markSaved = () => {
  saved = Object.fromEntries(Object.entries(snapshot()).map(([id, meta]) => [id, JSON.stringify(meta)]));
  shared = { ...saved };
  masterSaved = serializeEffects(master.value);
  emit('dirty', false);
};

/** A track's place from the top of the editor, or -1. */
const orderOf = (trackId: string) => editor.value?.engine?.getState().tracks.findIndex((t) => t.id === trackId) ?? -1;

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

  // Effects someone else changed.
  if (meta.effects !== undefined || stem.meta?.effects) {
    const incomingFx = parseEffects(meta.effects ?? '');
    if (serializeEffects(incomingFx) !== serializeEffects(effects.get(trackId) ?? [])) {
      effects.set(trackId, incomingFx);
      look?.set(trackId, { effects: incomingFx.length });
      void applyEffects(trackId);
    }
  }

  if (meta.order !== undefined && meta.order !== orderOf(trackId)) editor.value?.reorderTrack(trackId, meta.order);
  if (meta.color && meta.color !== colors.get(trackId)) colorTrack(trackId, stemColor(meta.color, 0));

  stem.meta = { ...stem.meta, ...meta };

  // The track controls hand changes to the engine a moment later, so work
  // out the resulting state rather than reading it back now.
  const next: ClipTrack = {
    ...track,
    clips: layout(clips) !== layout(track.clips) ? clips : track.clips,
    volume: mixer.volume ?? track.volume,
    pan: mixer.pan ?? track.pan,
    muted: mixer.muted ?? track.muted,
    soloed: mixer.soloed ?? track.soloed,
  };
  const after = JSON.stringify(withExtras(stem, trackId, trackToMeta(stem, next), meta.order ?? orderOf(trackId)));
  // Someone else's change to a stem still loading isn't an edit made here.
  if (placeholders.has(trackId)) placeholders.set(trackId, layoutOf(stem, next));
  // Already seen by everyone, so not shared again.
  shared[id] = after;
  if (asSaved || !wasDirty) saved[id] = after;
  if (selectedTrackId.value === trackId) syncFades();
  checkDirty();
};

/** Show changes to several stems, moving stems top first so each lands where it was put. */
const applyRemoteAll = (changes: Record<string, StemMeta>, asSaved = false) =>
  Object.entries(changes)
    .sort(([, a], [, b]) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .forEach(([id, meta]) => applyRemote(id, meta, asSaved));

const onState = (state: EngineState) => {
  colorNewTracks(state);
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

/** Move the playhead, carrying on playing from there if it was playing. */
const seek = (seconds: number) => {
  const ed = editor.value;
  if (!ed) return;
  const to = Math.max(0, seconds);
  if (playing.value) {
    ed.stop();
    void ed.play(to);
  } else {
    ed.seekTo(to);
    time.value = to;
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

/** Pixels per second on the timeline at the current zoom. */
const pixelsPerSecond = () => {
  const ed = editor.value;
  if (!ed) return 0;
  const rate = ed.effectiveSampleRate || ed.sampleRate;
  // On the beat grid the drawn scale differs from samplesPerPixel.
  const spp = (ed as unknown as { renderSamplesPerPixel?: number }).renderSamplesPerPixel || ed.samplesPerPixel;
  return rate / spp;
};

const scrollArea = () => editor.value?.shadowRoot?.querySelector<HTMLElement>('.scroll-area') ?? null;

/** Set while the timeline is scrolled by the editor, so it isn't taken as the person scrolling. */
let autoScrolling = false;
/** The person scrolled the timeline during this playback, so it stops following. */
let scrolledByHand = false;

/**
 * Keep the playhead on screen while it plays, a page at a time: when it nears
 * the right edge, the view jumps so it starts near the left again.
 */
const followPlayhead = (seconds: number) => {
  const area = scrollArea();
  if (!follow.value || !playing.value || scrolledByHand || !area) return;

  const x = seconds * pixelsPerSecond();
  const view = area.clientWidth;
  if (x >= area.scrollLeft + view * 0.9 || x < area.scrollLeft) {
    autoScrolling = true;
    area.scrollLeft = Math.max(0, x - view * 0.1);
    requestAnimationFrame(() => (autoScrolling = false));
  }
};

const onTimelineScroll = () => {
  if (!autoScrolling && playing.value) scrolledByHand = true;
};

const setFollow = (on: boolean) => {
  follow.value = on;
  scrolledByHand = false;
  remember('follow', on);
  if (on) followPlayhead(time.value);
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

  const pps = pixelsPerSecond();
  const left = start * pps;
  const width = Math.max(4, (end - start) * pps);

  const trackId = region.stemId ? trackIdOf(region.stemId) : null;
  const row = trackId ? root.querySelector<HTMLElement>(`.track-row[data-track-id="${trackId}"]`) : null;
  const target = row ?? root.querySelector<HTMLElement>('.timeline');
  const area = scrollArea();
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
  const spp = zoomLevels[zoom.value]!;
  ed.samplesPerPixel = spp;
  // On the beat grid the zoom is in ticks; keep the same width on screen.
  if (grid.value) ed.ticksPerPixel = Math.max(1, Math.round((spp * (tempo.value / 60) * ed.ppqn) / (ed.sampleRate || 48000)));
};

/** Send the tempo, meter, grid and metronome settings to the editor and its transport. */
const applyTempo = () => {
  const ed = editor.value;
  if (!ed) return;
  const [beats, unit] = meter.value.split('/').map(Number) as [number, number];
  ed.timeSignature = [beats, unit];
  ed.bpm = tempo.value;
  ed.scaleMode = grid.value ? 'beats' : 'temporal';
  ed.snapTo = grid.value ? snap.value : 'off';
  const transport = adapter?.transport;
  transport?.setTempo(tempo.value);
  transport?.setMeter(beats, unit);
  transport?.setMetronomeEnabled(metronome.value);
  transport?.setCountIn(countIn.value);
  transport?.setCountInBars(1);
  transport?.setCountInMode('recording-only');
  setZoom(zoom.value);
};

const emitTempo = () => emit('tempo', { bpm: tempo.value, timeSignature: meter.value });

const setTempo = (value: number) => {
  const bpm = Math.round(Math.min(300, Math.max(20, value)) * 100) / 100;
  if (!Number.isFinite(bpm) || bpm === tempo.value) return;
  tempo.value = bpm;
  applyTempo();
  emitTempo();
};

const onTempoInput = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const value = Number(input.value);
  if (Number.isFinite(value) && value > 0) setTempo(value);
  input.value = String(tempo.value);
};

const setMeter = (value: string) => {
  if (!TIME_SIGNATURES.includes(value) || value === meter.value) return;
  meter.value = value;
  applyTempo();
  emitTempo();
};

const setGrid = (on: boolean) => {
  grid.value = on;
  remember('grid', on);
  applyTempo();
};

const setSnap = (value: SnapTo) => {
  snap.value = value;
  remember('snap', value);
  applyTempo();
};

const setMetronome = (on: boolean) => {
  metronome.value = on;
  adapter?.transport?.setMetronomeEnabled(on);
};

const setCountIn = (on: boolean) => {
  countIn.value = on;
  remember('countIn', on);
  adapter?.transport?.setCountIn(on);
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

/** Where the playhead is, in seconds. */
const currentTime = () => editor.value?.currentTime ?? time.value;

/**
 * Record from the microphone onto a new track, starting at the playhead.
 * The other stems play along. When it stops, the take is handed to the
 * parent to upload as a stem.
 */
const toggleRecording = async () => {
  const ed = editor.value;
  if (!ed) return;
  if (recording.value) return void stopRecording();

  startingRecording.value = true;
  try {
    recordStream = await navigator.mediaDevices.getUserMedia({
      // Music, not a call: keep the sound as it is.
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } },
    });
  } catch (e) {
    startingRecording.value = false;
    notify(
      (e as DOMException)?.name === 'NotAllowedError'
        ? 'Allow microphone access to record.'
        : 'No microphone was found.',
      'error',
    );
    return;
  }

  try {
    takes++;
    const name = `Recording ${takes}`;
    const el = await ed.addTrack({ name, clips: [] });
    recordTrackId = el.trackId;
    ed.recordingStream = recordStream;
    if (playing.value) ed.pause();
    await ed.startRecording(recordStream, { trackId: el.trackId, overdub: true, clipName: name });
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
    await editor.value?.stopRecording();
  } finally {
    editor.value?.stop();
  }
};

/** Stop the microphone. With `dropTrack`, also remove the track made for the take. */
const cleanupRecording = (dropTrack = false) => {
  clearInterval(recordTimer);
  recordStream?.getTracks().forEach((t) => t.stop());
  recordStream = null;
  if (editor.value) editor.value.recordingStream = null;
  if (dropTrack && recordTrackId && !tracks.has(recordTrackId)) editor.value?.removeTrack(recordTrackId);
  recordTrackId = null;
  recording.value = false;
  countingIn.value = false;
};

const onRecordingComplete = async (e: Event) => {
  const { trackId, audioBuffer, startSample } = (e as CustomEvent<{ trackId: string; audioBuffer: AudioBuffer; startSample: number }>).detail;
  const name = engineTrack(trackId)?.name || `Recording ${takes}`;
  cleanupRecording();
  if (!audioBuffer || audioBuffer.duration < 0.2) {
    editor.value?.removeTrack(trackId);
    notify('That take was too short to keep.', 'info');
    return;
  }
  // Uploaded lossless; the server does any encoding.
  const file = new File([encodeWav(audioBuffer)], `${name}.wav`, { type: 'audio/wav' });
  emit('recorded', {
    trackId,
    file,
    start: Math.round((startSample / audioBuffer.sampleRate) * 1000) / 1000,
    duration: audioBuffer.duration,
    name,
  });
};

const onRecordingError = (e: Event) => {
  console.warn('[stem editor] recording error', (e as CustomEvent).detail);
  notify('Recording stopped because of an error.', 'error');
  cleanupRecording(true);
};

/**
 * Link a track already in the editor (a recorded take) to the stem it was
 * saved as, so it saves and syncs like any other stem.
 */
const adoptStem = (trackId: string, stem: Stem) => {
  tracks.set(trackId, stem);
  added.add(String(stem.id));
  renameStem(stem.id, stem.title || stem.name);
  const meta = snapshot()[String(stem.id)];
  if (meta) {
    saved[String(stem.id)] = JSON.stringify(meta);
    shared[String(stem.id)] = saved[String(stem.id)]!;
  }
  checkDirty();
};

/** Drop a track whose take couldn't be saved. */
const dropTrack = (trackId: string) => {
  if (!tracks.has(trackId)) editor.value?.removeTrack(trackId);
};

/** Rebuild a track's effect chain in the editor from `effects`. */
const applyEffects = async (trackId: string) => {
  const ed = editor.value;
  if (!ed) return;
  const list = effects.get(trackId) ?? [];
  try {
    await ed.setTrackEffectsState(
      trackId,
      list.map((e) => ({ kind: 'native' as const, type: e.type, params: e.params, bypassed: !!e.bypassed })),
    );
  } catch (err) {
    console.warn('[stem editor] effects', err);
  }
};

const setEffects = (trackId: string, list: StemEffect[]) => {
  effects.set(trackId, list.map((e) => ({ ...e, params: { ...e.params } })));
  look?.set(trackId, { effects: list.length });
  void applyEffects(trackId).then(checkDirty);
};

const setEffectParams = (trackId: string, index: number, params: Record<string, number>) => {
  const list = effects.get(trackId);
  const ed = editor.value;
  if (!list?.[index] || !ed) return;
  list[index] = { ...list[index], params: { ...params } };
  const live = ed.trackEffects(trackId)[index];
  if (live) ed.setTrackEffectParams(trackId, live.id, params);
};

/** Rebuild the master chain in the editor from `master`. */
const applyMaster = async () => {
  try {
    await editor.value?.setEffectsState(
      master.value.map((e) => ({ kind: 'native' as const, type: e.type, params: e.params, bypassed: !!e.bypassed })),
    );
  } catch (err) {
    console.warn('[stem editor] master effects', err);
  }
};

const setMasterEffects = (list: StemEffect[]) => {
  master.value = list.map((e) => ({ ...e, params: { ...e.params } }));
  void applyMaster().then(checkDirty);
};

const setMasterEffectParams = (index: number, params: Record<string, number>) => {
  const effect = master.value[index];
  const live = editor.value?.effects[index];
  if (!effect || !live) return;
  master.value[index] = { ...effect, params: { ...params } };
  editor.value?.setEffectParams(live.id, params);
};

/** Ask the parent to copy a stem, placed just below it. */
const duplicate = (trackId: string) => {
  const stem = tracks.get(trackId);
  const meta = snapshot()[String(stem?.id)];
  if (!stem || !meta || props.readonly) return;
  emit('duplicate', stem, { ...meta, order: orderOf(trackId) + 1 });
};

/** Move a stem to a place from the top. */
const moveStem = (stemId: string | number, index: number) => {
  const trackId = trackIdOf(stemId);
  if (trackId) editor.value?.reorderTrack(trackId, index);
  setTimeout(checkDirty);
};

/** Give a track its colour, and show it on its controls and clips. */
const colorTrack = (trackId: string, color: string) => {
  colors.set(trackId, color);
  look?.set(trackId, { color });
};

const setColor = (trackId: string, color: string) => {
  colorTrack(trackId, color);
  checkDirty();
};

/** Tracks the editor added on its own, like a recording, get the next colour. */
const colorNewTracks = (state: EngineState) =>
  state.tracks.forEach((t, i) => {
    if (!colors.has(t.id)) colorTrack(t.id, stemColor(undefined, i));
  });

/** Select a stem from its controls, as clicking its row does. */
const selectTrack = (trackId: string) => {
  if (!engineTrack(trackId) || selectedTrackId.value === trackId) return;
  editor.value?.engine?.selectTrack(trackId);
  selectedTrackId.value = trackId;
  look?.select(trackId);
  syncFades();
};

/** Open a stem's effects from its controls. */
const openEffects = async (e: Event) => {
  const { trackId } = (e as CustomEvent<{ trackId: string }>).detail;
  if (!trackId || !tracks.has(trackId)) return;
  selectTrack(trackId);
  await nextTick();
  effectsMenu.value?.show();
};

/** Pick the closest zoom that shows the whole project. */
const fit = () => {
  const ed = editor.value;
  if (!ed || !host.value) return;
  const controls = $q.screen.lt.sm ? 110 : 200;
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

/** Let go of the editor's decoded copy of a blob URL; the clips keep their own. */
const releaseUrl = (url: string) => {
  URL.revokeObjectURL(url);
  (editor.value as unknown as { _audioCache?: Map<string, unknown> })?._audioCache?.delete(url);
};

/** Track id → its stem's layout when the placeholder was made, while it waits for audio */
const placeholders = new Map<string, string>();
let silence: StemPlaceholders | null = null;

/** Show the undo and redo buttons as the engine's history stands. */
const syncHistory = () => {
  const state = editor.value?.engine?.getState();
  canUndo.value = !!state?.canUndo;
  canRedo.value = !!state?.canRedo;
};

const layoutOf = (stem: Stem, track: ClipTrack) => JSON.stringify(trackToMeta(stem, track));

/** Drop a clip's drawn waveform, so it's drawn again from new audio. */
const forgetPeaks = (clipIds: Set<string>) => {
  const host = editor.value as unknown as Record<'_peaksData' | '_clipOffsets' | '_clipBuffers', Map<string, unknown>>;
  for (const field of ['_peaksData', '_clipOffsets', '_clipBuffers'] as const) {
    if (host?.[field]) host[field] = new Map([...host[field]].filter(([id]) => !clipIds.has(id)));
  }
};

/**
 * Put a stem on the timeline with silent clips where its audio goes, so it
 * has its place, controls and arrangement before the audio is in.
 */
const placeStem = async (stem: Stem): Promise<string | undefined> => {
  const ed = editor.value;
  const engine = ed?.engine;
  // Before the editor is up, stems come in through the `stems` prop.
  if (!ed || !engine || !silence || added.has(String(stem.id))) return;
  added.add(String(stem.id));

  const el = await ed.addTrack({ ...stemToTrack(stem), clips: [] });
  const trackId = el.trackId;
  const track = engineTrack(trackId);
  if (!track) return;

  const placed: ClipTrack = {
    ...track,
    clips: silence.clips(stemClips(stem.meta || ({} as StemMeta)), stemTitle(stem)),
  };
  silence.quietly(
    engine,
    () => engine.updateTrack(trackId, placed),
    (list) => (list.some((t) => t.id === trackId) ? list : [...list, placed]),
  );
  syncHistory();
  tracks.set(trackId, stem);
  placeholders.set(trackId, layoutOf(stem, engineTrack(trackId) ?? placed));
  colorTrack(trackId, stemColor(stem.meta?.color, Math.max(0, orderOf(trackId))));

  const fx = parseEffects(stem.meta?.effects);
  look?.set(trackId, { effects: fx.length });
  if (fx.length) {
    effects.set(trackId, fx);
    await applyEffects(trackId);
  }

  return trackId;
};

/** Load a placed stem's audio into its silent clips. */
const fillStem = async (stem: Stem, trackId: string) => {
  const key = `stem-${stem.id}`;
  const id = String(stem.id);
  try {
    const blob = await fetchAudio(stem);
    setActivity(key, { phase: 'decode' });
    const audio = await context!.decodeAudioData(await blob.arrayBuffer());

    const engine = editor.value?.engine;
    const track = engineTrack(trackId);
    if (!engine || !track || tracks.get(trackId) !== stem) return;

    // Edits made while it loaded are kept, and count as unsaved.
    const edited = placeholders.get(trackId) !== layoutOf(stem, track);
    forgetPeaks(new Set(track.clips.map((c) => c.id)));
    silence!.fill(engine, trackId, audio);
    syncHistory();
    placeholders.delete(trackId);
    missing.value = missing.value.filter((s) => String(s.id) !== id);

    const meta = snapshot()[id];
    if (meta) {
      saved[id] = edited ? '' : JSON.stringify(meta);
      shared[id] = edited ? '' : saved[id]!;
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
  const ed = editor.value;
  if (!ed) return null;

  const url = URL.createObjectURL(file);
  try {
    const el = await ed.addTrack({ name, clips: [{ src: url, name }] });
    return el.trackId;
  } catch {
    return null;
  } finally {
    releaseUrl(url);
  }
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
  for (const [trackId, stem] of tracks) {
    if (String(stem.id) === String(stemId)) {
      editor.value?.removeTrack(trackId);
      tracks.delete(trackId);
      effects.delete(trackId);
      colors.delete(trackId);
      look?.forget(trackId);
      placeholders.delete(trackId);
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
    scrolledByHand = false;
    look?.start();
    // Only one thing plays at a time.
    usePlayerStore().pause();
  }],
  ['daw-pause', () => {
    playing.value = false;
    look?.stop();
  }],
  ['daw-stop', () => {
    playing.value = false;
    look?.stop();
    time.value = editor.value?.currentTime ?? 0;
  }],
  ['daw-timeupdate', (e) => {
    time.value = (e as CustomEvent<{ time: number }>).detail.time;
    followPlayhead(time.value);
  }],
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
    look?.select(selectedTrackId.value);
    syncFades();
  }],
  ['daw-track-control', () => setTimeout(checkDirty)],
  ['daw-track-reorder', () => setTimeout(checkDirty)],
  ['daw-track-error', (e) => {
    const { trackId, reason } = (e as CustomEvent<{ trackId: string; reason?: string }>).detail;
    if (reason) return;
    // The failed track has no audio, so it goes; the stem is listed under the toolbar instead.
    setTimeout(() => editor.value?.removeTrack(trackId));
  }],
  ['daw-error', (e) => console.warn('[stem editor]', (e as CustomEvent).detail)],
  ['daw-recording-complete', (e) => void onRecordingComplete(e)],
  ['daw-recording-error', onRecordingError],
  ['tf-track-effects', (e) => void openEffects(e)],
  ['tf-track-select', (e) => selectTrack((e as CustomEvent<{ trackId: string }>).detail.trackId)],
];

onMounted(async () => {
  // Start on the audio while the editor itself loads.
  props.stems.forEach((stem) => void fetchAudio(stem).catch(() => undefined));

  // The web components need the browser, so they load here and not during SSR.
  const [{ registerEffect, DawTrackControlsElement }, { NativePlayoutAdapter }] = await Promise.all([
    import('@dawcore/components'),
    import('@dawcore/transport'),
  ]);
  registerStudioEffects(registerEffect);
  patchTrackControls(DawTrackControlsElement);

  const ed = document.createElement('daw-editor');
  ed.setAttribute('eager-resume', 'document');
  ed.samplesPerPixel = zoomLevels[zoom.value]!;
  ed.waveHeight = $q.screen.lt.sm ? 64 : 80;
  ed.mono = true;
  ed.timescale = true;
  ed.clipHeaders = true;
  ed.interactiveClips = !props.readonly;
  ed.trackReordering = !props.readonly;
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
  adapter.transport.on('countIn', ({ beat }: { beat: number }) => {
    countingIn.value = true;
    countBeat.value = beat;
  });
  adapter.transport.on('countInEnd', () => {
    countingIn.value = false;
    recordStartedAt = performance.now();
  });

  host.value!.addEventListener('daw-track-remove', onRemoveRequest, true);
  listeners.forEach(([name, fn]) => ed.addEventListener(name, fn));
  ed.addEventListener('pointerdown', onPointerDown, true);
  host.value!.appendChild(ed);
  editor.value = ed;

  const engine = await ed.ready();
  engine.on('statechange', onState);
  scrollArea()?.addEventListener('scroll', onTimelineScroll, { passive: true });
  look = new TrackLook(ed, adapter, context, (level) => (masterLevel.value = level));
  if (master.value.length) await applyMaster();
  engine.setMasterVolume(masterVolume.value / 100);
  applyTempo();

  silence = new StemPlaceholders(context);
  const placed = await Promise.all(props.stems.map((stem) => placeStem(stem).catch(() => undefined)));
  // Loading isn't something to undo.
  engine.clearHistory();
  canUndo.value = false;
  canRedo.value = false;

  ready.value = true;
  duration.value = ed.duration;
  fit();
  markSaved();
  emit('ready');

  props.stems.forEach((stem, i) => {
    const trackId = placed[i];
    if (trackId) void fillStem(stem, trackId);
  });
});

onBeforeUnmount(() => {
  clearTimeout(shareTimer);
  if (recording.value) void editor.value?.stopRecording();
  cleanupRecording();
  const ed = editor.value;
  ed?.engine?.off('statechange', onState);
  scrollArea()?.removeEventListener('scroll', onTimelineScroll);
  look?.dispose();
  ed?.stop();
  ed?.remove();
  host.value?.removeEventListener('daw-track-remove', onRemoveRequest, true);
  ed?.removeEventListener('pointerdown', onPointerDown, true);
  void context?.close();
});

defineExpose({
  addStem,
  addLocal,
  trackUpload,
  removeStem,
  renameStem,
  applyRemote,
  applyRemoteAll,
  snapshot,
  markSaved,
  mixVolume: () => masterVolume.value / 100,
  masterEffects: () => serializeEffects(master.value),
  moveStem,
  stop,
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

  /* Fills what's left of the editor; the timeline scrolls its stems. */
  &__host {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    min-height: 160px;
  }

  &__tempo {
    gap: 2px;
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

.stem-dot {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.stem-colors {
  display: flex;
  flex: none;
  gap: 5px;

  &__swatch {
    flex: none;
    width: 16px;
    height: 16px;
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

.master-meter {
  position: relative;
  flex: none;
  width: 6px;
  height: 22px;
  overflow: hidden;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);

  i {
    position: absolute;
    inset: 0;
    background: linear-gradient(0deg, #2ed47a 0%, #2ed47a 70%, #ffc93c 85%, #ff5c5c 100%);
    clip-path: inset(calc(100% - var(--level, 0) * 100%) 0 0 0);
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

.record-btn {
  color: #ff6b6b;

  &--on {
    color: #fff;
    background: #e53935;
  }
}

.tempo-field {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 0.8rem;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);

  input {
    width: 3.2em;
    font-size: 0.95rem;
    font-variant-numeric: tabular-nums;
    color: inherit;
    text-align: right;
    background: transparent;
    outline: none;
    -moz-appearance: textfield;

    &::-webkit-outer-spin-button,
    &::-webkit-inner-spin-button {
      margin: 0;
      -webkit-appearance: none;
    }
  }
}

.meter-select {
  width: 64px;
  padding-left: 6px;
  font-size: 0.85rem;
}

.snap-select {
  width: 84px;
  font-size: 0.85rem;
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
  --daw-controls-width: 200px;
  --daw-min-height: 0;
  flex: 1 1 auto;
  min-height: 0;

  @media (max-width: 599px) {
    --daw-controls-width: 110px;
  }
}
</style>
