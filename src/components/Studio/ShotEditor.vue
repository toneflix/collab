<template>
  <div class="shot-editor">
    <!-- Preview -->
    <div class="stage" :style="{ aspectRatio: aspect }">
      <video
        ref="clipEl"
        class="stage__media"
        muted
        playsinline
        preload="auto"
        :poster="current?.keyframeUrl ?? undefined"
        v-show="showsClip"
      />
      <img
        class="stage__media"
        :class="current?.motion ? `stage__still--${current.motion}` : ''"
        :style="{ animationDuration: `${(current?.end ?? 0) - (current?.start ?? 0)}s`, animationPlayState: playing ? 'running' : 'paused' }"
        :src="current?.keyframeUrl ?? undefined"
        :key="`${current?.id}-${current?.motion}`"
        alt=""
        v-if="!showsClip && current?.keyframeUrl"
      />
      <span class="stage__note" v-if="current && needsClip(current, takes) && !current.motion">New clip on save</span>
    </div>
    <audio ref="audioEl" preload="auto" :src="streamUrl ?? undefined" v-if="streamUrl" />

    <!-- Transport -->
    <div class="transport">
      <IconBtn :icon="playing ? 'lucide-pause' : 'lucide-play'" :aria-label="playing ? 'Pause' : 'Play'" @click="toggle" />
      <span class="transport__time">{{ clock(time) }} / {{ clock(duration) }}</span>
      <q-space />
      <IconBtn icon="lucide-scissors" aria-label="Split at the playhead" :disable="!canSplit" @click="splitHere">
        <q-tooltip>Split at the playhead</q-tooltip>
      </IconBtn>
      <IconBtn icon="lucide-zoom-out" aria-label="Zoom out" :disable="pps <= 8" @click="pps = Math.max(8, pps / 1.5)" />
      <IconBtn icon="lucide-zoom-in" aria-label="Zoom in" :disable="pps >= 160" @click="pps = Math.min(160, pps * 1.5)" />
    </div>

    <!-- Filmstrip -->
    <div ref="scroller" class="strip-scroll">
      <div class="strip" :style="{ width: `${duration * pps}px` }" @pointerdown.self="seekAt">
        <div ref="lane" class="strip__lane">
          <div
            class="strip__shot"
            :class="{ 'strip__shot--on': n === selected, 'strip__shot--todo': needsClip(shot, takes) }"
            :style="{ width: `${(shot.end - shot.start) * pps}px`, backgroundImage: shot.keyframeUrl ? `url(${shot.keyframeUrl})` : undefined }"
            :key="shot.id"
            @click="pick(n, $event)"
            v-for="(shot, n) in strip"
          >
            <span class="strip__kind">
              <q-icon :name="shot.kind === 'performance' ? 'lucide-mic-vocal' : shot.motion ? 'lucide-image' : 'lucide-film'" size="11px" />
            </span>
            <span class="strip__todo" v-if="needsClip(shot, takes)">New clip</span>
          </div>
        </div>
        <div
          class="strip__edge"
          :style="{ left: `${shot.end * pps}px` }"
          :key="`edge-${shot.id}`"
          @pointerdown.stop.prevent="startTrim(n, $event)"
          v-for="(shot, n) in strip.slice(0, -1)"
        />
        <div class="strip__head" :style="{ left: `${time * pps}px` }" />
      </div>
    </div>
    <p class="mt-1 text-[11px] text-grey-6">Drag a shot to move it, drag the line between two shots to trim them, tap a shot to change it.</p>

    <!-- The picked shot -->
    <div class="panel" v-if="shot">
      <div class="flex items-center gap-2 mb-2 no-wrap">
        <q-icon :name="shot.kind === 'performance' ? 'lucide-mic-vocal' : 'lucide-film'" size="16px" class="flex-none!" />
        <span class="font-semibold">{{ shot.kind === 'performance' ? 'Singing' : 'Scene' }} {{ selected + 1 }}</span>
        <span class="text-xs text-grey-5">{{ clock(shot.start) }}–{{ clock(shot.end) }} · {{ (shot.end - shot.start).toFixed(1) }}s</span>
        <q-space />
        <IconBtn size="sm" icon="lucide-chevron-left" aria-label="Move earlier" :disable="selected === 0" @click="moveShot(selected, selected - 1)" />
        <IconBtn size="sm" icon="lucide-chevron-right" aria-label="Move later" :disable="selected === strip.length - 1" @click="moveShot(selected, selected + 1)" />
        <IconBtn size="sm" icon="lucide-merge" aria-label="Merge with the next shot" :disable="selected === strip.length - 1" @click="mergeNext">
          <q-tooltip>Merge with the next shot</q-tooltip>
        </IconBtn>
      </div>

      <!-- What the shot shows -->
      <template v-if="editingPrompt">
        <q-input dark filled dense autogrow autofocus maxlength="600" v-model="draft" @keydown.esc="editingPrompt = false" />
        <div class="mt-1 text-[11px] text-grey-6">The still stays; the words guide the new clip.</div>
        <div class="flex justify-end gap-1 mt-2">
          <q-btn flat dense rounded no-caps size="sm" label="Cancel" class="flex-none! px-3" @click="editingPrompt = false" />
          <q-btn
            unelevated
            dense
            rounded
            no-caps
            size="sm"
            color="toneflix"
            text-color="dark"
            label="Save"
            class="flex-none! px-3"
            :loading="savingPrompt"
            :disable="draft.trim().length < 3"
            @click="savePrompt"
          />
        </div>
      </template>
      <div class="flex items-start gap-2 no-wrap" v-else>
        <p class="flex-1 min-w-0 text-sm text-grey-4">{{ shot.prompt }}</p>
        <IconBtn size="sm" icon="lucide-pencil" aria-label="Change what this shot shows" class="flex-none!" :disable="shot.id < 0" @click="editPrompt" />
      </div>

      <!-- Still only -->
      <div class="mt-4 mb-1 text-xs font-semibold text-grey-5">Show</div>
      <q-btn-toggle
        no-caps
        rounded
        unelevated
        dense
        toggle-color="toneflix"
        toggle-text-color="dark"
        color="transparent"
        class="show-toggle"
        :options="showOptions"
        :model-value="shot.motion ?? 'clip'"
        @update:model-value="changeMotion($event === 'clip' ? null : $event)"
      />

      <!-- Takes -->
      <template v-if="choices.length">
        <div class="mt-4 mb-1 text-xs font-semibold text-grey-5">Takes</div>
        <div class="takes">
          <button
            type="button"
            class="take"
            :class="{ 'take--on': !shot.motion && take.id === shot.takeId }"
            :key="take.id"
            @click="pickTake(take)"
            v-for="take in choices"
          >
            <video class="take__clip" muted playsinline preload="metadata" :src="`${take.clipUrl}#t=0.5`" :style="{ aspectRatio: aspect }" />
            <span class="take__label">
              {{ takeLabel(take) }} · {{ take.length.toFixed(1) }}s
            </span>
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Sortable, { type SortableEvent } from 'sortablejs';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { notifyError } from 'src/utils/composer';
import {
  saveMusicVideoShotsRequest,
  SHOT_MOTIONS,
  updateMusicVideoShotRequest,
  type MusicVideo,
  type MusicVideoTake,
  type ShotMotion,
} from 'src/utils/requests/videos';
import { merge, move, needsClip, setMotion, split, takeOffset, toRows, trim, useTake, type StripShot } from 'src/utils/video-strip';

const props = defineProps<{
  video: MusicVideo;
  /** The song, so the preview plays with sound */
  streamUrl?: string | null;
}>();

const emit = defineEmits<{
  /** The video as the API has it after a change was saved */
  saved: [video: MusicVideo];
  /** Whether a change is still waiting to be saved */
  pending: [pending: boolean];
}>();

const strip = ref<StripShot[]>([]);
const selected = ref(0);
const time = ref(0);
const playing = ref(false);
const pps = ref(24);
const editingPrompt = ref(false);
const draft = ref('');
const savingPrompt = ref(false);

const clipEl = ref<HTMLVideoElement | null>(null);
const audioEl = ref<HTMLAudioElement | null>(null);
const scroller = ref<HTMLElement | null>(null);
const lane = ref<HTMLElement | null>(null);

const takes = computed(() => props.video.takes ?? []);
const duration = computed(() => props.video.duration ?? strip.value.at(-1)?.end ?? 0);
const aspect = computed(() => props.video.ratio.replace(':', ' / '));
const shot = computed(() => strip.value[selected.value] ?? null);
const current = computed(() => strip.value.find((s) => time.value >= s.start && time.value < s.end) ?? strip.value.at(-1) ?? null);
const showsClip = computed(() => !!current.value && !current.value.motion && !!clipOf(current.value));
const canSplit = computed(() => {
  const s = current.value;
  return !!s && time.value - s.start >= 1 && s.end - time.value >= 1;
});

/** Takes the picked shot can play: its own, and b-roll made for any shot */
const choices = computed(() => {
  const s = shot.value;
  if (!s) return [];
  const own = s.copyOf ?? s.id;
  return takes.value.filter((take) => take.shotId === own || (s.kind === 'broll' && take.syncedFrom === null));
});

const showOptions = [
  { value: 'clip', label: 'Clip', icon: 'lucide-film' },
  ...SHOT_MOTIONS.map((motion) => ({ value: motion.value, label: `Still, ${motion.label.toLowerCase()}`, icon: motion.icon })),
];

const takeLabel = (take: MusicVideoTake) => {
  const s = shot.value;
  if (s && !s.motion && take.id === s.takeId) return 'Playing';
  return take.shotId === (s?.copyOf ?? s?.id) ? 'Earlier take' : 'Other scene';
};

const clipOf = (s: StripShot) => takes.value.find((take) => take.id === s.takeId)?.clipUrl ?? null;

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/* Saving: each change is sent a moment after the last one */

let saveTimer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> | null = null;

watch(
  () => props.video.shots,
  (shots) => {
    if (saveTimer || saving) return;
    strip.value = (shots ?? []).map((s) => ({ ...s }));
    selected.value = Math.min(selected.value, Math.max(0, strip.value.length - 1));
  },
  { immediate: true },
);

const change = (next: StripShot[]) => {
  strip.value = next;
  clearTimeout(saveTimer);
  emit('pending', true);
  saveTimer = setTimeout(() => {
    saveTimer = undefined;
    void save();
  }, 700);
};

const save = async () => {
  if (saving) await saving;

  saving = (async () => {
    const sent = strip.value;
    try {
      const res = await saveMusicVideoShotsRequest(props.video.id, toRows(sent)).send();
      // Split pieces get their real ids; anything changed meanwhile is sent next
      if (strip.value === sent) strip.value = (res.data.shots ?? []).map((s) => ({ ...s }));
      emit('saved', res.data);
    } catch (e) {
      notifyError(e, "The shots couldn't be saved.");
      strip.value = (props.video.shots ?? []).map((s) => ({ ...s }));
    }
  })();

  await saving;
  saving = null;
  if (!saveTimer) emit('pending', false);
};

/** Send any change still waiting */
const flush = async () => {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = undefined;
    await save();
  } else if (saving) {
    await saving;
  }
};

defineExpose({ flush });

/* Edits */

const pick = (n: number, e: MouseEvent) => {
  selected.value = n;
  editingPrompt.value = false;
  if (!playing.value) seekAt(e);
};

const splitHere = () => {
  const n = strip.value.findIndex((s) => s === current.value);
  change(split(strip.value, n, time.value));
  selected.value = n + 1;
};

const mergeNext = () => change(merge(strip.value, selected.value));

const moveShot = (from: number, to: number) => {
  change(move(strip.value, from, to));
  selected.value = to;
};

const changeMotion = (motion: ShotMotion | null) => change(setMotion(strip.value, selected.value, motion));

const pickTake = (take: MusicVideoTake) => change(useTake(strip.value, selected.value, take));

const editPrompt = () => {
  draft.value = shot.value?.prompt ?? '';
  editingPrompt.value = true;
};

const savePrompt = async () => {
  const s = shot.value;
  if (!s || draft.value.trim().length < 3) return;
  savingPrompt.value = true;
  try {
    await flush();
    const res = await updateMusicVideoShotRequest(props.video.id, s.id, draft.value.trim()).send();
    const shots = strip.value.map((other) => (other.id === s.id ? { ...res.data } : other));

    strip.value = shots;
    editingPrompt.value = false;
    emit('saved', { ...props.video, edited: true, shots });
  } catch (e) {
    notifyError(e, "The shot couldn't be changed.");
  } finally {
    savingPrompt.value = false;
  }
};

/* Trimming: drag the edge between two shots */

const startTrim = (n: number, e: PointerEvent) => {
  const el = e.currentTarget as HTMLElement;
  const box = el.parentElement!.getBoundingClientRect();
  let next = strip.value;

  el.setPointerCapture(e.pointerId);

  const onMove = (ev: PointerEvent) => {
    next = trim(strip.value, n, (ev.clientX - box.left) / pps.value);
    strip.value = next;
  };
  const onUp = () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onUp);
    change(next);
  };

  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onUp);
};

/* Moving: drag a shot along the strip */

let sorter: Sortable | null = null;

const onSorted = (e: SortableEvent) => {
  const { item, from, oldIndex, newIndex } = e;
  if (oldIndex === undefined || newIndex === undefined) return;
  // Hand the DOM back to Vue, which redraws the strip in its new order.
  item.remove();
  from.insertBefore(item, from.children[oldIndex] ?? null);
  moveShot(oldIndex, newIndex);
};

watch(
  lane,
  (el) => {
    sorter?.destroy();
    sorter = el
      ? Sortable.create(el, { animation: 150, delay: 200, delayOnTouchOnly: true, direction: 'horizontal', ghostClass: 'strip__shot--ghost', onUpdate: onSorted })
      : null;
  },
  { flush: 'post' },
);

/* Preview: the song drives the clock and the shot under the playhead is shown */

let frame = 0;
let startedAt = 0;
let startedFrom = 0;

const seek = (t: number) => {
  time.value = Math.min(Math.max(0, t), duration.value);
  if (audioEl.value) audioEl.value.currentTime = time.value;
  startedAt = performance.now();
  startedFrom = time.value;
  syncClip(true);
};

const seekAt = (e: MouseEvent | PointerEvent) => {
  const box = (scroller.value?.firstElementChild as HTMLElement | null)?.getBoundingClientRect();
  if (box) seek((e.clientX - box.left) / pps.value);
};

const syncClip = (force = false) => {
  const s = current.value;
  const el = clipEl.value;
  const url = s ? clipOf(s) : null;
  if (!s || !el || !url || s.motion) return;

  if (el.dataset.src !== url) {
    el.dataset.src = url;
    el.src = url;
    force = true;
  }

  const at = takeOffset(s, takes.value) + (time.value - s.start);
  if (force || Math.abs(el.currentTime - at) > 0.3) el.currentTime = at;
  if (playing.value && el.paused) void el.play().catch(() => undefined);
  if (!playing.value && !el.paused) el.pause();
};

const tick = () => {
  time.value = audioEl.value ? audioEl.value.currentTime : startedFrom + (performance.now() - startedAt) / 1000;
  if (time.value >= duration.value) {
    stop();
    return;
  }
  syncClip();
  frame = requestAnimationFrame(tick);
};

const stop = () => {
  playing.value = false;
  cancelAnimationFrame(frame);
  audioEl.value?.pause();
  clipEl.value?.pause();
};

const toggle = async () => {
  if (playing.value) return stop();
  if (time.value >= duration.value - 0.05) seek(0);
  playing.value = true;
  startedAt = performance.now();
  startedFrom = time.value;
  await audioEl.value?.play().catch(() => undefined);
  frame = requestAnimationFrame(tick);
};

watch(current, () => syncClip(true));
watch(clipEl, () => syncClip(true), { flush: 'post' });

/** Start zoomed so the whole song fits the strip */
onMounted(() => {
  const width = scroller.value?.clientWidth ?? 0;
  if (width && duration.value) pps.value = Math.min(160, Math.max(8, (width - 2) / duration.value));
});

onBeforeUnmount(() => {
  stop();
  sorter?.destroy();
  void flush();
});
</script>

<style lang="scss" scoped>
.stage {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-height: 60vh;
  margin: 0 auto;
  border-radius: var(--tf-radius-lg);
  background: #000;

  &__media {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__still--zoom_in {
    animation: zoom-in linear forwards;
  }

  &__still--zoom_out {
    animation: zoom-out linear forwards;
  }

  &__still--pan {
    animation: pan linear forwards;
  }

  &__note {
    position: absolute;
    top: 10px;
    left: 10px;
    padding: 2px 10px;
    font-size: 12px;
    border-radius: 999px;
    color: #111;
    background: #fbbf24;
  }
}

@keyframes zoom-in {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.2);
  }
}

@keyframes zoom-out {
  from {
    transform: scale(1.2);
  }
  to {
    transform: scale(1);
  }
}

@keyframes pan {
  from {
    transform: scale(1.15) translateX(6.5%);
  }
  to {
    transform: scale(1.15) translateX(-6.5%);
  }
}

.transport {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 10px 0 6px;

  &__time {
    margin-left: 4px;
    font-size: 13px;
    font-variant-numeric: tabular-nums;
    color: var(--tf-text-muted, #a1a1aa);
  }
}

.strip-scroll {
  overflow-x: auto;
  padding-bottom: 6px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);
}

.strip {
  position: relative;
  height: 76px;
  min-width: 100%;
  touch-action: pan-x;

  &__lane {
    display: flex;
    height: 100%;
  }

  &__shot {
    position: relative;
    flex: none;
    height: 100%;
    overflow: hidden;
    cursor: grab;
    border-right: 1px solid rgba(0, 0, 0, 0.6);
    background-color: var(--tf-surface-2);
    background-size: cover;
    background-position: center;

    &--on {
      outline: 2px solid var(--tf-primary);
      outline-offset: -2px;
      z-index: 1;
    }

    &--todo::after {
      content: '';
      position: absolute;
      inset: auto 0 0 0;
      height: 3px;
      background: #fbbf24;
    }

    &--ghost {
      opacity: 0.35;
    }
  }

  &__kind,
  &__todo {
    position: absolute;
    left: 4px;
    display: inline-flex;
    align-items: center;
    padding: 1px 5px;
    font-size: 10px;
    border-radius: 999px;
    color: #fff;
    background: rgba(0, 0, 0, 0.6);
    white-space: nowrap;
  }

  &__kind {
    top: 4px;
  }

  &__todo {
    bottom: 6px;
    color: #111;
    background: #fbbf24;
  }

  &__edge {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 2;
    width: 14px;
    margin-left: -7px;
    cursor: ew-resize;
    touch-action: none;

    &::after {
      content: '';
      position: absolute;
      top: 18px;
      bottom: 18px;
      left: 5px;
      width: 4px;
      border-radius: 2px;
      background: rgba(255, 255, 255, 0.85);
      opacity: 0;
      transition: opacity 0.15s;
    }

    &:hover::after,
    &:active::after {
      opacity: 1;
    }
  }

  &__head {
    position: absolute;
    top: 0;
    bottom: 0;
    z-index: 3;
    width: 2px;
    margin-left: -1px;
    pointer-events: none;
    background: var(--tf-primary);
  }
}

.panel {
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);
}

.show-toggle {
  flex-wrap: wrap;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.takes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
}

.take {
  overflow: hidden;
  padding: 0;
  text-align: left;
  color: inherit;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-md, 8px);
  background: var(--tf-surface-2);
  cursor: pointer;

  &--on {
    border-color: var(--tf-primary);
  }

  &__clip {
    display: block;
    width: 100%;
    object-fit: cover;
    background: #000;
  }

  &__label {
    display: block;
    padding: 4px 6px;
    font-size: 11px;
    color: var(--tf-text-muted, #a1a1aa);
  }
}
</style>
