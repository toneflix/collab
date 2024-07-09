<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
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
        <CreatorList
          artist
          hide-all-link
          v-model:categories="categories.artists"
        />
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

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    await exploreRequest({
      with: 'artist',
      trending: 30,
      top_albums: 30,
      top_creators: 30,
      new_creators: 30,
      top_projects: 30,
      latest_tracks: 30,
      latest_albums: 30,
      latest_artists: 30,
      active_projects: 30,
      recently_played: 15,
      trending_artists: 30,
    })
      .send()
      .then((data) => {
        boot.pageData.current = data as unknown as GenericData[];
      });
  },
});

const boot = computed(() => useBootstrapStore());

const { data } = useRequest(
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
      active_projects: 30,
      recently_played: 15,
      trending_artists: 30,
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
  latest_tracks: [
    {
      id: 'latest',
      slug: 'latest',
      title: `Latest ${exploreType.value}Songs`,
      data: data.value.latest_tracks,
    },
  ],
  trending: [
    {
      id: 'trending',
      slug: 'trending',
      title: `Trending ${exploreType.value}Songs`,
      data: data.value.trending,
    },
  ],
  artists: [
    {
      id: 'trending-artists',
      slug: 'trending-artists',
      title: `Trending ${exploreType.value}Artists`,
      data: data.value.trending_artists,
    },
  ],
  creators: [
    {
      id: 'top-creators',
      slug: 'top-creators',
      title: `Top ${exploreType.value}Creators`,
      data: data.value.top_creators,
    },
    {
      id: 'new-creators',
      slug: 'new-creators',
      title: `New ${exploreType.value}Creators`,
      data: data.value.new_creators,
    },
  ],
  projects: [
    {
      id: 'new-projects',
      slug: 'new-projects',
      title: `New ${exploreType.value}Projects`,
      data: data.value.new_projects,
    },
    {
      id: 'top-projects',
      slug: 'top-projects',
      title: `Top ${exploreType.value}Projects`,
      data: data.value.top_projects,
    },
  ],
});
</script>
