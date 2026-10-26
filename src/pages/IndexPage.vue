<template>
  <q-page class="home-page">
    <div class="flex flex-col gap-12 mx-auto max-w-[1400px] md:gap-14">
      <HomeHero :tracks="trending" :signed-in="signedIn" :name="boot.user.name" />

      <section v-if="signedIn && shelves.recent.data?.list.length">
        <HomeShelfHeader title="Jump back in" :to="{ name: 'library.page', params: { type: 'recent' } }" />
        <TrackCategory hide-all-link v-model:category="shelves.recent" />
      </section>

      <section v-if="shelves.trending.data?.list.length">
        <HomeShelfHeader
          title="Trending this week"
          subtitle="What listeners have on repeat right now."
          :to="{ name: 'explore' }"
        />
        <TrackCategory hide-all-link v-model:category="shelves.trending" />
      </section>

      <HomeFeatures />

      <section v-if="shelves.projects.data?.list.length">
        <HomeShelfHeader
          title="Projects open to collaborators"
          subtitle="Listen in on works in progress and ask to join the ones you like."
          :to="{ name: 'projects' }"
        />
        <ProjectCategory hide-all-link v-model:category="shelves.projects" />
      </section>

      <HomeSteps />

      <section v-if="shelves.creators.data?.list.length">
        <HomeShelfHeader
          title="Creators to follow"
          subtitle="Producers, writers and artists making things on Toneflix."
          :to="{ name: 'creators' }"
        />
        <CreatorCategory hide-all-link v-model:category="shelves.creators" />
      </section>

      <section v-if="shelves.albums.data?.list.length">
        <HomeShelfHeader title="New releases" :to="{ name: 'albums' }" />
        <AlbumCategory hide-all-link v-model:category="shelves.albums" />
      </section>

      <section v-if="genres.length">
        <HomeShelfHeader title="Browse by genre" :to="{ name: 'genres' }" />
        <div class="flex flex-wrap gap-2">
          <router-link
            :key="genre.id"
            class="home-genre !flex-none"
            :to="{ name: 'explore', query: { genre: genre.slug } }"
            v-for="genre in genres"
          >
            {{ genre.title }}
          </router-link>
        </div>
      </section>

      <HomeJoin :signed-in="signedIn" />

      <footer class="flex flex-wrap items-center justify-between gap-4 pb-6 text-sm text-gray-500">
        <div class="flex items-center gap-3 !flex-none">
          <img src="~/assets/logo.png" alt="Toneflix" class="h-7 !flex-none" />
          <span class="!flex-none">&copy; {{ year }} Toneflix</span>
        </div>
        <nav class="flex flex-wrap gap-x-5 gap-y-2 !flex-none">
          <router-link :key="link.label" :to="link.to" class="!flex-none hover:text-white" v-for="link in footerLinks">
            {{ link.label }}
          </router-link>
        </nav>
      </footer>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import AlbumCategory from 'src/components/Showcase/AlbumCategory.vue';
import CreatorCategory from 'src/components/Showcase/CreatorCategory.vue';
import HomeFeatures from 'src/components/Home/HomeFeatures.vue';
import HomeHero from 'src/components/Home/HomeHero.vue';
import HomeJoin from 'src/components/Home/HomeJoin.vue';
import HomeShelfHeader from 'src/components/Home/HomeShelfHeader.vue';
import HomeSteps from 'src/components/Home/HomeSteps.vue';
import ProjectCategory from 'src/components/Showcase/ProjectCategory.vue';
import TrackCategory from 'src/components/Showcase/TrackCategory.vue';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { Category, ExploreData, Genre, Project, Release, Track, User } from 'src/utils/models';
import { exploreRequest, loadGenresRequest } from 'src/utils/requests/requests';
import { computed, reactive } from 'vue';

interface HomeData {
  explore: Partial<ExploreData>;
  genres: Genre[];
}

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    const size = 18;

    const [explore, genres] = await Promise.all([
      exploreRequest({
        with: 'artist',
        trending: size,
        top_projects: size,
        top_creators: size,
        latest_albums: size,
        ...(boot.user?.id ? { recently_played: size } : {}),
      }).send(),
      loadGenresRequest({ limit: 16 }).send(),
    ]);

    boot.pageData.current = { explore, genres: genres.data };
  },
});

const boot = useBootstrapStore();
const data = boot.pageData.current as unknown as Partial<HomeData>;
const explore = data.explore ?? {};

const signedIn = computed(() => !!boot.user?.id);
const trending = computed(() => shelves.trending.data?.list ?? []);
const genres = data.genres ?? [];
const year = new Date().getFullYear();

const shelves = reactive({
  recent: <Category<Track>>{
    id: 'recently-played',
    slug: 'recently-played',
    title: 'Jump back in',
    data: explore.recentlyPlayed,
    params: { filters: 'recently_played' },
  },
  trending: <Category<Track>>{
    id: 'trending',
    slug: 'trending',
    title: 'Trending this week',
    data: explore.trending,
    params: { filters: 'trending', period: 'week' },
  },
  projects: <Category<Project>>{
    id: 'open-projects',
    slug: 'open-projects',
    title: 'Projects open to collaborators',
    data: explore.topProjects,
    params: { filters: 'active,top,open', period: 'month' },
  },
  creators: <Category<User>>{
    id: 'top-creators',
    slug: 'top-creators',
    title: 'Creators to follow',
    data: explore.topCreators,
    params: { filters: 'creator,top' },
  },
  albums: <Category<Release>>{
    id: 'latest-albums',
    slug: 'latest-albums',
    title: 'New releases',
    data: explore.latestAlbums,
    params: { filters: 'album,latest' },
  },
});

const footerLinks = [
  { label: 'Explore', to: { name: 'explore' } },
  { label: 'Genres', to: { name: 'genres' } },
  { label: 'Artists', to: { name: 'artists' } },
  { label: 'Projects', to: { name: 'projects' } },
  { label: 'Premium', to: { name: 'premium' } },
];

useMeta(() => ({
  title: 'Make music together',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
  meta: {
    description: {
      name: 'description',
      content: 'Start a project, invite collaborators, build the track in your browser and release it on Toneflix Collab.',
    },
    ogTitle: { property: 'og:title', content: 'Make music together on Toneflix Collab' },
    ogDescription: {
      property: 'og:description',
      content: 'Start a project, invite collaborators, build the track in your browser and release it on Toneflix Collab.',
    },
  },
}));
</script>

<style lang="scss" scoped>
.home-page {
  padding: 24px 32px 120px;

  @media (max-width: 1023px) {
    padding: 16px 16px 120px;
  }
}

.home-genre {
  padding: 8px 18px;
  border-radius: 999px;
  font-size: 14px;
  color: #d5dbe1;
  background: #1b1e28;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  &:hover {
    color: #fff;
    border-color: #03bfff;
    background: rgba(3, 191, 255, 0.12);
  }
}
</style>
