<template>
  <q-page padding>
    <div class="relative" v-if="album?.id">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{ backgroundImage: `url(${album?.imageUrl})` }"
      ></div>
      <div class="relative flex flex-col items-center w-full sm:flex-row sm:items-stretch">
        <AtroposViewer
          class="flex-none! w-36 h-36 sm:w-48 sm:h-48 md:h-72 md:w-72"
          :main-image="album.imageUrl"
        >
          <template #button>
            <q-btn
              round
              color="dark-opaque"
              :size="$q.screen.lt.sm ? 'lg' : 'xl'"
              class="flex-none! opacity-90"
              :icon="playing ? 'lucide-pause:fill' : 'lucide-play:fill'"
              @click="togglePlay"
            />
          </template>
        </AtroposViewer>
        <div class="flex flex-row items-center justify-center flex-1 w-full min-w-0 pt-4 text-center sm:justify-start sm:p-5 sm:text-left">
          <div class="min-w-0">
            <h6 class="text-sm">
              {{ album.artist?.name }}
            </h6>

            <h1 class="text-3xl break-words sm:text-5xl font-circlular-std sm:whitespace-nowrap">
              {{ subString(album?.title, 18) }}
            </h1>

            <div
              class="flex flex-row items-center justify-center gap-2 font-semibold sm:justify-start"
            >
              <span class="flex-none!">
                {{ countStr(album.tracksCount, 'Track') }}
              </span>
              <span class="flex-none!">•</span>
              <span class="flex-none!">
                {{ formatSeconds(album.duration) }}
              </span>
              <span class="flex-none!">•</span>
              <IconBtn plain icon="lucide-play" label="Plays" :count="intStr(album.streams)" />
              <span class="flex-none!">•</span>
              <span class="flex-none!">
                <TInteraction
                  v-slot="{ submit, active }"
                  type="like"
                  label="Likes"
                  :active="album.liked"
                  :base-url="`releases/${album.id}`"
                  @done="album.likes = $event.likes"
                >
                  <IconBtn
                    :icon="active ? 'lucide-heart:fill' : 'lucide-heart'"
                    :label="active ? 'Unlike' : 'Like'"
                    :active="active"
                    :count="intStr(album.likes)"
                    @click="submit"
                  />
                </TInteraction>
              </span>
              <span class="flex-none!">•</span>
              <span class="flex-none!">
                <ConversationDialog
                  dense
                  no-caps
                  rounded
                  size="sm"
                  icon="lucide-messages-square"
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
                  <IconBtn
                    icon="lucide-message-square"
                    label="Comments"
                    :count="intStr(album.commentsCount)"
                    @click="toggle"
                  />
                </ConversationDialog>
              </span>
              <span class="flex-none!">•</span>
              <span class="flex-none!">
                <ReportDialog type="release" label="release" :id="album.id" />
              </span>
            </div>
            <q-banner dense rounded class="mt-4 text-left text-white sm:mt-8 bg-red-10 max-w-96 max-sm:mx-auto" v-if="album.takenDown">
              <template #avatar><q-icon name="lucide-ban" /></template>
              This release was taken down, so only you can see it.
              <router-link class="underline" :to="{ name: 'studio.takedowns' }">See why or appeal</router-link>
            </q-banner>
            <p class="mt-4 text-sm sm:mt-8 max-w-96 max-sm:mx-auto">
              {{ album.description }}
            </p>
            <div class="flex items-center justify-center gap-3 mt-4 sm:mt-8 sm:justify-start" v-if="album.price">
              <template v-if="album.locked">
                <PayButton
                  rounded
                  unelevated
                  color="toneflix"
                  icon="lucide-lock-open"
                  :label="`Buy for ${price(album.price)}`"
                  :amount="album.price"
                  :body="{ purpose: 'release', id: album.id }"
                  @paid="() => reload()"
                />
                <span class="text-xs flex-none!">
                  Buy this release to listen in full.
                </span>
              </template>
              <q-chip
                dense
                class="flex-none!"
                icon="lucide-check"
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
      class="grid grid-cols-5 gap-x-3 gap-y-3 pt-6 sm:pt-8"
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
import { emptyPage, missing } from 'src/utils/requests/prefetch';
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
import { countStr, formatSeconds, intStr, notify, subString } from 'src/utils/helpers';
import PayButton from 'src/components/Payments/PayButton.vue';
import ReportDialog from 'src/components/Moderation/ReportDialog.vue';
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

    const [album, { data: related, meta: relatedMeta }, { data: releases, meta: releaseMeta }] = await Promise.all([
      loadReleaseRequest(id, {
        artist_id: aid,
        with: 'tracks,artist,comments_count',
      }).send().catch(missing),
      loadTracksRequest({
        artist_id: aid,
        limit: 8,
      }).send().catch(emptyPage),
      loadReleasesRequest({
        artist_id: aid,
        limit: 30,
        with: 'artist',
      }).send().catch(emptyPage),
    ]);

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
    titleTemplate: (title) => `${title} - Toneflix Music`,
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
