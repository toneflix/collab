<template>
  <div
    ref="bar"
    role="slider"
    tabindex="0"
    aria-label="Seek"
    :aria-valuemin="0"
    :aria-valuemax="Math.round(duration)"
    :aria-valuenow="Math.round(shown)"
    :aria-valuetext="formatSeconds(shown)"
    class="seek-bar"
    :class="{ 'seek-bar--active': dragging, 'seek-bar--disabled': !duration }"
    @pointerdown="start"
    @pointermove="hover"
    @pointerleave="hoverAt = null"
    @keydown.left.prevent="emit('seek', Math.max(0, position - 5))"
    @keydown.right.prevent="emit('seek', Math.min(duration, position + 5))"
  >
    <div class="seek-bar__track">
      <div class="seek-bar__buffered" :style="{ width: pct(buffered ?? 0) }" />
      <div class="seek-bar__played" :style="{ width: pct(shown) }" />
    </div>
    <div class="seek-bar__thumb" :style="{ left: pct(shown) }" />
    <div
      class="seek-bar__tip"
      :style="{ left: pct(hoverAt ?? 0) }"
      v-if="hoverAt !== null && duration"
    >
      {{ formatSeconds(hoverAt) }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { formatSeconds } from 'src/utils/helpers';

/**
 * A thin, full-width progress bar that seeks on click or drag, like the
 * one along the top of YouTube Music's player.
 */
const props = defineProps<{
  position: number;
  duration: number;
  buffered?: number;
}>();

const emit = defineEmits<{ seek: [seconds: number] }>();

const bar = ref<HTMLElement>();
const dragging = ref(false);
const dragAt = ref(0);
const hoverAt = ref<number | null>(null);

const shown = computed(() => (dragging.value ? dragAt.value : props.position));

const pct = (seconds: number) =>
  props.duration ? `${Math.min(100, (seconds / props.duration) * 100)}%` : '0%';

const at = (e: PointerEvent) => {
  const rect = bar.value!.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
  return ratio * props.duration;
};

const hover = (e: PointerEvent) => {
  if (!props.duration) return;
  hoverAt.value = at(e);
  if (dragging.value) dragAt.value = hoverAt.value;
};

const start = (e: PointerEvent) => {
  if (!props.duration) return;
  dragging.value = true;
  dragAt.value = at(e);
  bar.value!.setPointerCapture(e.pointerId);

  const end = (ev: PointerEvent) => {
    dragging.value = false;
    emit('seek', at(ev));
    bar.value?.removeEventListener('pointerup', end);
    bar.value?.removeEventListener('pointercancel', end);
  };

  bar.value!.addEventListener('pointerup', end);
  bar.value!.addEventListener('pointercancel', end);
};
</script>

<style lang="scss" scoped>
.seek-bar {
  position: relative;
  height: 14px;
  margin-top: -7px;
  cursor: pointer;
  touch-action: none;
  outline: none;

  &__track {
    position: absolute;
    left: 0;
    right: 0;
    top: 6px;
    height: 2px;
    background: rgba(255, 255, 255, 0.15);
    transition: height 0.15s, top 0.15s;
  }

  &__buffered,
  &__played {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
  }

  &__buffered {
    background: rgba(255, 255, 255, 0.25);
  }

  &__played {
    background: #03bfff;
  }

  &__thumb {
    position: absolute;
    top: 7px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #03bfff;
    transform: translate(-50%, -50%) scale(0);
    transition: transform 0.15s;
  }

  &__tip {
    position: absolute;
    bottom: 16px;
    transform: translateX(-50%);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    background: rgba(0, 0, 0, 0.85);
    pointer-events: none;
    white-space: nowrap;
  }

  &:hover &__track,
  &:focus-visible &__track,
  &--active &__track {
    top: 5px;
    height: 4px;
  }

  &:hover &__thumb,
  &:focus-visible &__thumb,
  &--active &__thumb {
    transform: translate(-50%, -50%) scale(1);
  }

  &--disabled {
    cursor: default;
  }
}
</style>
