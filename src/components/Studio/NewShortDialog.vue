<template>
  <q-dialog v-model="open" @show="reset" @hide="stop">
    <q-card
      dark
      class="short-dialog flex-none!"
      style="width: 640px; max-width: 100vw"
    >
      <header class="flex items-start gap-2 p-4 pb-2 no-wrap">
        <div class="min-w-0">
          <div class="text-lg font-bold">New short</div>
          <div class="text-xs text-grey-5">
            A vertical clip for Shorts, Reels and TikTok. Free.
          </div>
        </div>
        <IconBtn
          icon="lucide-x"
          class="flex-none! ml-auto"
          aria-label="Close"
          v-close-popup
        />
      </header>

      <div class="flex flex-col gap-4 p-4 pt-2 sm:flex-row sm:no-wrap">
        <div class="frame flex-none!">
          <video
            ref="player"
            playsinline
            preload="metadata"
            :src="video.videoUrl ?? undefined"
            :style="{ objectPosition: `${focus * 100}% 50%` }"
            @loadedmetadata="seek"
            @timeupdate="onTime"
            @pause="playing = false"
            @play="playing = true"
          />
          <q-btn
            round
            unelevated
            color="dark"
            class="frame__play"
            :icon="playing ? 'lucide-pause' : 'lucide-play'"
            :aria-label="playing ? 'Pause' : 'Play'"
            @click="toggle"
          />
        </div>

        <div class="grid gap-5 content-start min-w-0 grow">
          <div>
            <div class="flex items-center justify-between mb-1 text-sm">
              <span class="font-semibold flex-none!">Part of the song</span>
              <span class="text-grey-5 tabular-nums flex-none!">
                {{ clock(range.min) }}–{{ clock(range.max) }} ·
                {{ Math.round(range.max - range.min) }} s
              </span>
            </div>
            <q-range
              dark
              drag-range
              color="toneflix"
              :min="0"
              :max="duration"
              :step="0.5"
              :model-value="range"
              @update:model-value="setRange"
            />
            <div class="flex gap-2 mt-1">
              <q-btn
                dense
                outline
                rounded
                no-caps
                size="sm"
                class="px-2 flex-none!"
                :label="`${seconds} s`"
                :color="
                  Math.round(range.max - range.min) === seconds
                    ? 'toneflix'
                    : 'grey-7'
                "
                :key="seconds"
                :disable="seconds > duration"
                @click="setLength(seconds)"
                v-for="seconds in lengths"
              />
            </div>
          </div>

          <div v-if="video.ratio !== '9:16'">
            <div class="mb-1 text-sm font-semibold">Frame</div>
            <q-slider
              dark
              color="toneflix"
              :min="0"
              :max="1"
              :step="0.01"
              v-model="focus"
            />
            <div class="grid grid-cols-3 text-xs text-grey-6">
              <span>Left</span><span class="text-center">Centre</span
              ><span class="text-right">Right</span>
            </div>
          </div>

          <q-btn
            unelevated
            rounded
            no-caps
            color="toneflix"
            text-color="dark"
            icon="lucide-scissors"
            label="Cut short"
            class="mt-2"
            :loading="saving"
            @click="save"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { notifyError } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';
import type { MusicVideo } from 'src/utils/requests/videos';
import {
  createShortRequest,
  SHORT_MAX_SECONDS,
  SHORT_MIN_SECONDS,
  type MusicVideoShort,
} from 'src/utils/requests/shorts';

const props = defineProps<{ video: MusicVideo }>();
const emit = defineEmits<{ created: [short: MusicVideoShort] }>();
const open = defineModel<boolean>({ default: false });

const lengths = [15, 30, 60];
const player = ref<HTMLVideoElement | null>(null);
const range = ref({ min: 0, max: 30 });
const focus = ref(0.5);
const playing = ref(false);
const saving = ref(false);

const duration = computed(() => props.video.duration ?? 0);

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** Starts on a 30 second stretch from a third of the way in, where hooks often land */
const reset = () => {
  const length = Math.min(30, duration.value);
  const start = Math.max(
    0,
    Math.min(duration.value / 3, duration.value - length),
  );
  range.value = {
    min: Math.round(start * 2) / 2,
    max: Math.round((start + length) * 2) / 2,
  };
  focus.value = 0.5;
};

/** Keeps the stretch between the shortest and longest a short can be */
const setRange = (value: { min: number | null; max: number | null } | null) => {
  if (!value) return;
  let min = value.min ?? 0;
  let max = value.max ?? duration.value;
  const moved = min !== range.value.min ? 'min' : 'max';

  if (max - min > SHORT_MAX_SECONDS) {
    if (moved === 'min') max = min + SHORT_MAX_SECONDS;
    else min = max - SHORT_MAX_SECONDS;
  }
  if (max - min < SHORT_MIN_SECONDS) {
    if (moved === 'min') min = Math.max(0, max - SHORT_MIN_SECONDS);
    else max = Math.min(duration.value, min + SHORT_MIN_SECONDS);
  }

  range.value = { min, max };
  seek();
};

const setLength = (seconds: number) => {
  const min = Math.max(0, Math.min(range.value.min, duration.value - seconds));
  range.value = { min, max: min + seconds };
  seek();
};

const seek = () => {
  if (player.value) player.value.currentTime = range.value.min;
};

const onTime = () => {
  const el = player.value;
  if (el && el.currentTime >= range.value.max) {
    el.pause();
    el.currentTime = range.value.min;
  }
};

const toggle = () => {
  const el = player.value;
  if (!el) return;
  if (!el.paused) return el.pause();
  if (el.currentTime < range.value.min || el.currentTime >= range.value.max)
    el.currentTime = range.value.min;
  void el.play();
};

const stop = () => player.value?.pause();

const save = async () => {
  saving.value = true;
  try {
    const res = await createShortRequest(props.video.id, {
      start: range.value.min,
      end: range.value.max,
      focus: focus.value,
    }).send();
    emit('created', res.data);
    notify(res.message, 'success');
    open.value = false;
  } catch (e) {
    notifyError(e, "The short couldn't be started.");
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
.short-dialog {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
}

.frame {
  position: relative;
  align-self: center;
  width: 220px;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: 12px;
  background: #000;

  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__play {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.6) !important;
  }
}
</style>
