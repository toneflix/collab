<template>
  <q-card class="bg-gray-800" flat square>
    <slot name="image" :track="track" :togglePlay="togglePlay">
      <q-img :src="track.imageUrl" v-if="!miniMode" />
    </slot>

    <q-card-section class="px-0">
      <q-btn
        round
        color="primary"
        class="absolute top-0"
        :class="{
          'right-3 -translate-y-[50%]': !miniMode,
          'right-1 -translate-y-[50%]': miniMode,
        }"
        :icon="playing ? 'lucide-pause' : 'lucide-play'"
        @click="togglePlay()"
      />
      <q-list dense>
        <q-item>
          <q-item-section avatar>
            <RouterLink
              :to="{
                name: 'artist.track',
                params: {
                  artist_id: track.artist?.username || '-',
                  track_id: track.slug || '-',
                },
              }"
            >
              <q-avatar rounded>
                <q-img
                  no-spinner
                  class="bg-gray-400"
                  loading="eager"
                  :src="miniMode ? track.imageUrl : track.artist?.imageUrl"
                  :ratio="1 / 1"
                />
              </q-avatar>
            </RouterLink>
          </q-item-section>

          <q-item-section>
            <q-item-label lines="1">
              <RouterLink
                :to="{
                  name: 'artist.track',
                  params: {
                    artist_id: track.artist?.username || '-',
                    track_id: track.slug || '-',
                  },
                }"
              >
                {{ track.title }}
              </RouterLink>
            </q-item-label>
            <q-item-label caption lines="1">
              <RouterLink
                :to="{
                  name: 'artist',
                  params: {
                    artist_id:
                      track.artist?.username || track.artist?.id || '-',
                  },
                }"
              >
                {{ track.artist?.name || 'Unknown' }}
              </RouterLink>
            </q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { Track } from 'src/utils/models';
import { onBeforeUnmount, ref, watch } from 'vue';
import { usePlayerStore } from 'src/stores/player-store';
import { notify } from 'src/utils/helpers';

defineProps({
  miniMode: Boolean,
});

const track = defineModel<Track>('track', {
  required: true,
});

/**
 * A preview of one track, e.g. while editing a release. It uses its own
 * <audio> element and takes turns with the main player, so only one plays.
 */
const player = usePlayerStore();
const playing = ref(false);
let audio: HTMLAudioElement | null = null;

const element = () => {
  if (!audio) {
    audio = new Audio();
    audio.loop = true;
    audio.addEventListener('playing', () => (playing.value = true));
    audio.addEventListener('pause', () => (playing.value = false));
    audio.addEventListener('error', () => {
      playing.value = false;
      if (audio?.getAttribute('src')) notify('This track couldn\'t be played.', 'error');
    });
  }
  return audio;
};

const togglePlay = async () => {
  if (!track.value.streamUrl) {
    notify('This track has no audio yet.', 'info');
    return;
  }

  const el = element();
  if (playing.value) {
    el.pause();
    return;
  }

  if (el.getAttribute('src') !== track.value.streamUrl) {
    el.src = track.value.streamUrl;
  }
  el.volume = player.muted ? 0 : player.volume / 100;
  player.pause();

  try {
    await el.play();
  } catch {
    playing.value = false;
  }
};

// The main player starting stops the preview.
watch(
  () => player.playing,
  (on) => on && audio?.pause(),
);

// A new file replaces the preview.
watch(
  () => track.value?.streamUrl,
  () => {
    audio?.pause();
    audio?.removeAttribute('src');
  },
);

onBeforeUnmount(() => {
  audio?.pause();
  audio?.removeAttribute('src');
  audio = null;
});
</script>
