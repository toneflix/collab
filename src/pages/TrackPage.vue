<template>
  <q-page padding>
    <div class="relative">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{ backgroundImage: `url(${track?.imageUrl})` }"
      ></div>
      <div class="absolute flex justify-center md:!justify-start w-full">
        <AtroposViewer
          class="!flex-none w-48 h-48 md:h-72 md:w-72"
          :main-image="track?.imageUrl"
        >
          <template #button>
            <q-btn
              round
              color="dark-opaque"
              size="xl"
              class="!flex-none"
              :icon="playing ? ionPause : ionPlay"
              @click="togglePlay"
            />
          </template>
        </AtroposViewer>
        <div class="flex flex-row items-center justify-start flex-1 p-5">
          <div>
            <RouterLink
              class="!flex-none"
              :to="{
                name: 'artist',
                params: {
                  artist_id: track.artist?.username,
                },
              }"
            >
              <h6 class="text-sm w-fit">
                {{ track.artist?.name }}
              </h6>
            </RouterLink>

            <h1 class="text-5xl font-circlular-std whitespace-nowrap">
              {{ track?.title }}
            </h1>

            <div
              class="flex flex-row items-center justify-start gap-2 font-semibold"
            >
              <span class="!flex-none">
                {{ formatSeconds(track.duration) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none flex items-center gap-1">
                <q-icon color="white" name="fas fa-play" :fill="track.loved" />
                {{ intStr(track.streams) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <VaButton
                  size="medium"
                  preset="plain"
                  color="textPrimary"
                  hover-opacity="0.05"
                  @click="track.loved = !track.loved"
                >
                  <q-icon
                    color="white"
                    :name="track.loved ? ionHeart : ionHeartOutline"
                    :fill="track.loved"
                  />
                  <span
                    :class="`text-sm font-${track.loved ? 'bold' : 'medium'}`"
                  >
                    &nbsp;{{ intStr(track.loves) }}
                  </span>
                </VaButton>
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <VaButton
                  fill
                  size="medium"
                  preset="plain"
                  color="textPrimary"
                  hover-opacity="0.05"
                >
                  <q-icon color="white" name="eva-message-square" />
                  &nbsp;{{ intStr(track.streams) }}
                  <!-- TODO: Replace track.streams with track.comments_count-->
                </VaButton>
              </span>
            </div>
            <p class="mt-4 text-sm max-w-96">
              {{ track.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3 pt-96 md:pt-80">
      <div class="col-span-5">
        <TrendingList
          flexible
          :categories="[
            {
              id: 'songs',
              slug: 'songs',
              title: `Other Songs by ${track.artist?.name}`,
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          hide-all-link
          :categories="[
            {
              id: 'albums',
              slug: 'albums',
              title: `Albums by ${track.artist?.name}`,
            },
          ]"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import { ref, watch, inject } from 'vue';
import { CollabEvents, SeekingData, Track } from 'src/utils/models';
import { useRoute } from 'vue-router';
import { trackList } from 'src/utils/dummy';
import {
  ionHeart,
  ionHeartOutline,
  ionPause,
  ionPlay,
} from '@quasar/extras/ionicons-v7';
import { formatSeconds, intStr } from 'src/utils/helpers';
import { EventBus, useMeta } from 'quasar';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import TrendingList from 'src/components/Showcase/TrendingList.vue';

const route = useRoute();
const track = ref<Track>({} as unknown & Track);
const playing = ref(false);
const seeking = ref<SeekingData>({} as unknown & SeekingData);

const bus = inject<EventBus<CollabEvents>>('bus');

const togglePlay = () => {
  playing.value = !playing.value;
  bus?.emit('togglePlay', playing.value, track.value, undefined, 'track');
};

bus?.on('seeking', (position, trk, url) => {
  if (trk?.id === track.value.id) {
    seeking.value = { position, track: trk, url };
    playing.value = position > 0;
  } else {
    seeking.value = {} as unknown & SeekingData;
    playing.value = false;
  }
});

bus?.on('togglePlay', (status, trk, album, origin) => {
  if (origin !== 'track' && trk.id === track.value.id) {
    playing.value = status;
  }
});

watch(
  () => route.params,
  (params) => {
    track.value =
      trackList.value.find(
        (e) => e.id === params.track_id || e.slug === params.track_id,
      ) || ({} as unknown as Track);

    playing.value = false;
  },
  { immediate: true },
);

useMeta(() => {
  return {
    title: track.value.title,
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: { name: 'description', content: track.value.description },
      ogImage: { property: 'og:image', content: track.value.imageUrl },
      ogTitle: { property: 'og:title', content: track.value.title },
      ogDescription: {
        property: 'og:description',
        content: track.value.description,
      },
    },
  };
});
</script>
