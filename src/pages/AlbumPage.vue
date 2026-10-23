<template>
  <q-page padding>
    <div class="relative" v-if="album?.id">
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
              :icon="playing ? ionPause : ionPlay"
              @click="togglePlay"
            />
          </template>
        </AtroposViewer>
        <div class="flex flex-row items-center justify-start flex-1 p-5">
          <div>
            <h6 class="text-sm">
              {{ album.artist?.name }}
            </h6>

            <h1 class="text-5xl font-circlular-std whitespace-nowrap">
              {{ subString(album?.title, 18) }}
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
                <TInteraction
                  v-slot="{ submit, active }"
                  type="like"
                  label="Likes"
                  :active="album.liked"
                  :base-url="`releases/${album.id}`"
                  @done="album.likes = $event.likes"
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
                      &nbsp;{{ intStr(album.likes) }}
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
                  type="Album"
                  :id="album.id"
                  :params="{ limit: 30, baseUrl: 'releases' }"
                  @commented="
                    (e, t) => {
                      t == 'comment' &&
                        typeof album.commentsCount !== 'undefined' &&
                        album.commentsCount++;
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
                    &nbsp;{{ intStr(album.commentsCount) }}
                  </VaButton>
                </ConversationDialog>
              </span>
            </div>
            <p class="mt-4 text-sm max-w-96">
              {{ album.description }}
            </p>
            <div class="flex items-center gap-3 mt-4" v-if="album.price">
              <template v-if="album.locked">
                <PayButton
                  rounded
                  unelevated
                  color="toneflix"
                  icon="fas fa-lock-open"
                  :label="`Buy for ${price(album.price)}`"
                  :amount="album.price"
                  :body="{ purpose: 'release', id: album.id }"
                  @paid="() => reload()"
                />
                <span class="text-xs !flex-none">
                  Buy this release to listen in full.
                </span>
              </template>
              <q-chip
                dense
                class="!flex-none"
                icon="fas fa-check"
                color="green-9"
                text-color="white"
                v-else-if="album.purchased"
              >
                You own this release
              </q-chip>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div
      class="grid grid-cols-5 gap-x-3 gap-y-3 pt-96 md:pt-80"
      v-if="album?.id"
    >
      <div class="col-span-5">
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          <TrendingItem
            dense
            class="m-1"
            :key="track.id"
            :track="track"
            :queue="album.tracks"
            :source="route.fullPath"
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
    <OopsAlert text="This album does not exist..." v-else-if="!loading" />
  </q-page>
</template>

<script setup lang="ts">
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import TrendingItem from 'src/components/Cards/TrendingItem.vue';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import {
  Category,
  PageMeta,
  Release,
  Track,
} from 'src/utils/models';
import { useRoute } from 'vue-router';
import {
  ionHeart,
  ionHeartOutline,
  ionPause,
  ionPlay,
} from '@quasar/extras/ionicons-v8';
import { formatSeconds, intStr, notify, subString } from 'src/utils/helpers';
import PayButton from 'src/components/Payments/PayButton.vue';
import { usePayments } from 'src/composables/usePayments';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadReleaseRequest,
  loadReleasesRequest,
  loadTracksRequest,
} from 'src/utils/requests/requests';
import { useWatcher } from 'alova/client';
import { computed, ref } from 'vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import ConversationDialog from 'src/components/Cards/ConversationDialog.vue';
import TInteraction from 'src/components/Utilities/TInteraction.vue';
import { usePlayerStore } from 'src/stores/player-store';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.album_id);
    const aid = String(currentRoute.params.artist_id);

    const album = await loadReleaseRequest(id, {
      artist_id: aid,
      with: 'tracks,artist,comments_count',
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
    };
  },
});

const route = useRoute();
const { price } = usePayments();
const player = usePlayerStore();
const playing = computed(() => player.isPlayingSource(route.fullPath));

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
const {
  data: album,
  loading,
  send: reload,
} = useWatcher(
  () =>
    loadReleaseRequest(route.params.album_id, {
      with: 'tracks,artist,comments_count',
      artist_id: route.params.artist_id as string,
    }),
  [() => route.params.album_id],
  {
    middleware: (_, next) => (route.params.album_id ? next() : undefined),
    immediate: false,
    initialData: current.album || {},
  },
);

/**
 * Initialize the categories
 */
const categories = ref({
  albums: <Category<Release>[]>[
    {
      id: 'albums',
      slug: 'albums',
      title: `Other Albums by ${album.value.artist?.name}`,
      data: { list: current.releases, meta: current.releaseMeta },
      params: { artist_id: route.params.artist_id },
    },
  ],
});

const togglePlay = () => {
  if (album.value.locked) {
    notify('Buy this release to listen to it.', 'info');
    return;
  }

  if (album.value.tracks?.length) {
    player.toggleQueue(album.value.tracks, route.fullPath);
  }
};

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
