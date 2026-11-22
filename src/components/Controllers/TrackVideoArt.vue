<template>
  <div class="track-art" :style="frameStyle" v-if="video && show">
    <div class="track-art__visual" aria-hidden="true">
      <img :src="video.posterUrl || imageUrl" alt="" class="track-art__poster" />
      <background-video
        ref="element"
        noautoplay
        noloop
        class="track-art__media"
        :src="video.videoUrl"
      />
    </div>
  </div>
  <div class="track-art" :style="canvasStyle" v-else-if="canvas && show">
    <CanvasLoop class="track-art__visual" :canvas="canvas" :playing="playing" />
  </div>
  <q-img
    no-spinner
    class="rounded-lg shadow-2xl bg-gray-800"
    :ratio="1"
    :src="imageUrl"
    v-else
  />
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, toRef, watch } from 'vue';
import { loadTrackVideoRequest, type TrackVideo } from 'src/utils/requests/videos';
import type { TrackCanvas } from 'src/utils/requests/canvas';
import { useTrackCanvas } from 'src/composables/useTrackCanvas';
import CanvasLoop from 'src/components/Tracks/CanvasLoop.vue';

/**
 * A track's artwork, or its music video when it has one, else its canvas. The
 * video is muted, has no controls of its own and follows the song: it plays,
 * pauses and seeks with the audio player. The canvas loops while the song plays.
 */
const props = withDefaults(defineProps<{
  trackId?: number | string | null;
  imageUrl?: string;
  /** The song's position in seconds */
  position: number;
  playing: boolean;
  /** Show the video when there is one; otherwise the artwork shows */
  show?: boolean;
}>(), { show: true });

const emit = defineEmits<{
  video: [video: TrackVideo | null];
  canvas: [canvas: TrackCanvas | null];
}>();

/** How far the video may drift from the song before it's moved back, in seconds */
const DRIFT = 0.35;

const video = ref<TrackVideo | null>(null);
const canvas = useTrackCanvas(toRef(props, 'trackId'));
const element = ref<(HTMLElement & { target?: HTMLVideoElement | null }) | null>(null);
let media: HTMLVideoElement | null = null;
let ticket = 0;

const frameStyle = computed(() => {
  const [w, h] = (video.value?.ratio ?? '1:1').split(':').map(Number);
  const ratio = (w || 1) / (h || 1);
  return { aspectRatio: `${w} / ${h}`, width: `min(100%, calc(62vh * ${ratio}))` };
});

const canvasStyle = { aspectRatio: '9 / 16', width: 'min(100%, calc(62vh * 9 / 16))' };

/** Moves the video to the song's position and matches play or pause */
const sync = () => {
  if (!media || media.readyState < 1) return;
  if (Math.abs(media.currentTime - props.position) > DRIFT) media.currentTime = props.position;
  if (props.playing && media.paused) void media.play().catch(() => undefined);
  if (!props.playing && !media.paused) media.pause();
};

const attach = async () => {
  media?.pause();
  media = null;
  if (!video.value || !props.show) return;
  await import('@videojs/html/media/background-video');
  await customElements.whenDefined('background-video');
  await nextTick();
  media = element.value?.target ?? null;
  if (!media) return;
  media.muted = true;
  media.addEventListener('loadedmetadata', sync);
  sync();
};

const load = async (id?: number | string | null) => {
  const mine = ++ticket;
  video.value = null;
  emit('video', null);
  if (!id) return;
  try {
    const found = await loadTrackVideoRequest(id).send();
    if (mine !== ticket) return;
    video.value = found;
    emit('video', found);
    await attach();
  } catch {
    // Without a video the artwork shows
  }
};

watch(() => props.trackId, (id) => void load(id));
watch(() => props.show, () => void attach());
watch(canvas, (found) => emit('canvas', found));
watch(() => [props.position, props.playing], sync);

onMounted(() => void load(props.trackId));
onBeforeUnmount(() => {
  ticket++;
  media?.pause();
  media = null;
});
</script>

<style lang="scss" scoped>
.track-art {
  position: relative;
  margin-inline: auto;
  overflow: hidden;
  border-radius: 0.5rem;
  background: #000;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 25%);
}

.track-art__visual,
.track-art__poster,
.track-art__media {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.track-art__poster {
  object-fit: cover;
}

.track-art__media {
  display: block;
  --media-object-fit: cover;
}
</style>
