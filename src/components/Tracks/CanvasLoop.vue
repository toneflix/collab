<template>
  <div class="canvas-loop" aria-hidden="true">
    <img :src="canvas.posterUrl" alt="" class="canvas-loop__media" v-if="canvas.posterUrl" />
    <video
      ref="media"
      muted
      loop
      playsinline
      disablepictureinpicture
      preload="auto"
      class="canvas-loop__media"
      :src="canvas.videoUrl ?? undefined"
      @loadeddata="sync"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import type { TrackCanvas } from 'src/utils/requests/canvas';

/**
 * A track's canvas: its silent clip on a loop, covering its box. It plays
 * while `playing` is on and holds its frame otherwise.
 */
const props = withDefaults(defineProps<{ canvas: TrackCanvas; playing?: boolean }>(), {
  playing: true,
});

const media = ref<HTMLVideoElement>();

const sync = () => {
  const video = media.value;
  if (!video) return;
  video.muted = true;
  if (props.playing && video.paused) void video.play().catch(() => undefined);
  if (!props.playing && !video.paused) video.pause();
};

watch(() => [props.playing, props.canvas.videoUrl], sync);
onMounted(sync);
</script>

<style lang="scss" scoped>
.canvas-loop {
  position: relative;
  overflow: hidden;
  background: #000;
  pointer-events: none;
}

.canvas-loop__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
