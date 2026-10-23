<template>
  <q-page padding>
    <div class="relative xs:min-h-16 sm:min-h-full" v-if="artist?.id">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{
          backgroundImage: `url(${artist.imageUrl})`,
        }"
      ></div>
      <div class="absolute flex justify-center md:!justify-start w-full">
        <AtroposViewer
          class="!flex-none w-48 h-48 md:h-72 md:w-72"
          :main-image="artist.imageUrl"
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
              <q-icon
                name="verified"
                color="toneflix"
                class="verified-badge"
                v-if="artist.verified"
              />
              {{ artist.verified ? 'Verified Artist' : 'Artist' }}
            </h6>

            <h1 class="text-5xl font-circlular-std whitespace-nowrap">
              {{ subString(artist?.name, 15) }}
            </h1>

            <div
              class="flex flex-row items-center justify-start gap-2 font-semibold"
            >
              <span class="!flex-none">
                <ToggleFollow
                  :following="artist.youFollow"
                  :base-url="`artists/${artist.id}`"
                  @done="
                    (e) => {
                      artist.followers = e.followers;
                      artist.reputation = e.reputation;
                    }
                  "
                  v-slot="{ submit, following }"
                >
                  <q-btn
                    dense
                    no-caps
                    rounded
                    unelevated
                    size="sm"
                    padding="0 sm"
                    :icon="following ? undefined : ionAdd"
                    :label="following ? 'Unfollow' : 'Follow'"
                    :color="following ? 'primary' : undefined"
                    @click="submit"
                  />
                </ToggleFollow>
              </span>
              <span class="!flex-none">
                {{ intStr(artist.followers) }} Followers
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                {{ intStr(artist.reputation) }} Reps.
              </span>
            </div>
            <p class="block mt-4 text-sm max-w-96">
              {{ artist.about }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3 pt-80" v-if="artist?.id">
      <div class="col-span-5" v-if="artist.type === 'user'">
        <ProjectList
          :categories="[
            {
              id: 'projects',
              slug: 'projects',
              title: 'Projects',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <TrackList
          hide-all-link
          v-model:categories="categories.tracks"
          :params="{ limit: 30 }"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          hide-all-link
          v-model:categories="categories.albums"
          :params="{ limit: 30, filters: 'album' }"
        />
      </div>
    </div>
    <OopsAlert
      text="This artist is not home now, you may check back later..."
      v-else-if="!loading"
    />
  </q-page>
</template>

<script setup lang="ts">
import TrackList from 'src/components/Showcase/TrackList.vue';
import ProjectList from 'src/components/Showcase/ProjectList.vue';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import {
  Artist,
  Category,
  CollabEvents,
  PageMeta,
  Release,
  Track,
} from 'src/utils/models';
import { useRoute } from 'vue-router';
import { ionAdd, ionPause, ionPlay } from '@quasar/extras/ionicons-v8';
import { intStr, subString } from 'src/utils/helpers';
import { EventBus, useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadArtistRequest,
  loadReleasesRequest,
  loadTracksRequest,
} from 'src/utils/requests/requests';
import { useWatcher } from 'alova/client';
import { inject, ref } from 'vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import ToggleFollow from 'src/components/Utilities/ToggleFollow.vue';
import { useGlobalStore } from 'src/stores/global-store';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.artist_id);

    const artist = await loadArtistRequest(id, {}, true).send();

    const { data: tracks, meta: tracksMeta } = await loadTracksRequest({
      artist_id: artist.id,
      limit: 30,
    }).send();

    const { data: features, meta: featuresMeta } = await loadTracksRequest({
      artist_id: artist.id,
      filters: 'features',
      limit: 30,
    }).send();

    const { data: releases, meta: rMeta } = await loadReleasesRequest({
      artist_id: artist.id,
      limit: 30,
    }).send();

    boot.pageData.current = {
      artist,
      tracks,
      features,
      releases,
      tracksMeta,
      featuresMeta,
      lastReleaseMeta: rMeta,
    };
  },
});

const route = useRoute();
const system = useGlobalStore();
const playing = ref(false);

const current = useBootstrapStore().pageData.current as unknown as {
  artist: Artist;
  tracks: Track[];
  features: Track[];
  releases: Release[];
  tracksMeta: Partial<PageMeta>;
  featuresMeta: Partial<PageMeta>;
  lastReleaseMeta: Partial<PageMeta>;
};

const categories = ref({
  albums: <Category<Release>[]>[
    {
      id: 'albums',
      slug: 'albums',
      title: 'Albums',
      data: { list: current.releases, meta: current.lastReleaseMeta },
      params: { artist_id: route.params.artist_id },
    },
  ],
  tracks: <Category<Track>[]>[
    {
      id: 'top-songs',
      slug: 'top-songs',
      title: 'Top Songs',
      data: { list: current.tracks, meta: current.tracksMeta },
      params: { artist_id: route.params.artist_id },
    },
    {
      id: 'features',
      slug: 'features',
      title: 'Features',
      data: { list: current.features, meta: current.featuresMeta },
      params: { artist_id: route.params.artist_id, filters: 'features' },
    },
  ],
});

const { data: artist, loading } = useWatcher(
  () => loadArtistRequest(route.params.artist_id as string, {}, true),
  [() => route.params.artist_id],
  {
    middleware: (_, next) => (route.params.artist_id ? next() : undefined),
    immediate: false,
    initialData: current.artist,
  },
);

const bus = inject<EventBus<CollabEvents>>('bus');

const togglePlay = () => {
  if (current.tracks.length) {
    playing.value = !playing.value;
    if (system.playlist.id !== route.fullPath) {
      system.setPlaylistId(route.fullPath);
      system.addToPlaylist(current.tracks);
      system.setCurrentTrack(current.tracks[0]);
      bus?.emit(
        'togglePlay',
        playing.value,
        current.tracks[0],
        undefined,
        'artist',
      );
    } else {
      bus?.emit('justTogglePlay', playing.value, 'artist');
    }
  }
};

useMeta(() => {
  return artist.value
    ? {
        title: artist.value.name,
        titleTemplate: (title) => `${title} - Toneflix Collab`,
        meta: {
          description: {
            name: 'description',
            content: artist.value.name + ' on Toneflix Collab',
          },
          ogImage: { property: 'og:image', content: artist.value.imageUrl },
          ogTitle: { property: 'og:title', content: artist.value.name },
          ogDescription: {
            property: 'og:description',
            content: artist.value.name + ' on Toneflix Collab',
          },
        },
      }
    : { title: 'Not found' };
});
</script>
