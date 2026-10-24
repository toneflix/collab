<template>
  <q-dialog
    :model-value="modelValue"
    :maximized="$q.screen.lt.sm"
    transition-show="slide-up"
    transition-hide="slide-down"
    @update:model-value="emit('update:modelValue', $event)"
    @hide="stopPreview"
  >
    <q-card dark class="inst">
      <header class="inst__head">
        <div class="min-w-0">
          <div class="text-lg font-bold truncate">{{ editing ? 'Edit pattern' : 'New instrument stem' }}</div>
          <div class="text-xs text-grey-5">
            {{ pattern.bpm }} BPM · {{ pattern.meter.join('/') }} · {{ pattern.bars }} {{ pattern.bars === 1 ? 'bar' : 'bars' }} ·
            {{ patternSeconds(pattern).toFixed(1) }}s
          </div>
        </div>
        <q-btn flat round dense icon="close" aria-label="Close" class="!flex-none" v-close-popup />
      </header>

      <q-tabs
        dense
        no-caps
        align="left"
        active-color="toneflix"
        indicator-color="toneflix"
        class="px-3"
        :model-value="pattern.kind"
        @update:model-value="switchKind"
        v-if="!editing"
      >
        <q-tab name="drums" icon="grid_view" label="Drum machine" />
        <q-tab name="keys" icon="piano" label="Piano roll" />
      </q-tabs>

      <div class="inst__controls">
        <q-btn
          round
          unelevated
          color="toneflix"
          text-color="dark"
          class="!flex-none"
          :icon="previewing ? 'stop' : 'play_arrow'"
          :aria-label="previewing ? 'Stop the preview' : 'Play the pattern'"
          @click="togglePreview"
        />
        <q-select
          dense
          dark
          outlined
          emit-value
          map-options
          options-dense
          class="w-28"
          label="Length"
          :options="[1, 2, 4, 8].map((n) => ({ label: `${n} ${n === 1 ? 'bar' : 'bars'}`, value: n }))"
          :model-value="pattern.bars"
          @update:model-value="setBars"
        />
        <q-select
          dense
          dark
          outlined
          emit-value
          map-options
          options-dense
          class="w-28"
          label="Sound"
          :options="SYNTH_PRESETS.map((p) => ({ label: p.label, value: p.key }))"
          :model-value="pattern.preset"
          @update:model-value="setPreset"
          v-if="pattern.kind === 'keys'"
        />
        <div class="flex items-center gap-1 no-wrap" v-if="pattern.kind === 'keys'">
          <q-btn flat round dense icon="keyboard_arrow_down" aria-label="Lower octave" :disable="octave <= 1" @click="octave--" />
          <span class="text-sm tabular-nums">Octave {{ octave }}</span>
          <q-btn flat round dense icon="keyboard_arrow_up" aria-label="Higher octave" :disable="octave >= 6" @click="octave++" />
        </div>
        <label class="flex items-center gap-2 no-wrap w-40">
          <q-icon name="volume_up" size="18px" class="!flex-none" />
          <q-slider
            dense
            color="toneflix"
            aria-label="Volume"
            :min="0"
            :max="1.5"
            :step="0.05"
            :model-value="pattern.volume ?? 0.9"
            @update:model-value="setVolume"
          />
        </label>
        <q-btn flat dense no-caps icon="delete_sweep" label="Clear" class="!flex-none" @click="clear" />
      </div>

      <!-- Drum machine -->
      <div class="inst__grid-wrap" v-if="pattern.kind === 'drums'">
        <div class="drums" :style="{ '--steps': totalSteps }">
          <template :key="voice.key" v-for="voice in DRUM_VOICES">
            <button type="button" class="drums__name" @click="hitVoice(voice.key)">{{ voice.label }}</button>
            <button
              type="button"
              class="drums__cell"
              :class="{
                'drums__cell--on': isOn(voice.key, step),
                'drums__cell--beat': step % beatSteps === 0,
                'drums__cell--bar': step % barSteps === 0,
                'drums__cell--now': playStep === step,
              }"
              :aria-label="`${voice.label}, step ${step + 1}`"
              :aria-pressed="isOn(voice.key, step)"
              :key="step"
              v-for="step in steps"
              @click="toggleStep(voice.key, step)"
            />
          </template>
        </div>
      </div>

      <!-- Piano roll -->
      <div class="inst__grid-wrap" ref="rollWrap" v-else>
        <div class="roll" :style="{ '--steps': totalSteps, '--rows': pitches.length }">
          <template :key="pitch" v-for="(pitch, row) in pitches">
            <button
              type="button"
              class="roll__key"
              :class="{ 'roll__key--black': isBlackKey(pitch), 'roll__key--c': pitch % 12 === 0 }"
              :style="{ gridRow: row + 1 }"
              @click="playNote(pitch)"
            >
              {{ pitch % 12 === 0 || !isBlackKey(pitch) ? noteName(pitch) : '' }}
            </button>
            <div
              class="roll__lane"
              :class="{ 'roll__lane--black': isBlackKey(pitch) }"
              :style="{ gridRow: row + 1 }"
              @pointerdown="startNote($event, pitch)"
            />
          </template>
          <div
            class="roll__grid"
            :style="{ gridRow: `1 / span ${pitches.length}`, backgroundSize: `calc(var(--cell) * ${beatSteps}) 100%, calc(var(--cell) * ${barSteps}) 100%` }"
          />
          <button
            type="button"
            class="roll__note"
            :key="`${n.pitch}-${n.step}`"
            :style="{
              gridRow: pitches.indexOf(n.pitch) + 1,
              left: `calc(var(--keys) + var(--cell) * ${n.step})`,
              width: `calc(var(--cell) * ${n.length} - 2px)`,
            }"
            :aria-label="`${noteName(n.pitch)} at step ${n.step + 1}, remove`"
            v-for="n in visibleNotes"
            @pointerdown.stop
            @click="removeNote(n)"
          />
          <div
            class="roll__now"
            :style="{ left: `calc(var(--keys) + var(--cell) * ${playStep})`, gridRow: `1 / span ${pitches.length}` }"
            v-if="playStep >= 0"
          />
        </div>
        <div class="px-3 pt-2 text-xs text-grey-5">
          Click or drag on the grid to add a note, click a note to remove it. Notes outside this octave range are kept.
        </div>
      </div>

      <q-card-actions align="right" class="inst__actions">
        <div class="mr-auto text-xs text-grey-5 max-sm:hidden">
          It's saved as an audio stem. You can open the pattern again to change it.
        </div>
        <q-btn flat no-caps label="Cancel" v-close-popup />
        <q-btn
          unelevated
          rounded
          no-caps
          color="toneflix"
          text-color="dark"
          :label="editing ? 'Update stem' : 'Add to track'"
          :loading="saving"
          :disable="isEmpty"
          @click="save"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useQuasar } from 'quasar';
import {
  DRUM_VOICES,
  SYNTH_PRESETS,
  audition,
  emptyPattern,
  isBlackKey,
  noteName,
  patternSeconds,
  renderPattern,
  stepSeconds,
  stepsPerBar,
  type DrumPattern,
  type DrumVoice,
  type InstrumentPattern,
  type KeyNote,
  type KeysPattern,
  type SynthPreset,
} from 'src/utils/studio/instruments';
import { usePlayerStore } from 'src/stores/player-store';

/**
 * Make a stem from a drum pattern or a piano-roll melody. The pattern plays
 * on a loop while you edit it, and is rendered to audio when saved.
 */
const props = defineProps<{
  modelValue: boolean;
  /** A saved pattern to edit; otherwise a new one is started */
  initial?: InstrumentPattern | null;
  bpm: number;
  timeSignature: string;
  saving?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [open: boolean];
  save: [pattern: InstrumentPattern, audio: AudioBuffer];
}>();

const $q = useQuasar();
const meterOf = (sig: string): [number, number] => {
  const [a, b] = sig.split('/').map(Number);
  return [a || 4, b || 4];
};

const pattern = ref<InstrumentPattern>(emptyPattern('drums', props.bpm, meterOf(props.timeSignature)));
const editing = computed(() => !!props.initial);
const octave = ref(3);

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;
    // The track's tempo wins, so the stem lines up with the grid.
    const base = props.initial ? structuredClone(JSON.parse(JSON.stringify(props.initial))) as InstrumentPattern : emptyPattern(pattern.value.kind, props.bpm, meterOf(props.timeSignature));
    pattern.value = { ...base, bpm: props.bpm, meter: meterOf(props.timeSignature) } as InstrumentPattern;
    if (pattern.value.kind === 'keys' && pattern.value.notes.length) {
      const low = Math.min(...pattern.value.notes.map((n) => n.pitch));
      octave.value = Math.max(1, Math.min(6, Math.floor(low / 12) - 1));
    }
  },
  { immediate: true },
);

const barSteps = computed(() => stepsPerBar(pattern.value.meter));
const beatSteps = computed(() => Math.max(1, Math.round(16 / pattern.value.meter[1])));
const totalSteps = computed(() => pattern.value.bars * barSteps.value);
const steps = computed(() => Array.from({ length: totalSteps.value }, (_, i) => i));

/** Two octaves, highest first */
const pitches = computed(() => {
  const low = (octave.value + 1) * 12;
  return Array.from({ length: 25 }, (_, i) => low + 24 - i);
});

const visibleNotes = computed(() =>
  pattern.value.kind === 'keys'
    ? pattern.value.notes.filter((n) => pitches.value.includes(n.pitch) && n.step < totalSteps.value)
    : [],
);

const isEmpty = computed(() =>
  pattern.value.kind === 'drums'
    ? !Object.values(pattern.value.rows).some((r) => r?.some((s) => s < totalSteps.value))
    : !pattern.value.notes.some((n) => n.step < totalSteps.value),
);

let ctx: AudioContext | null = null;
const audio = () => {
  ctx ??= new AudioContext();
  void ctx.resume();
  return ctx;
};

const switchKind = (kind: 'drums' | 'keys') => {
  if (kind === pattern.value.kind) return;
  pattern.value = emptyPattern(kind, props.bpm, meterOf(props.timeSignature));
  if (kind === 'keys') octave.value = 3;
  refresh();
};

const setBars = (bars: number) => {
  pattern.value.bars = bars;
  refresh();
};

const setPreset = (preset: SynthPreset) => {
  (pattern.value as KeysPattern).preset = preset;
  refresh();
};

const setVolume = (v: number | null) => {
  pattern.value.volume = v ?? 0.9;
  refresh();
};

const clear = () => {
  if (pattern.value.kind === 'drums') pattern.value.rows = {};
  else pattern.value.notes = [];
  refresh();
};

// Drums
const isOn = (voice: DrumVoice, step: number) => !!(pattern.value as DrumPattern).rows[voice]?.includes(step);

const hitVoice = (voice: DrumVoice) => audition(audio(), pattern.value, voice);

const toggleStep = (voice: DrumVoice, step: number) => {
  const p = pattern.value as DrumPattern;
  const row = p.rows[voice] ?? [];
  p.rows = { ...p.rows, [voice]: row.includes(step) ? row.filter((s) => s !== step) : [...row, step].sort((a, b) => a - b) };
  if (!row.includes(step)) hitVoice(voice);
  refresh();
};

// Keys
const playNote = (pitch: number) => audition(audio(), pattern.value, undefined, pitch);

const removeNote = (note: KeyNote) => {
  const p = pattern.value as KeysPattern;
  p.notes = p.notes.filter((n) => n !== note);
  refresh();
};

/** Press on a lane to add a note there; drag right to make it longer. */
const startNote = (e: PointerEvent, pitch: number) => {
  const lane = e.currentTarget as HTMLElement;
  const rect = lane.getBoundingClientRect();
  const cell = rect.width / totalSteps.value;
  const stepAt = (x: number) => Math.max(0, Math.min(totalSteps.value - 1, Math.floor((x - rect.left) / cell)));
  const start = stepAt(e.clientX);
  const p = pattern.value as KeysPattern;
  // Replace anything on this pitch that the new note would overlap.
  p.notes = p.notes.filter((n) => n.pitch !== pitch || n.step + n.length <= start || n.step > start);
  p.notes.push({ pitch, step: start, length: 1 });
  // Keep the reactive copy, so the comparisons below match what's in the list.
  const note = p.notes[p.notes.length - 1] as KeyNote;
  playNote(pitch);

  lane.setPointerCapture(e.pointerId);
  const move = (ev: PointerEvent) => {
    note.length = Math.max(1, stepAt(ev.clientX) - start + 1);
    p.notes = [...p.notes];
  };
  const up = () => {
    lane.removeEventListener('pointermove', move);
    lane.removeEventListener('pointerup', up);
    lane.removeEventListener('pointercancel', up);
    p.notes = p.notes.filter((n) => n === note || n.pitch !== pitch || n.step + n.length <= note.step || n.step >= note.step + note.length);
    refresh();
  };
  lane.addEventListener('pointermove', move);
  lane.addEventListener('pointerup', up);
  lane.addEventListener('pointercancel', up);
};

// Preview: the rendered pattern on a loop, re-rendered after each change.
const previewing = ref(false);
const playStep = ref(-1);
let source: AudioBufferSourceNode | null = null;
let loopStartedAt = 0;
let loopLength = 1;
let frame = 0;
let renderTimer: ReturnType<typeof setTimeout> | undefined;

const tick = () => {
  if (!previewing.value || !ctx) return;
  const into = (ctx.currentTime - loopStartedAt) % loopLength;
  playStep.value = Math.floor(into / stepSeconds(pattern.value.bpm)) % totalSteps.value;
  frame = requestAnimationFrame(tick);
};

const startLoop = async (keepPosition = false) => {
  const c = audio();
  const buffer = await renderPattern(JSON.parse(JSON.stringify(pattern.value)) as InstrumentPattern, c.sampleRate);
  if (!previewing.value) return;
  const offset = keepPosition && source ? (c.currentTime - loopStartedAt) % loopLength : 0;
  source?.stop();
  source = c.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(c.destination);
  loopLength = buffer.duration;
  const at = c.currentTime + 0.02;
  source.start(at, offset % loopLength);
  loopStartedAt = at - (offset % loopLength);
};

const togglePreview = async () => {
  if (previewing.value) return stopPreview();
  usePlayerStore().pause();
  previewing.value = true;
  await startLoop();
  frame = requestAnimationFrame(tick);
};

const stopPreview = () => {
  previewing.value = false;
  playStep.value = -1;
  cancelAnimationFrame(frame);
  source?.stop();
  source = null;
};

/** After a change, hear it on the next pass of the loop. */
const refresh = () => {
  if (!previewing.value) return;
  clearTimeout(renderTimer);
  renderTimer = setTimeout(() => void startLoop(true), 120);
};

const save = async () => {
  stopPreview();
  const copy = JSON.parse(JSON.stringify(pattern.value)) as InstrumentPattern;
  if (copy.kind === 'drums') {
    for (const key of Object.keys(copy.rows) as DrumVoice[]) copy.rows[key] = copy.rows[key]!.filter((s) => s < totalSteps.value);
  } else {
    copy.notes = copy.notes.filter((n) => n.step < totalSteps.value);
  }
  emit('save', copy, await renderPattern(copy, 44100));
};

onBeforeUnmount(() => {
  stopPreview();
  clearTimeout(renderTimer);
  void ctx?.close();
});
</script>

<style lang="scss" scoped>
.inst {
  display: flex;
  flex-direction: column;
  width: min(980px, 96vw);
  max-width: 96vw !important;
  max-height: 92vh;
  border-radius: 16px;
  background: #15171c;

  > * {
    flex: 0 0 auto;
  }

  @media (max-width: 599px) {
    width: 100vw;
    max-height: none;
    border-radius: 0;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px 6px;
  }

  &__controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    padding: 10px 16px;
  }

  &__grid-wrap {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 0 12px;
    overflow: auto;
  }

  &__actions {
    border-top: 1px solid rgba(255, 255, 255, 0.08);
  }
}

.drums {
  --cell: 30px;
  display: grid;
  grid-template-columns: 96px repeat(var(--steps), var(--cell));
  gap: 3px;
  width: max-content;
  padding: 4px 16px;

  &__name {
    position: sticky;
    left: 0;
    z-index: 1;
    padding: 0 8px;
    font-size: 0.8rem;
    text-align: left;
    color: #c7cbd2;
    border-radius: 6px;
    background: #1d2027;

    &:hover {
      color: #fff;
    }
  }

  &__cell {
    height: 30px;
    border-radius: 5px;
    background: #23262e;
    transition: background-color 0.08s linear;

    &--beat {
      background: #2a2e37;
    }

    &--bar {
      box-shadow: inset 2px 0 0 rgba(255, 255, 255, 0.18);
    }

    &--on {
      background: #03bfff;
      box-shadow: 0 0 8px rgba(3, 191, 255, 0.45);
    }

    &--now {
      outline: 2px solid rgba(255, 255, 255, 0.7);
      outline-offset: -2px;
    }
  }
}

.roll {
  --cell: 26px;
  --keys: 56px;
  --row: 20px;
  position: relative;
  display: grid;
  grid-template-columns: var(--keys) calc(var(--cell) * var(--steps));
  grid-template-rows: repeat(var(--rows), var(--row));
  width: max-content;
  margin: 0 16px;

  &__key {
    position: sticky;
    left: 0;
    z-index: 3;
    grid-column: 1;
    padding-right: 6px;
    font-size: 0.65rem;
    text-align: right;
    color: #333;
    border-bottom: 1px solid #c8c8c8;
    background: #eceff3;

    &--black {
      color: #ccc;
      background: #2b2e35;
    }

    &--c {
      font-weight: 700;
    }
  }

  &__lane {
    grid-column: 2;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    background: #1b1d23;
    cursor: crosshair;
    touch-action: none;

    &--black {
      background: #17191e;
    }
  }

  &__grid {
    grid-column: 2;
    z-index: 1;
    pointer-events: none;
    background-image:
      linear-gradient(90deg, rgba(255, 255, 255, 0.07) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.2) 1px, transparent 1px);
  }

  &__note {
    position: absolute;
    z-index: 2;
    height: calc(var(--row) - 3px);
    margin-top: 1px;
    border-radius: 4px;
    background: #03bfff;
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.25);

    &:hover {
      background: #ff7a7a;
    }
  }

  &__now {
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    width: var(--cell);
    pointer-events: none;
    background: rgba(255, 255, 255, 0.08);
  }
}
</style>
