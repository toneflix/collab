<template>
  <q-page padding>
    <div class="relative" v-if="track?.id">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{ backgroundImage: `url(${track.imageUrl})` }"
      ></div>
      <div class="relative flex flex-col items-center w-full sm:flex-row sm:items-stretch">
        <AtroposViewer
          class="flex-none! w-36 h-36 sm:w-48 sm:h-48 md:h-72 md:w-72"
          :main-image="track?.imageUrl"
        >
          <template #button>
            <q-btn
              round
              color="dark-opaque"
              :size="$q.screen.lt.sm ? 'lg' : 'xl'"
              class="flex-none!"
              :icon="playing ? 'lucide-pause:fill' : 'lucide-play:fill'"
              @click="togglePlay"
            />
          </template>
        </AtroposViewer>
        <div class="flex flex-row items-center justify-center flex-1 w-full min-w-0 pt-4 text-center sm:justify-start sm:p-5 sm:text-left">
          <div class="min-w-0">
            <h6 class="text-sm w-fit max-sm:mx-auto">
              <RouterLink
                class="hover:underline"
                :to="{
                  name: 'artist',
                  params: {
                    artist_id: track.artist?.username,
                  },
                }"
              >
                {{ track.artist?.name }}
              </RouterLink>
              <FeaturedArtists :track="track" /><AlbumLink :track="track" />
            </h6>

            <h1 class="text-3xl break-words sm:text-5xl font-circlular-std sm:whitespace-nowrap">
              {{ subString(track?.title || '', 18) }}
            </h1>

            <div
              class="flex flex-row items-center justify-center gap-x-2 gap-y-1 font-semibold sm:justify-start"
            >
              <span class="flex-none!">
                {{ formatSeconds(track.duration) }}
              </span>
              <span class="flex-none! max-sm:hidden!">•</span>
              <!-- Phones: facts on one line, the icon actions on the next -->
              <span class="h-0 basis-full sm:hidden!" aria-hidden="true" />
              <IconBtn plain icon="lucide-play" label="Plays" :count="intStr(track.streams)" />
              <span class="flex-none! max-sm:hidden!">•</span>
              <span class="flex-none!">
                <TInteraction
                  v-slot="{ submit, active }"
                  type="like"
                  label="Like"
                  :active="track.liked"
                  :base-url="`tracks/${track.id}`"
                  :signature="`track:${track.id}`"
                  @done="track.likes = $event.likes"
                >
                  <IconBtn
                    :icon="active ? 'lucide-heart:fill' : 'lucide-heart'"
                    :label="active ? 'Unlike' : 'Like'"
                    :active="active"
                    :count="intStr(track.likes)"
                    @click="submit"
                  />
                </TInteraction>
              </span>
              <span class="flex-none! max-sm:hidden!">•</span>
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
                  <IconBtn
                    icon="lucide-message-square"
                    label="Comments"
                    :count="intStr(track.commentsCount)"
                    @click="toggle"
                  />
                </ConversationDialog>
              </span>
              <span class="flex-none! max-sm:hidden!">•</span>
              <span class="flex-none!">
                <ReportDialog type="track" label="track" :id="track.id" />
              </span>
              <span class="flex-none!">
                <TrackMenuButton :track="track" />
              </span>
            </div>
            <q-banner dense rounded class="mt-4 text-left text-white sm:mt-8 bg-red-10 max-w-96 max-sm:mx-auto" v-if="track.takenDown">
              <template #avatar><q-icon name="lucide-ban" /></template>
              This track was taken down, so only you can see it.
              <router-link class="underline" :to="{ name: 'studio.takedowns' }">See why or appeal</router-link>
            </q-banner>
            <p class="mt-4 text-sm sm:mt-8 max-w-96 max-sm:mx-auto" v-if="track.description?.trim()">
              {{ track.description }}
            </p>
            <TrackPurchases
              class="mt-4 sm:mt-8 max-sm:justify-center"
              :track="track"
              @changed="() => reload()"
            />
          </div>
        </div>
      </div>
    </div>
    <div
      class="grid grid-cols-5 gap-x-3 gap-y-3 pt-6 sm:pt-8"
      v-if="track?.id"
    >
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
    <OopsAlert
      text="We're sorry, we lost track of this track..."
      v-else-if="!loading"
    />
  </q-page>
</template>

<script setup lang="ts">
import { emptyPage, missing } from 'src/utils/requests/prefetch';
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import AlbumLink from 'src/components/Tracks/AlbumLink.vue';
import FeaturedArtists from 'src/components/Tracks/FeaturedArtists.vue';
import { computed, ref } from 'vue';
import {
  Artist,
  Category,
  PageMeta,
  Release,
  Track,
} from 'src/utils/models';
import { useRoute } from 'vue-router';
import { formatSeconds, intStr, subString } from 'src/utils/helpers';
import { useMeta } from 'quasar';
import { usePlayerStore } from 'src/stores/player-store';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import TrendingList from 'src/components/Showcase/TrendingList.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadArtistRequest,
  loadReleasesRequest,
  loadTrackRequest,
  loadTracksRequest,
} from 'src/utils/requests/requests';
import { useRequest } from 'alova/client';
import ConversationDialog from 'src/components/Cards/ConversationDialog.vue';
import TInteraction from 'src/components/Utilities/TInteraction.vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import TrackPurchases from 'src/components/Payments/TrackPurchases.vue';
import ReportDialog from 'src/components/Moderation/ReportDialog.vue';
import TrackMenuButton from 'src/components/Tracks/TrackMenuButton.vue';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.track_id);
    const aid = String(currentRoute.params.artist_id);

    const [artist, track, { data: related, meta: relatedMeta }, { data: releases, meta: releaseMeta }] = await Promise.all([
      loadArtistRequest(aid, {}, true).send().catch(missing),
      loadTrackRequest(id, {
        artist_id: aid,
        with: 'comments_count,artist,release,stems',
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
      track,
      artist,
      related,
      releases,
      relatedMeta,
      releaseMeta,
    };
  },
});

const current = useBootstrapStore().pageData.current as {
  track: Track;
  artist: Artist;
  related: Track[];
  releases: Release[];
  releaseMeta: Partial<PageMeta>;
  relatedeMeta: Partial<PageMeta>;
};

const route = useRoute();
const player = usePlayerStore();
const playing = computed(() => player.isPlaying(track.value));

/**
 * Load the tracks
 */
const {
  data: track,
  loading,
  send: reload,
} = useRequest(
  () =>
    loadTrackRequest(route.params.track_id, {
      artist_id: String(route.params.artist_id),
      with: 'comments_count,artist,release,stems',
    }),
  {
    immediate: false,
    initialData: current.track || {},
  },
);

/**
 * Build the categories
 */
const categories = ref({
  albums: <Category<Release>[]>[
    {
      id: 'albums',
      slug: 'albums',
      title: `Albums by ${track.value.artist?.name}`,
      data: { list: current.releases, meta: current.releaseMeta },
      params: { artist_id: route.params.artist_id },
    },
  ],
  related: <Category<Track>[]>[
    {
      id: 'songs',
      slug: 'songs',
      title: `Other Songs by ${track.value.artist?.name}`,
      data: { list: current.related, meta: current.releaseMeta },
      params: { artist_id: route.params.artist_id },
    },
  ],
});

const togglePlay = () => {
  player.toggleTrack(track.value);
};

useMeta(() => {
  return {
    title: track.value.title,
    titleTemplate: (title) => `${title} - Toneflix Music`,
    meta: {
      description: { name: 'description', content: track.value.description },
      ogImage: { property: 'og:image', content: track.value.imageUrl },
      twitterImage: { name: 'twitter:image', content: track.value.imageUrl },
      ogTitle: { property: 'og:title', content: track.value.title },
      ogDescription: {
        property: 'og:description',
        content: track.value.description,
      },
    },
  };
});
</script>
