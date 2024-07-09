<template>
  <q-page padding>
    <div class="relative">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{ backgroundImage: `url(${album?.imageUrl})` }"
      ></div>
      <div class="absolute flex justify-center md:!justify-start w-full">
        <AtroposViewer
          class="!flex-none w-48 h-48 md:h-72 md:w-72"
          :main-image="album.imageUrl"
        >
          <template #button>
            <q-btn
              round
              color="dark-opaque"
              size="xl"
              class="!flex-none opacity-90"
              :icon="ionPlay"
            />
          </template>
        </AtroposViewer>
        <div class="flex flex-row items-center justify-start flex-1 p-5">
          <div>
            <h6 class="text-sm">
              {{ album.artist?.name }}
            </h6>

            <h1 class="text-5xl font-circlular-std whitespace-nowrap">
              {{ album?.title }}
            </h1>

            <div
              class="flex flex-row items-center justify-start gap-2 font-semibold"
            >
              <span class="!flex-none">
                {{ intStr(album.tracksCount) }} Tracks
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                {{ formatSeconds(album.duration) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none flex items-center gap-1">
                <q-icon fill color="white" name="fas fa-play" />
                {{ intStr(album.streams) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <VaButton
                  size="medium"
                  preset="plain"
                  color="textPrimary"
                  hover-opacity="0.05"
                  @click="album.loved = !album.loved"
                >
                  <q-icon
                    color="white"
                    :name="album.loved ? ionHeart : ionHeartOutline"
                    :fill="album.loved"
                  />
                  <span
                    :class="`text-sm font-${album.loved ? 'bold' : 'medium'}`"
                  >
                    &nbsp;{{ intStr(album.loves) }}
                  </span>
                </VaButton>
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <VaButton
                  size="medium"
                  preset="plain"
                  color="textPrimary"
                  hover-opacity="0.05"
                >
                  <q-icon fill color="white" name="eva-message-square" />
                  {{ intStr(album.streams) }}
                  <!-- TODO: Replace album.streams with album.comments_count-->
                </VaButton>
              </span>
            </div>
            <p class="mt-4 text-sm max-w-96">
              {{ album.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3 pt-96 md:pt-80">
      <div class="col-span-5">
        <div class="grid grid-cols-1 gap-2 md:grid-cols-3">
          <TrendingItem
            class="m-1"
            :key="track.id"
            :track="track"
            v-for="track in album.tracks"
          />
        </div>
      </div>
      <div class="col-span-5">
        <AlbumList
          hide-all-link
          v-model:categories="categories.albums"
          :params="{ limit: 30, filters: 'album' }"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import TrendingItem from 'src/components/Cards/TrendingItem.vue';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import {
  Category,
  GenericData,
  PageMeta,
  Release,
  Track,
} from 'src/utils/models';
import { useRoute } from 'vue-router';
import { ionHeart, ionHeartOutline, ionPlay } from '@quasar/extras/ionicons-v7';
import { formatSeconds, intStr } from 'src/utils/helpers';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadReleaseRequest,
  loadReleasesRequest,
  loadTracksRequest,
} from 'src/utils/requests';
import { useWatcher } from 'alova';
import { ref } from 'vue';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.album_id);
    const aid = String(currentRoute.params.artist_id);

    const album = await loadReleaseRequest(id, {
      artist_id: aid,
      with: 'tracks,artist',
    }).send();

    const { data: related, meta: relatedMeta } = await loadTracksRequest({
      artist_id: aid,
      limit: 8,
    }).send();

    const { data: releases, meta: releaseMeta } = await loadReleasesRequest({
      artist_id: aid,
      limit: 30,
      with: 'artist',
    }).send();

    boot.pageData.current = {
      album,
      related,
      releases,
      relatedMeta,
      releaseMeta,
    } as unknown as GenericData[];
  },
});

const route = useRoute();

const current = useBootstrapStore().pageData.current as unknown as {
  album: Release;
  related: Track[];
  releases: Release[];
  releaseMeta: Partial<PageMeta>;
  relatedeMeta: Partial<PageMeta>;
};

/**
 * Load the album
 */
const { data: album } = useWatcher(
  () =>
    loadReleaseRequest(route.params.album_id, {
      with: 'tracks,artist',
      artist_id: route.params.artist_id as string,
    }),
  [() => route.params.album_id],
  {
    sendable: () => !!route.params.album_id,
    immediate: false,
    initialData: current.album || {},
  },
);

/**
 * Initialize the categories
 */
const categories = ref({
  albums: <Category[]>[
    {
      id: 'albums',
      slug: 'albums',
      title: `Other Albums by ${album.value.artist?.name}`,
      data: { list: current.releases, meta: current.releaseMeta },
      params: { artist_id: route.params.artist_id },
    },
  ],
});

useMeta(() => {
  return {
    title: album.value.title,
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: { name: 'description', content: album.value.description },
      ogImage: { property: 'og:image', content: album.value.imageUrl },
      ogTitle: { property: 'og:title', content: album.value.title },
      ogDescription: {
        property: 'og:description',
        content: album.value.description,
      },
    },
  };
});
</script>
