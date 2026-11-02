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
      <div class="stem-editor__group stem-editor__core">
        <IconBtn icon="lucide-skip-back:fill" aria-label="Back to start" class="max-sm:hidden!" :disable="!ready" @click="toStart">
          <q-tooltip>Back to start</q-tooltip>
        </IconBtn>
        <q-btn
          round
          unelevated
          color="glass"
          class="white-glass flex-none!"
          :aria-label="playing ? 'Pause' : 'Play'"
          :disable="!ready"
          @click="togglePlay"
        >
          <q-icon size="22px" :name="playing ? 'lucide-pause:fill' : 'lucide-play:fill'" />
          <q-tooltip>{{ playing ? 'Pause' : 'Play' }} (Space)</q-tooltip>
        </q-btn>
        <IconBtn icon="lucide-square:fill" aria-label="Stop" :disable="!ready" @click="stop">
          <q-tooltip>Stop</q-tooltip>
        </IconBtn>
        <IconBtn
          class="record-btn"
          :class="{ 'record-btn--on': recording }"
          :icon="recording ? 'lucide-square:fill' : 'lucide-circle-dot'"
          :aria-label="recording ? 'Stop recording' : 'Record'"
          :loading="startingRecording"
          :disable="!ready || (!recording && !canRecord)"
          @click="toggleRecording"
          v-if="!readonly"
        >
          <q-tooltip>{{ recording ? 'Stop recording' : canRecord ? 'Record from your microphone onto a new stem' : 'This browser can\'t record' }}</q-tooltip>
        </IconBtn>
        <div class="stem-editor__clock" aria-live="off">
          {{ formatClock(time) }} <span class="text-grey-6 max-sm:hidden">/ {{ formatClock(duration) }}</span>
        </div>
      </div>

      <div class="stem-editor__group stem-editor__edit" v-if="!readonly">
        <IconBtn icon="lucide-scissors" aria-label="Split at the playhead" :disable="!ready || !selectedTrackId" @click="split">
          <q-tooltip>Split the selected stem at the playhead (S)</q-tooltip>
        </IconBtn>
        <IconBtn icon="lucide-undo-2" aria-label="Undo" :disable="!canUndo" @click="undo">
          <q-tooltip>Undo (Ctrl+Z)</q-tooltip>
        </IconBtn>
        <IconBtn icon="lucide-redo-2" aria-label="Redo" :disable="!canRedo" @click="redo">
          <q-tooltip>Redo (Ctrl+Shift+Z)</q-tooltip>
        </IconBtn>
      </div>

      <IconBtn
        icon="lucide-ellipsis"
        class="stem-editor__more-btn sm:hidden!"
        aria-label="More editor tools"
        :aria-expanded="moreOpen"
        @click="moreOpen = true"
      />

      <!-- Tempo, grid, zoom and master: inline on wider screens, a sheet on phones -->
      <DefineTools>
        <div class="stem-editor__group stem-editor__selection">
          <IconBtn
            icon="lucide-skip-back:fill"
            class="sm:hidden!"
            aria-label="Back to start"
            :disable="!ready"
            @click="toStart"
          />
          <IconBtn
            icon="lucide-repeat"
            :class="{ 'text-toneflix': loop }"
            :aria-label="loop ? 'Stop looping the selection' : 'Loop the selection'"
            :disable="!ready || !hasSelection"
            @click="toggleLoop"
          >
            <q-tooltip>{{ hasSelection ? (loop ? 'Looping the selection' : 'Loop the selection') : 'Drag across the timeline to select a part to loop' }}</q-tooltip>
          </IconBtn>
          <IconBtn
            icon="lucide-message-circle-more"
            aria-label="Message about the selected part"
            :disable="!ready || !hasSelection"
            @click="messageAboutSelection"
            v-if="commentable"
          >
            <q-tooltip>{{ hasSelection ? 'Message about this part' : 'Drag across the timeline to select a part to talk about' }}</q-tooltip>
          </IconBtn>
          <IconBtn
            icon="lucide-wand-sparkles"
            aria-label="Edit the selected part with AI"
            :disable="!ready || !hasSelection"
            @click="editSelection"
            v-if="aiEditable && !readonly"
          >
            <q-tooltip>{{ hasSelection ? 'Edit this part with AI' : 'Drag across a stem to select a part to change with AI' }}</q-tooltip>
          </IconBtn>
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
          <IconBtn
            icon="lucide-grid-3x3"
            :class="{ 'text-toneflix': grid }"
            :aria-label="grid ? 'Hide the beat grid' : 'Show the beat grid'"
            :aria-pressed="grid"
            :disable="!ready"
            @click="setGrid(!grid)"
          >
            <q-tooltip>{{ grid ? 'Hide the beat grid' : 'Show bars and beats, and snap clips to them' }}</q-tooltip>
          </IconBtn>
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
          <IconBtn
            icon="lucide-timer"
            :class="{ 'text-toneflix': metronome }"
            :aria-label="metronome ? 'Turn the metronome off' : 'Turn the metronome on'"
            :aria-pressed="metronome"
            :disable="!ready"
            @click="setMetronome(!metronome)"
          >
            <q-tooltip>Metronome {{ metronome ? 'on' : 'off' }}</q-tooltip>
          </IconBtn>
          <IconBtn
            icon="lucide-hourglass"
            :class="{ 'text-toneflix': countIn }"
            :aria-label="countIn ? 'Turn the count-in off' : 'Count in one bar before recording'"
            :aria-pressed="countIn"
            :disable="!ready"
            @click="setCountIn(!countIn)"
            v-if="!readonly"
          >
            <q-tooltip>Count in one bar before recording: {{ countIn ? 'on' : 'off' }}</q-tooltip>
          </IconBtn>
        </div>

        <div class="stem-editor__group stem-editor__zoom">
          <IconBtn icon="lucide-minus" aria-label="Zoom out" :disable="!ready || !canZoomOut" @click="setZoom(zoom / 2)">
            <q-tooltip>Zoom out</q-tooltip>
          </IconBtn>
          <IconBtn icon="lucide-scan" aria-label="Fit to screen" :disable="!ready" @click="fit">
            <q-tooltip>Fit everything on screen</q-tooltip>
          </IconBtn>
          <IconBtn icon="lucide-plus" aria-label="Zoom in" :disable="!ready || !canZoomIn" @click="setZoom(zoom * 2)">
            <q-tooltip>Zoom in</q-tooltip>
          </IconBtn>
          <IconBtn
            icon="lucide-locate"
            :class="{ 'text-toneflix': follow }"
            :aria-label="follow ? 'Stop following the playhead' : 'Follow the playhead'"
            :aria-pressed="follow"
            :disable="!ready"
            @click="setFollow(!follow)"
          >
            <q-tooltip>{{ follow ? 'Following the playhead while it plays' : 'Follow the playhead while it plays' }}</q-tooltip>
          </IconBtn>
        </div>

        <div class="stem-editor__group stem-editor__master">
          <q-btn
            outline
            rounded
            dense
            no-caps
            size="sm"
            color="grey-4"
            class="flex-none! px-2 mr-1"
            icon="lucide-sliders-horizontal"
            :label="master.length ? `Master FX (${master.length})` : 'Master FX'"
            :disable="!ready"
            @click="masterEffectsOpen = true"
          >
            <q-tooltip>Effects on the whole mix, after the master volume</q-tooltip>
          </q-btn>
          <span class="master-meter" aria-hidden="true" :style="{ '--level': masterLevel }"><i /></span>
          <q-icon :name="masterVolume ? 'lucide-volume-2' : 'lucide-volume-x'" size="20px" class="flex-none!" />
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
          <IconBtn icon="lucide-circle-question-mark" aria-label="How to use the editor" class="max-sm:hidden!">
            <q-menu dark anchor="bottom right" self="top right" class="p-4 max-w-80">
              <div class="mb-2 font-bold">Using the editor</div>
              <ul class="pl-8 space-y-1 text-sm list-disc">
                <li><b>Space</b> plays and pauses.</li>
                <li>Click the timeline to move the playhead. Drag across it to select a part, then loop it.</li>
                <li v-if="!readonly">Drag a clip to move it, even onto another stem or over another clip (the later one plays on top). Drag its edges to trim it, its top corners to fade it.</li>
                <li v-if="!readonly">Click a stem, then <b>S</b> splits it at the playhead.</li>
                <li v-if="aiEditable && !readonly">Drag across a stem to select a part, then the wand button changes it with AI.</li>
                <li v-if="!readonly"><b>Ctrl+Z</b> undoes, <b>Ctrl+Shift+Z</b> redoes. <b>Delete</b> removes the selected clips.</li>
                <li>Each stem has its own volume, pan, mute (M) and solo (S).</li>
                <li v-if="!readonly">Use a stem's ⋮ menu to move it up or down, duplicate or remove it.</li>
                <li><b>↑ ↓</b> pick the stem above or below. <b>M</b> mutes it, <b>Shift+S</b> solos it.</li>
                <li v-if="!readonly"><b>Alt+↑ ↓</b> move it, <b>Ctrl+D</b> duplicates it.</li>
                <li><b>+ −</b> zoom, <b>0</b> fits, <b>L</b> loops the selection, <b>F</b> follows the playhead, <b>Home</b> goes to the start.</li>
                <li v-if="!readonly">Drop audio files here to upload them as stems.</li>
              </ul>
            </q-menu>
          </IconBtn>
        </div>
      </DefineTools>
      <div class="stem-editor__more" v-if="!compact">
        <ReuseTools />
      </div>
      <AppSheet title="Editor tools" v-model="moreOpen" v-else>
        <div class="stem-editor__sheet">
          <ReuseTools />
        </div>
      </AppSheet>
    </div>

    <!-- Fades for the selected stem. Always shown, so the timeline doesn't jump. -->
    <!-- Phones only show it once a stem is picked -->
    <div class="stem-editor__selected" :class="{ 'max-sm:hidden!': !selected }" v-if="!readonly">
      <template v-if="selected">
        <div class="flex items-center gap-2 flex-none! max-w-48">
          <button
            type="button"
            class="stem-dot"
            :style="{ background: selectedColor }"
            aria-label="Change colour"
            @click="colorsOpen = true"
          />
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
          class="flex-none! px-4"
          icon="lucide-sliders-horizontal"
          :label="selectedEffects.length ? `Effects (${selectedEffects.length})` : 'Effects'"
          @click="effectsOpen = true"
        />
        <IconBtn size="sm"
          color="grey-4"
          class="flex-none!"
          icon="lucide-copy"
          aria-label="Duplicate stem"
          @click="duplicate(selected.id)"
        >
          <q-tooltip>Duplicate this stem (Ctrl+D)</q-tooltip>
        </IconBtn>
        <q-btn
          outline
          rounded
          dense
          no-caps
          size="sm"
          color="grey-4"
          class="flex-none! px-4"
          :icon="selectedPattern.kind === 'drums' ? 'lucide-layout-grid' : 'lucide-piano'"
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

    <div class="stem-editor__stage">
      <StemActivity :items="[...activity.values()]" :finished="finished" v-if="activity.size" />
      <div ref="host" class="stem-editor__host" />
      <DawSkeleton class="stem-editor__skeleton" :lanes="Math.min(Math.max(stems.length, 2), 6)" v-if="!ready" />
    </div>

    <q-dialog v-model="effectsOpen">
      <q-card dark class="fx-card">
        <EffectsPanel
          :plugins="pluginsOn"
          :name="selected.name"
          :model-value="selectedEffects"
          @update:model-value="setEffects(selected!.id, $event)"
          @param="(i, params) => setEffectParams(selected!.id, i, params)"
          @commit="checkDirty"
          @open="openPlugin(selected!.id, $event)"
          v-if="selected"
        >
          <IconBtn icon="lucide-x" aria-label="Close" v-close-popup />
        </EffectsPanel>
      </q-card>
    </q-dialog>

    <q-dialog v-model="masterEffectsOpen">
      <q-card dark class="fx-card">
        <EffectsPanel
          name="the master"
          :readonly="readonly"
          :model-value="master"
          @update:model-value="setMasterEffects"
          @param="setMasterEffectParams"
          @commit="checkDirty"
        >
          <IconBtn icon="lucide-x" aria-label="Close" v-close-popup />
        </EffectsPanel>
      </q-card>
    </q-dialog>

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

    <q-dialog v-model="pluginOpen" @hide="closePlugin">
      <q-card dark class="max-w-[95vw]">
        <q-card-section class="flex items-center gap-2 py-2">
          <div class="font-bold">{{ pluginTitle }}</div>
          <q-space />
          <IconBtn icon="lucide-x" aria-label="Close" v-close-popup />
        </q-card-section>
        <div ref="pluginHost" class="stem-editor__plugin" />
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
  Recorder,
  SnapTo,
  StudioTimeline,
  Take,
  TimelineState,
  Track,
  Waveforms,
} from '@toneflix/studio';
import { computed, getCurrentInstance, h, nextTick, onBeforeUnmount, onMounted, reactive, ref, render, shallowRef, watch } from 'vue';
import { LocalStorage } from 'quasar';
import EffectsPanel from './EffectsPanel.vue';
import StemActivity, { type StemActivityItem } from './StemActivity.vue';
import StemTrackHeader, { type StripHost } from './StemTrackHeader.vue';
import DawSkeleton from 'src/components/Skeletons/DawSkeleton.vue';
import { stemAudio } from 'src/utils/studio/stem-audio';
import { isPlugin, needsPrint, parseEffects, pluginName, serializeEffects, addFaustEffects, type StemEffect } from 'src/utils/studio/effects';
import { buildChain, chainNodes, disposeChain, type BuiltChain } from 'src/utils/studio/chain';
import { loadFaustEffectsRequest } from 'src/utils/requests/effects';
import { flacOf, printKey, printTrack } from 'src/utils/studio/print';
import { parsePattern } from 'src/utils/studio/instruments';
import {
  applyStemClips,
  fillLengths,
  sourceStem,
  stemChannel,
  stemColor,
  STEM_COLORS,
  stemSource,
  stemToClips,
  stemToTrack,
  trackToMeta,
} from 'src/utils/studio/stem-timeline';
import { useQuasar } from 'quasar';
import { createReusableTemplate } from '@vueuse/core';
import AppSheet from 'src/components/Controllers/AppSheet.vue';
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
/** Phones keep one row of controls and put the rest in a sheet. */
const compact = computed(() => $q.screen.width < 640);
const moreOpen = ref(false);
const [DefineTools, ReuseTools] = createReusableTemplate();
watch(compact, (on) => {
  if (!on) moreOpen.value = false;
});
const appContext = getCurrentInstance()!.appContext;
const host = ref<HTMLElement>();
const timeline = shallowRef<StudioTimeline>();
let studio: Studio | null = null;
let engine: AudioEngine | null = null;
let recorder: Recorder | null = null;
let waveforms: Waveforms | null = null;
let context: AudioContext | null = null;
const unlink: (() => void)[] = [];

/** The master output level, 0 to 1 */
const masterLevel = ref(0);
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
const zoom = ref(40);
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
let recordTrackId: string | null = null;
let recordStartedAt = 0;
let recordTimer: ReturnType<typeof setInterval> | undefined;
let takes = 0;

/** The master bus effect chain, and how it was last saved */
const master = ref<StemEffect[]>(parseEffects(props.masterEffects));
let masterSaved = serializeEffects(master.value);

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
const canZoomIn = computed(() => zoom.value < MAX_ZOOM);
const canZoomOut = computed(() => zoom.value > MIN_ZOOM);

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

const selectedEffects = computed(() => (selected.value ? effects.get(selected.value.id) ?? [] : []));
const selectedColor = computed(() => trackList.value.find((t) => t.id === selected.value?.id)?.color);
const patternOf = (trackId: string | undefined) => {
  // Only stems in the editor's own list are reactive, so read through props.
  const stem = trackId ? tracks.get(trackId) : undefined;
  const fresh = stem ? props.stems.find((s) => String(s.id) === String(stem.id)) ?? stem : undefined;
  return fresh && !props.readonly ? parsePattern(fresh.meta?.instrument) : null;
};
const selectedPattern = computed(() => patternOf(selected.value?.id));

const maxFade = computed(() => {
  // Read the mirrored tracks so this follows edits.
  void trackList.value;
  const first = selected.value ? clipsOf(selected.value.id)[0] : undefined;
  return first ? Math.max(0.5, Math.floor(first.duration * 10) / 10) : 10;
});

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

/** Add what the timeline doesn't keep: the stem's effects, and an instrument stem's pattern. */
function withExtras(stem: Stem, trackId: string, meta: StemMeta): StemMeta {
  const fx = serializeEffects(effects.get(trackId) ?? []);
  return {
    ...meta,
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
  let dirty = false;
  for (const [id, meta] of Object.entries(snapshot())) {
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
  let next = applyStemClips(state(), incoming, trackId, lengthOf, openEnded, stemName);
  const track = next.tracks.find((t) => t.id === trackId);
  if (meta.color && track && meta.color !== track.color) next = studio.updateTrack(next, trackId, { color: stemColor(meta.color, 0) });
  if (meta.order !== undefined && meta.order !== next.tracks.findIndex((t) => t.id === trackId)) next = studio.moveTrack(next, trackId, meta.order);
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
      void applyEffects(trackId);
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
  if (selectedTrackId.value === trackId) syncFades();
  checkDirty();
};

/** Show changes to several stems, moving stems top first so each lands where it was put. */
const applyRemoteAll = (changes: Record<string, StemMeta>, asSaved = false) =>
  Object.entries(changes)
    .sort(([, a], [, b]) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .forEach(([id, meta]) => applyRemote(id, meta, asSaved));

/** Mirror the timeline after any change. */
const onChange = ({ state: now, final }: { state: TimelineState; final: boolean }) => {
  trackList.value = now.tracks;
  syncHistory();
  duration.value = studio?.timelineEnd(now) ?? 0;
  if (final) {
    engine?.mixer.sync(now.tracks);
    // A selected clip moved to another stem takes the selection with it.
    const moved = now.clips.find((c) => c.id === timeline.value?.selection[0])?.track;
    if (moved && moved !== selectedTrackId.value) selectedTrackId.value = moved;
    if (selectedTrackId.value && !now.tracks.some((t) => t.id === selectedTrackId.value)) selectedTrackId.value = null;
    syncFades();
    checkDirty();
  }
};

const syncHistory = () => {
  canUndo.value = !!timeline.value?.history.canUndo;
  canRedo.value = !!timeline.value?.history.canRedo;
};

const syncFades = () => {
  const clips = clipsOf(selectedTrackId.value);
  if (!clips.length) return;
  fade.in = clips[0]!.fadeIn;
  fade.out = clips[clips.length - 1]!.fadeOut;
};

/** Fade in the selected stem's first clip and fade out its last one. */
const applyFades = () => {
  const clips = clipsOf(selectedTrackId.value);
  if (!clips.length || !studio) return;
  const first = clips[0]!;
  const last = clips[clips.length - 1]!;

  timeline.value?.model.apply('Fades', (now) => {
    let next = now;
    for (const clip of clips) {
      next = studio!.setFades(next, clip.id, {
        fadeIn: clip === first ? fade.in : 0,
        fadeOut: clip === last ? fade.out : 0,
      });
    }
    return next;
  });
};

const togglePlay = async () => {
  if (!engine) return;
  if (playing.value) return engine.pause();

  if (loop.value && selection.value) {
    const { start, end } = selection.value;
    await engine.play(time.value >= start && time.value < end ? time.value : start);
  } else {
    await engine.play();
  }
};

const stop = () => engine?.stop();

const toStart = () => seek(0);

/** Move the playhead, carrying on playing from there if it was playing. */
const seek = (seconds: number) => {
  engine?.seek(Math.max(0, seconds));
  time.value = Math.max(0, seconds);
};

const toggleLoop = () => {
  if (!engine || !selection.value) return;
  loop.value = !loop.value;
  engine.setLoop(loop.value ? selection.value : null);
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

const undo = () => timeline.value?.undo();
const redo = () => timeline.value?.redo();

const setZoom = (pxPerSecond: number) => {
  timeline.value?.setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, pxPerSecond)));
};

/** Send the tempo, meter, grid and snap settings to the timeline and metronome. */
const applyTempo = () => {
  const [beats, unit] = meter.value.split('/').map(Number) as [number, number];
  const options = { bpm: tempo.value, meter: [beats, unit] as [number, number], snap: grid.value ? snap.value : ('off' as SnapTo) };
  timeline.value?.setGrid({ ...options, show: grid.value });
  engine?.metronome.grid.set(options);
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
  if (engine) engine.metronome.enabled = on;
};

const setCountIn = (on: boolean) => {
  countIn.value = on;
  remember('countIn', on);
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
const adoptStem = (trackId: string, stem: Stem) => {
  tracks.set(trackId, stem);
  added.add(String(stem.id));
  for (const clip of clipsOf(trackId)) if (!clip.source.startsWith('stem:')) aliases.set(clip.source, stem.id);
  renameStem(stem.id, stemTitle(stem));
  const meta = snapshot()[String(stem.id)];
  if (meta) {
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

/** Live chains by track id ('' is the master), and chains still missing Faust effects or plugins */
const chains = new Map<string, BuiltChain>();
const chainVersions = new Map<string, number>();
const pendingChains = new Set<string>();
let faustLoaded = false;

/** Rebuild a chain on its mixer channel from `effects` ('' is the master). */
const applyEffects = async (key: string) => {
  if (!engine || !context) return;
  const list = key === '' ? master.value : effects.get(key) ?? [];
  const version = (chainVersions.get(key) ?? 0) + 1;
  chainVersions.set(key, version);

  const chain = await buildChain(context, list, { plugins: pluginsOn.value, canLoad: context.state === 'running' && faustLoaded });
  if (chainVersions.get(key) !== version || !engine) return disposeChain(chain);

  const channel = key === '' ? engine.mixer.master : engine.mixer.channel(key);
  channel.setEffects(chainNodes(chain));
  disposeChain(chains.get(key));
  chains.set(key, chain);

  if (chain.complete) pendingChains.delete(key);
  else pendingChains.add(key);
  for (const { effect, error } of chain.errors) notify(`${pluginName(effect)} couldn't load: ${String((error as Error)?.message ?? error)}`, 'error');
  for (const { effect, plugin } of chain.live) {
    if (isPlugin(effect) && !effect.name && plugin) effect.name = plugin.descriptor?.name ?? plugin.name;
  }
};

const pluginOpen = ref(false);
const pluginTitle = ref('');
const pluginHost = ref<HTMLElement>();
let pluginShown: { close: () => void } | null = null;

/** Show a plugin's own controls in a dialog. */
const openPlugin = async (trackId: string, index: number) => {
  const effect = effects.get(trackId)?.[index];
  if (!effect || !context) return;
  if (context.state !== 'running') {
    await context.resume();
    await applyEffects(trackId);
  }
  const plugin = chains.get(trackId)?.live.find((l) => l.index === index)?.plugin;
  if (!plugin) {
    notify(`${pluginName(effect)} isn't loaded.`, 'error');
    return;
  }
  pluginTitle.value = pluginName(effect);
  pluginOpen.value = true;
  await nextTick();
  try {
    if (!plugin.createGui) throw new Error('No editor');
    const gui = await plugin.createGui();
    pluginHost.value!.append(gui);
    pluginShown = {
      close: () => {
        plugin.destroyGui?.(gui);
        gui.remove();
      },
    };
  } catch (err) {
    pluginOpen.value = false;
    notify(`${pluginName(effect)} has no controls to show.`, 'info');
    console.warn('[stem editor] plugin gui', err);
  }
};

const closePlugin = () => {
  pluginShown?.close();
  pluginShown = null;
};

/**
 * Record each stem with a plugin on through its chain, when its clips or
 * effects changed since the last time, and hand the audio to `upload`. The
 * server mixes that audio in place of the stem. Plugin settings are read
 * back into the stem's effects first, so they're saved too.
 */
const printPlugins = async (
  upload: (stem: Stem, audio: Blob, start: number, key: string) => Promise<Stem>,
  onRecord?: (stem: Stem) => void,
) => {
  if (!engine || !pluginsOn.value) return;
  for (const [trackId, list] of effects) {
    const stem = tracks.get(trackId);
    const track = trackOf(trackId);
    if (!stem || !track || !needsPrint(list) || unresolved(trackId)) continue;
    if (pendingChains.has(trackId)) {
      await context?.resume();
      await applyEffects(trackId);
    }

    const live = chains.get(trackId)?.live ?? [];
    // A plugin that didn't load would be left out; keep the last print.
    if (list.some((e, i) => isPlugin(e) && !e.bypassed && !live.some((l) => l.index === i))) {
      throw new Error(`A plugin on ${stemTitle(stem)} didn't load, so it wasn't recorded again.`);
    }
    for (const { index, plugin } of live) {
      if (plugin && isPlugin(list[index]!)) list[index]!.state = await plugin.audioNode.getState();
    }

    const clips = clipsOf(trackId);
    const key = await printKey({
      src: stem.src,
      clips: clips.map((c) => [c.start, c.offset, c.duration, c.gain, c.fadeIn, c.fadeOut, sourceStem(c.source, aliases)]),
      effects: serializeEffects(list),
      tempo: [tempo.value, meter.value],
    });
    if (stem.meta?.print?.key === key) continue;

    onRecord?.(stem);
    const [beats, unit] = meter.value.split('/').map(Number) as [number, number];
    const printed = await printTrack(engine, track, clips, list, { bpm: tempo.value, beats, unit });
    if (!printed) continue;
    const savedStem = await upload(stem, flacOf(printed.audio), printed.start, key);
    stem.meta = { ...stem.meta, print: savedStem.meta?.print };
  }
};

/** Apply chains that were waiting to load Faust effects or plugins. */
const applyPending = () => {
  if (context?.state !== 'running' || !faustLoaded) return;
  const waiting = [...pendingChains];
  pendingChains.clear();
  waiting.forEach((key) => void applyEffects(key));
};

/** Load the server's Faust effects so the add menu offers them and saved ones can play. */
const loadFaust = async () => {
  try {
    const { data } = await loadFaustEffectsRequest().send();
    addFaustEffects(data ?? []);
  } catch (err) {
    console.warn('[stem editor] faust effects', err);
  }
  faustLoaded = true;
  applyPending();
};

const setEffects = (trackId: string, list: StemEffect[]) => {
  effects.set(trackId, list.map((e) => ({ ...e, params: { ...e.params } })));
  void applyEffects(trackId).then(checkDirty);
};

/** Change one effect's settings while it plays. */
const setEffectParams = (key: string, index: number, params: Record<string, number>) => {
  const list = key === '' ? master.value : effects.get(key);
  if (!list?.[index]) return;
  list[index] = { ...list[index], params: { ...params } };
  chains.get(key)?.live.find((l) => l.index === index)?.node.applyParams(params);
};

const setMasterEffects = (list: StemEffect[]) => {
  master.value = list.map((e) => ({ ...e, params: { ...e.params } }));
  void applyEffects('').then(checkDirty);
};

const setMasterEffectParams = (index: number, params: Record<string, number>) => setEffectParams('', index, params);

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
  syncFades();
};

const effectsOpen = ref(false);
const masterEffectsOpen = ref(false);
const colorsOpen = ref(false);

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
  hasPattern: (id: string) => !!patternOf(id),
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
    effectsOpen.value = true;
  },
  openColors: (id: string) => {
    selectTrack(id);
    colorsOpen.value = true;
  },
  editPattern: (id: string) => {
    const stem = tracks.get(id);
    if (stem) emit('edit-instrument', stem);
  },
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

  if (e.key === ' ' && !mod && !(e.target instanceof HTMLButtonElement)) void togglePlay();
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
  else if (key === 'l' && hasSelection.value) toggleLoop();
  else if (key === 'f') setFollow(!follow.value);
  else if (e.key === 'Home') toStart();
  else handled = false;

  if (handled) e.preventDefault();
};

/** Zoom so the whole project fits on screen. */
const fit = () => timeline.value?.fit();

const setMasterVolume = (value: number | null) => {
  masterVolume.value = value ?? 0;
  engine?.mixer.set(null, { volume: masterVolume.value / 100 });
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
  const track = stemToTrack(stem, index);
  quietly(studio.addClips(studio.addTrack(state(), track), stemToClips(stem, track.id, lengthOf, openEnded, stemName)));
  tracks.set(track.id, stem);
  engine.mixer.set(track.id, stemChannel(stem.meta));

  const fx = parseEffects(stem.meta?.effects);
  if (fx.length) {
    effects.set(track.id, fx);
    await applyEffects(track.id);
  }

  return track.id;
};

/** Load a placed stem's audio. */
const fillStem = async (stem: Stem, trackId: string) => {
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
    disposeChain(chains.get(trackId));
    chains.delete(trackId);
    pendingChains.delete(trackId);
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
  const [left, right] = engine.mixer.master.levels();
  masterLevel.value = Math.min(1, Math.max(left, right));
  frame = playing.value ? requestAnimationFrame(tick) : 0;
};

const quiet = () => {
  cancelAnimationFrame(frame);
  frame = 0;
  levels.clear();
  masterLevel.value = 0;
};

onMounted(async () => {
  // Start on the audio while the editor itself loads.
  props.stems.forEach((stem) => void fetchAudio(stem).catch(() => undefined));

  studio = await import('@toneflix/studio');
  const s = studio;
  engine = new s.AudioEngine();
  context = engine.context as AudioContext;
  context.addEventListener('statechange', applyPending);
  void loadFaust();
  recorder = new s.Recorder(engine, { channels: 2 });
  waveforms = new s.Waveforms();
  engine.metronome.enabled = metronome.value;
  engine.mixer.set(null, { volume: masterVolume.value / 100 });

  const tl = new s.StudioTimeline(host.value!, {
    grid: { bpm: tempo.value, snap: grid.value ? snap.value : 'off' },
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
  applyTempo();

  unlink.push(
    s.linkPlayback(tl, engine, { space: false }),
    s.linkRecorder(tl, recorder, { waveforms, name: () => `Recording ${takes}`, onTake }),
    tl.on('change', onChange),
    tl.on('zoom', ({ pxPerSecond }) => (zoom.value = pxPerSecond)),
    tl.on('select', ({ clips }) => {
      const track = state().clips.find((c) => c.id === clips[0])?.track;
      if (track) selectTrack(track);
    }),
    tl.on('range', ({ range }) => {
      selection.value = range && range.end - range.start > 0.05 ? { start: range.start, end: range.end } : null;
      if (range?.tracks.length === 1) selectTrack(range.tracks[0]!);
      if (selection.value && loop.value) engine?.setLoop(selection.value);
      if (!selection.value && loop.value) {
        loop.value = false;
        engine?.setLoop(null);
      }
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
  );

  if (master.value.length) await applyEffects('');
  document.addEventListener('keydown', onKey);

  const order = [...props.stems].sort((a, b) => (a.meta?.order ?? Infinity) - (b.meta?.order ?? Infinity));
  const placed = await Promise.all(order.map((stem) => placeStem(stem).catch(() => undefined)));
  // Loading isn't something to undo.
  tl.history.clear();
  syncHistory();

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
  unlink.forEach((off) => off());
  chains.forEach((chain) => disposeChain(chain));
  timeline.value?.destroy();
  recorder?.destroy();
  engine?.destroy();
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
  printPlugins,
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

  /* Groups keep their order on wider screens, where the "more" wrapper is see-through */
  &__core {
    order: 1;
  }

  &__selection {
    order: 2;
  }

  &__edit {
    order: 3;
  }

  &__tempo {
    order: 4;
    gap: 2px;
  }

  &__zoom {
    order: 5;
  }

  &__master {
    order: 6;
  }

  &__more {
    display: contents;
  }

  /* The same groups inside the phone sheet */
  &__sheet {
    display: flex;
    flex-direction: column;
    gap: 16px;

    .stem-editor__group {
      flex-wrap: wrap;
      gap: 6px;
    }

    .stem-editor__master {
      margin-left: 0;

      .q-slider {
        flex: 1 1 auto;
        width: auto;
        min-width: 120px;
      }
    }
  }

  /* Phones: one row of transport and editing, the rest in a sheet */
  @media (max-width: 639.98px) {
    &__toolbar {
      flex-wrap: nowrap;
      gap: 2px;
      padding: 4px 6px;
    }

    &__clock {
      min-width: 0;
      margin: 0 4px;
      font-size: 0.85rem;
    }

    &__edit {
      gap: 0;
    }

    &__more-btn {
      order: 7;
      margin-left: auto;
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

  &__plugin {
    min-width: min(320px, 90vw);
    max-height: 80vh;
    overflow: auto;
    padding: 0 12px 12px;
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
  width: 12px;
  height: 12px;
  padding: 0;
  cursor: pointer;
  border: none;
  border-radius: 50%;
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

:deep(.tfs) {
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
