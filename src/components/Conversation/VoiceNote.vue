<template>
  <div class="voice" :class="{ 'voice--mine': mine }">
    <button
      type="button"
      class="voice__play"
      :aria-label="playing ? 'Pause voice note' : 'Play voice note'"
      @click="toggle"
    >
      <q-spinner size="16px" v-if="loading" />
      <q-icon :name="playing ? 'pause' : 'play_arrow'" size="22px" v-else />
    </button>

    <div
      class="voice__bars"
      role="slider"
      tabindex="0"
      aria-label="Voice note position"
      :aria-valuemin="0"
      :aria-valuemax="Math.round(length)"
      :aria-valuenow="Math.round(current)"
      @click="seek"
      @keydown.left.prevent="nudge(-5)"
      @keydown.right.prevent="nudge(5)"
    >
      <span
        class="voice__bar"
        :class="{ 'voice__bar--played': (i + 0.5) / bars.length <= progress }"
        :style="{ height: `${Math.max(10, bar * 100)}%` }"
        :key="i"
        v-for="(bar, i) in bars"
      />
    </div>

    <span class="voice__time">{{ clock(playing || current ? current : length) }}</span>
    <audio ref="audio" preload="metadata" :src="voice.url" @loadedmetadata="onMeta" @timeupdate="onTime" @ended="onEnded" @pause="playing = false" @playing="onPlaying" @waiting="loading = true" @error="onError" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { usePlayerStore } from 'src/stores/player-store';
import { notify } from 'src/utils/helpers';
import { toBars } from 'src/utils/voiceRecorder';
import type { ChatVoice } from 'src/utils/requests/conversations';

/**
 * A voice note in a chat bubble: play/pause, a waveform you can click to
 * seek, and the time. Only one voice note plays at a time.
 */
const props = defineProps<{ voice: ChatVoice; mine?: boolean }>();

const audio = ref<HTMLAudioElement>();
const playing = ref(false);
const loading = ref(false);
const current = ref(0);
const media = ref(0);

// Recordings in some browsers report no duration, so the sent one wins.
const length = computed(() => (props.voice.duration || (Number.isFinite(media.value) ? media.value : 0)));
const progress = computed(() => (length.value ? Math.min(1, current.value / length.value) : 0));
const bars = computed(() => (props.voice.waveform?.length ? props.voice.waveform : toBars([], 40)));

const clock = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const PLAY_EVENT = 'voice-note:play';

const toggle = async () => {
  const el = audio.value;
  if (!el) return;
  if (playing.value) return el.pause();
  try {
    loading.value = true;
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: el }));
    usePlayerStore().pause();
    await el.play();
  } catch {
    loading.value = false;
  }
};

const seekTo = (seconds: number) => {
  const el = audio.value;
  if (!el || !length.value) return;
  el.currentTime = Math.max(0, Math.min(length.value, seconds));
  current.value = el.currentTime;
};

const seek = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  seekTo(((e.clientX - rect.left) / rect.width) * length.value);
};

const nudge = (by: number) => seekTo(current.value + by);

const onMeta = () => (media.value = audio.value?.duration ?? 0);
const onTime = () => (current.value = audio.value?.currentTime ?? 0);
const onPlaying = () => {
  playing.value = true;
  loading.value = false;
};
const onEnded = () => {
  playing.value = false;
  current.value = 0;
};
const onError = () => {
  const trying = loading.value || playing.value;
  loading.value = false;
  playing.value = false;
  if (trying) notify('This voice note couldn\'t be played.', 'error');
};

/** Pause when another voice note starts. */
const onOtherPlay = (e: Event) => {
  if ((e as CustomEvent<HTMLAudioElement>).detail !== audio.value) audio.value?.pause();
};

onMounted(() => window.addEventListener(PLAY_EVENT, onOtherPlay));
onBeforeUnmount(() => {
  window.removeEventListener(PLAY_EVENT, onOtherPlay);
  audio.value?.pause();
});
</script>

<style lang="scss" scoped>
.voice {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 10px;
  width: 260px;
  max-width: 100%;
  padding: 2px 0;

  &__play {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    color: #23272f;
    border-radius: 50%;
    background: #e9ecf1;
  }

  &--mine &__play {
    color: #0b84b3;
    background: #fff;
  }

  &__bars {
    display: flex;
    flex: 1 1 auto;
    flex-wrap: nowrap;
    align-items: center;
    gap: 1px;
    height: 30px;
    min-width: 0;
    overflow: hidden;
    cursor: pointer;
    outline: none;

    &:focus-visible {
      border-radius: 4px;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.4);
    }
  }

  &__bar {
    flex: 1 1 0;
    min-width: 1px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.3);
    transition: background-color 0.1s linear;

    &--played {
      background: #4fc6f0;
    }
  }

  &--mine &__bar {
    background: rgba(255, 255, 255, 0.4);

    &--played {
      background: #fff;
    }
  }

  &__time {
    flex: none;
    min-width: 32px;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: right;
    opacity: 0.85;
  }
}
</style>
