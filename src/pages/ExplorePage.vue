<template>
  <q-page
    padding
    :class="{ 'flex flex-col justify-center': empty && !loading }"
  >
    <OopsAlert v-if="empty" />
    <div class="grid grid-cols-5 gap-x-3 gap-y-3" v-else>
      <div class="col-span-5">
        <TrackList v-model:categories="categories.latest_tracks" />
      </div>
      <div class="col-span-5">
        <TrendingList
          flexible
          disable-pagination
          v-model:categories="categories.trending"
        />
      </div>
      <div class="col-span-5">
        <CreatorList artist v-model:categories="categories.artists" />
      </div>
      <div class="col-span-5">
        <AlbumList immediate v-model:categories="categories.albums" />
      </div>
      <div class="col-span-5">
        <CreatorList :categories="categories.creators" />
      </div>
      <div class="col-span-5">
        <ProjectList :categories="categories.projects" />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import TrackList from 'src/components/Showcase/TrackList.vue';
import ProjectList from 'src/components/Showcase/ProjectList.vue';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import TrendingList from 'src/components/Showcase/TrendingList.vue';
import { computed, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { exploreRequest } from 'src/utils/requests';
import { GenericData } from 'src/utils/models';
import { useRequest } from 'alova';
import AlbumList from 'src/components/Showcase/AlbumList.vue';

defineOptions({
  async preFetch({ store, currentRoute: route }) {
    const boot = useBootstrapStore(store);
    await exploreRequest({
      with: 'artist',
      trending: 18,
      top_albums: 30,
      top_creators: 30,
      new_creators: 30,
      top_projects: 30,
      latest_tracks: 30,
      latest_albums: 30,
      latest_artists: 30,
      trending_artists: 30,
      ...route.query,
    })
      .send()
      .then((data) => {
        boot.pageData.current = data as unknown as GenericData[];
      });
  },
});

const boot = computed(() => useBootstrapStore());
const empty = computed(() =>
  Object.entries(data.value)
    .map((e) => e[1].list)
    .every((e) => e.length === 0),
);

const { data, loading } = useRequest(
  () =>
    exploreRequest({
      with: 'artist',
      trending: 18,
      top_albums: 30,
      top_creators: 30,
      new_creators: 30,
      top_projects: 30,
      latest_tracks: 30,
      latest_albums: 30,
      latest_artists: 30,
      trending_artists: 30,
      ...route.query,
    }),
  {
    immediate: false,
    initialData: boot.value.pageData.current,
  },
);

const route = useRoute();
const exploreType = computed(() =>
  route.query.genre ? route.query.genre + ' ' : '',
);

const categories = reactive({
  albums: [
    {
      id: 'latest-albums',
      slug: 'latest-albums',
      title: `Latest ${exploreType.value}Albums`.titleCase(),
      data: data.value.latest_albums,
      params: { filters: 'album,latest', ...route.query },
    },
    {
      id: 'trending-albums',
      slug: 'trending-albums',
      title: `Trending ${exploreType.value}Albums`.titleCase(),
      data: data.value.top_albums,
      params: { filters: 'album,top', ...route.query },
    },
  ],
  latest_tracks: [
    {
      id: 'latest',
      slug: 'latest',
      title: `Latest ${exploreType.value}Songs`.titleCase(),
      data: data.value.latest_tracks,
      params: { filters: 'latest', ...route.query },
    },
  ],
  trending: [
    {
      id: 'trending',
      slug: 'trending',
      title: `Trending ${exploreType.value}Songs`.titleCase(),
      data: data.value.trending,
      params: { filters: 'trending', ...route.query },
    },
  ],
  artists: [
    {
      id: 'trending-artists',
      slug: 'trending-artists',
      title: `Trending ${exploreType.value}Artists`.titleCase(),
      data: data.value.trending_artists,
      params: { filters: 'trending', ...route.query },
    },
  ],
  creators: [
    {
      id: 'top-creators',
      slug: 'top-creators',
      title: `Top ${exploreType.value}Creators`.titleCase(),
      data: data.value.top_creators,
      params: { filters: 'creator,top', ...route.query },
    },
    {
      id: 'new-creators',
      slug: 'new-creators',
      title: `New ${exploreType.value}Creators`.titleCase(),
      data: data.value.new_creators,
      params: { filters: 'creator,latest', ...route.query },
    },
  ],
  projects: [
    {
      id: 'new-projects',
      slug: 'new-projects',
      title: `New ${exploreType.value}Projects`.titleCase(),
      data: data.value.new_projects,
      params: { filters: 'active,latest', ...route.query },
    },
    {
      id: 'top-projects',
      slug: 'top-projects',
      title: `Top ${exploreType.value}Projects`.titleCase(),
      data: data.value.top_projects,
      params: { filters: 'active,top', ...route.query },
    },
  ],
});
</script>
