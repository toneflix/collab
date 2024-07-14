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
              {{ subString(track?.title || '', 18) }}
            </h1>

            <div
              class="flex flex-row items-center justify-start gap-2 font-semibold"
            >
              <span class="!flex-none">
                {{ formatSeconds(track.duration) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none flex items-center gap-1">
                <q-icon color="white" name="fas fa-play" :fill="track.liked" />
                {{ intStr(track.streams) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <TInteraction
                  v-slot="{ submit, active }"
                  type="like"
                  label="Like"
                  :active="track.liked"
                  :base-url="`tracks/${track.id}`"
                  @done="track.likes = $event.likes"
                >
                  <VaButton
                    size="medium"
                    preset="plain"
                    color="textPrimary"
                    hover-opacity="0.05"
                    @click="submit"
                  >
                    <q-icon
                      color="white"
                      :name="active ? ionHeart : ionHeartOutline"
                      :fill="active"
                    />
                    <span :class="`text-sm font-${active ? 'bold' : 'medium'}`">
                      &nbsp;{{ intStr(track.likes) }}
                    </span>
                  </VaButton>
                </TInteraction>
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <ConversationDialog
                  dense
                  no-caps
                  rounded
                  size="sm"
                  icon="fas fa-comments"
                  color="white"
                  padding="xs sm"
                  text-color="dark"
                  type="Track"
                  :id="track.id"
                  :params="{ limit: 30, baseUrl: 'tracks' }"
                  @commented="
                    (e, t) => {
                      t == 'comment' &&
                        typeof track.commentsCount !== 'undefined' &&
                        track.commentsCount++;
                    }
                  "
                  v-slot="{ toggle }"
                >
                  <VaButton
                    fill
                    size="medium"
                    preset="plain"
                    color="textPrimary"
                    hover-opacity="0.05"
                    @click="toggle"
                  >
                    <q-icon color="white" name="eva-message-square" />
                    &nbsp;{{ intStr(track.commentsCount) }}
                  </VaButton>
                </ConversationDialog>
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
          disable-pagination
          v-model:categories="categories.related"
          :params="{ limit: 8 }"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          hide-all-link
          v-model:categories="categories.albums"
          :params="{ limit: 30 }"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import { ref, watch, inject } from 'vue';
import {
  Artist,
  Category,
  CollabEvents,
  GenericData,
  PageMeta,
  Release,
  SeekingData,
  Track,
} from 'src/utils/models';
import { useRoute } from 'vue-router';
import {
  ionHeart,
  ionHeartOutline,
  ionPause,
  ionPlay,
} from '@quasar/extras/ionicons-v7';
import { formatSeconds, intStr, subString } from 'src/utils/helpers';
import { EventBus, useMeta } from 'quasar';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import TrendingList from 'src/components/Showcase/TrendingList.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadArtistRequest,
  loadReleasesRequest,
  loadTrackRequest,
  loadTracksRequest,
} from 'src/utils/requests/requests';
import { useWatcher } from 'alova';
import ConversationDialog from 'src/components/Cards/ConversationDialog.vue';
import TInteraction from 'src/components/Utilities/TInteraction.vue';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.track_id);
    const aid = String(currentRoute.params.artist_id);

    const artist = await loadArtistRequest(aid, {}, true).send();

    const track = await loadTrackRequest(id, {
      artist_id: artist.id,
      with: 'comments_count,artist',
    }).send();

    const { data: related, meta: relatedMeta } = await loadTracksRequest({
      artist_id: artist.id,
      limit: 8,
    }).send();

    const { data: releases, meta: releaseMeta } = await loadReleasesRequest({
      artist_id: artist.id,
      limit: 30,
      with: 'artist',
    }).send();

    boot.pageData.current = {
      track,
      artist,
      related,
      releases,
      relatedMeta,
      releaseMeta,
    } as unknown as GenericData[];
  },
});

const current = useBootstrapStore().pageData.current as unknown as {
  track: Track;
  artist: Artist;
  related: Track[];
  releases: Release[];
  releaseMeta: Partial<PageMeta>;
  relatedeMeta: Partial<PageMeta>;
};

const bus = inject<EventBus<CollabEvents>>('bus');
const route = useRoute();
const playing = ref(false);
const seeking = ref<SeekingData>({} as unknown & SeekingData);

/**
 * Load the tracks
 */
const { data: track, onSuccess } = useWatcher(
  () =>
    loadTrackRequest(route.params.track_id, {
      artist_id: String(route.params.artist_id),
      with: 'comments_count,artist',
    }),
  [() => route.params.artist_id],
  {
    immediate: false,
    sendable: () => !!route.params.artist_id,
    initialData: current.track || {},
  },
);

onSuccess(() => {
  playing.value = false;
});

/**
 * Build the categories
 */
const categories = ref({
  albums: <Category[]>[
    {
      id: 'albums',
      slug: 'albums',
      title: `Albums by ${track.value.artist?.name}`,
      data: { list: current.releases, meta: current.releaseMeta },
      params: { artist_id: route.params.artist_id },
    },
  ],
  related: <Category[]>[
    {
      id: 'songs',
      slug: 'songs',
      title: `Other Songs by ${track.value.artist?.name}`,
      data: { list: current.related, meta: current.releaseMeta },
      params: { artist_id: route.params.artist_id },
    },
  ],
});

/**
 * Toggle play mode
 */
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
  () => {
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
