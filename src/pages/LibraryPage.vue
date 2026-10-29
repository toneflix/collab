<template>
  <q-page padding>
    <ChipNav label="Library" :links="libraryLinks" />
    <div class="flex flex-col justify-center min-h-[60vh]" v-if="empty && !loading">
      <OopsAlert />
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3" v-else-if="!loading">
      <div class="col-span-5">
        <TrendingList
          flexible
          disable-pagination
          :categories="categories[type].trend"
        />
      </div>
      <div class="col-span-5">
        <CreatorList
          artist
          hide-all-link
          :categories="categories[type].artists"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          immediate
          hide-all-link
          :categories="categories[type].albums"
        />
      </div>
    </div>
    <div class="flex flex-col gap-6" v-else>
      <ListSkeleton avatar="square" side :rows="6" />
      <ListSkeleton :rows="3" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import ChipNav from 'src/components/Controllers/ChipNav.vue';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import TrendingList from 'src/components/Showcase/TrendingList.vue';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { exploreRequest } from 'src/utils/requests/requests';
import type { Artist, Category, Release, Track, User } from 'src/utils/models';
import { useWatcher } from 'alova/client';
import { categoryChecker, libraryChipLinks } from 'src/utils/navigations';

type RouteType = 'recent' | 'liked' | 'saved' | 'collabs';

type LibraryCategories = {
  trend: Category<Track>[];
  artists: Category<User | Artist>[];
  albums: Category<Release>[];
};

defineOptions({
  async preFetch({ store, currentRoute: route }) {
    const boot = useBootstrapStore(store);

    const type: RouteType = route.params.type as unknown as RouteType;
    const types = {
      recent: {
        with: 'artist',
        recently_played: 18,
        recently_played_artists: 30,
        recently_played_albums: 30,
      },
      liked: {
        with: 'artist',
        liked_tracks: 18,
        liked_albums: 30,
      },
      saved: {
        with: 'artist',
        saved_tracks: 30,
      },
      collabs: {
        with: 'artist',
        own_collab_albums: 30,
      },
    };

    const data = await exploreRequest(types[type] || types.recent).send();
    boot.pageData.current = data;
  },
});

const boot = computed(() => useBootstrapStore());
const route = useRoute();
const type = computed(() => route.params.type as unknown as RouteType);
const empty = computed(() => categoryChecker(categories.value[type.value]));

const libraryLinks = computed(() => libraryChipLinks(type.value));

const types = {
  recent: {
    with: 'artist',
    recently_played: 18,
    recently_played_artists: 30,
    recently_played_albums: 30,
  },
  liked: {
    with: 'artist',
    liked_tracks: 18,
    liked_albums: 30,
  },
  saved: {
    with: 'artist',
    saved_tracks: 30,
  },
  collabs: {
    with: 'artist',
    own_collab_albums: 30,
  },
};

const { data, loading } = useWatcher(
  () => exploreRequest(types[type.value] || types.recent),
  [type],
  {
    immediate: false,
    initialData: boot.value.pageData.current,
  },
);

const categories = computed<Record<RouteType, LibraryCategories>>(() => ({
  recent: {
    trend: [
      {
        id: 'recently-played',
        slug: 'recently_played',
        title: 'Recently Played Songs',
        data: data.value.recentlyPlayed,
        params: { filters: 'recently_played' },
      },
    ],
    artists: [
      {
        id: 'recently-played-artists',
        slug: 'recently_played_artists',
        title: 'Artists you recently listened to',
        data: data.value.recentlyPlayedArtists,
        params: { filters: 'recently_played' },
      },
    ],
    albums: [
      {
        id: 'recently-played-albums',
        slug: 'recently_played_albums',
        title: 'Albums you recently listened to',
        data: data.value.recentlyPlayedAlbums,
        params: { filters: 'recently_played' },
      },
    ],
  },
  liked: {
    trend: [
      {
        id: 'liked-tracks',
        slug: 'liked_tracks',
        title: 'Songs you love',
        data: data.value.likedTracks,
        params: { filters: 'liked' },
      },
    ],
    artists: [],
    albums: [
      {
        id: 'liked-albums',
        slug: 'liked_albums',
        title: 'Albums you love',
        data: data.value.likedAlbums,
        params: { filters: 'liked' },
      },
    ],
  },
  saved: {
    trend: [
      {
        id: 'saved-tracks',
        slug: 'saved_tracks',
        title: 'Saved songs',
        data: data.value.savedTracks,
        params: { filters: 'saved' },
      },
    ],
    artists: [],
    albums: [],
  },
  collabs: {
    trend: [],
    artists: [],
    albums: [
      {
        id: 'own-collabs',
        slug: 'own_collab_albums',
        title: 'Your Collaborations',
        data: data.value.ownCollabAlbums,
        params: { filters: 'collabs' },
      },
    ],
  },
}));
</script>
