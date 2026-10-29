<template>
  <q-page padding>
    <ChipNav label="Library" :links="libraryLinks" />
    <SimpleInfo class="mt-8" :icon="emptyState.icon" :text="emptyState.text" v-if="empty && !loading" />
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
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
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
import { categoryChecker } from 'src/utils/navigations';

type RouteType = 'recent' | 'liked' | 'collabs';

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
const emptyState = computed(
  () =>
    ({
      recent: { icon: 'lucide-music', text: 'Nothing played yet. Songs, artists and albums you play show up here.' },
      liked: { icon: 'lucide-heart', text: 'Nothing liked yet. Songs and albums you like show up here.' },
      collabs: { icon: 'lucide-users', text: 'No collab albums yet. Albums from projects you work on show up here.' },
    })[type.value] ?? { icon: 'lucide-inbox', text: 'Nothing here yet.' },
);

const libraryLinks = computed(() => [
  ...(['liked', 'recent', 'collabs'] as const).map((key) => ({
    label: { liked: 'Liked', recent: 'Recent', collabs: 'Collabs' }[key],
    icon: { liked: 'lucide-heart', recent: 'lucide-music', collabs: 'lucide-users' }[key],
    to: { name: 'library.page', params: { type: key } },
    active: type.value === key,
  })),
  { label: 'Purchases', icon: 'lucide-receipt', to: { name: 'library.purchases' } },
]);

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
