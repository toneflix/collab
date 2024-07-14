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
        :icon="playing ? ionPauseOutline : ionPlayOutline"
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
import { ionPlayOutline, ionPauseOutline } from '@quasar/extras/ionicons-v7';
import { Howl, Howler } from 'howler';
import { useGlobalStore } from 'src/stores/global-store';
import { ref, computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

defineProps({
  miniMode: Boolean,
});

const track = defineModel<Track>('track', {
  required: true,
});

let sound: Howl;
const boot = useBootstrapStore();
const system = useGlobalStore();
const volume = computed(() => system.volume);
const playing = ref(false);
const progress = ref();
const position = ref(0);

const togglePlay = () => {
  if (sound.playing()) {
    sound.pause();
  } else {
    Howler.volume(volume.value / 100);
    sound.play();
  }

  playing.value = sound.playing();
};

const initialize = () => {
  if (sound) {
    sound.unload();
  }

  const fileUrl = track.value.streamUrl;

  sound = new Howl({
    src: [fileUrl],
    html5: true,
    format: 'mp3',
    xhr: {
      headers: {
        Authorization: 'Bearer ' + boot.token,
      },
      withCredentials: true,
    },
    loop: true,
    volume: volume.value / 100,
    onplay: () => {
      playing.value = true;
    },
  });

  // Stop the interval watcher
  ['stop', 'pause', 'end'].forEach((event) => {
    sound.on(event, () => {
      playing.value = false;
      position.value = sound.seek();
      progress.value = (sound.seek() / sound.duration()) * 100;
    });
  });
};

onMounted(() => {
  initialize();
});

onBeforeUnmount(() => {
  sound?.unload();
});

watch(
  () => track.value?.streamUrl,
  () => {
    initialize();
  },
);
</script>
