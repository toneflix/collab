<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <TrackList
          :categories="[
            {
              id: 'latest',
              slug: 'latest',
              title: 'Latest Songs',
              data: data.latest_tracks,
              params: { filters: 'latest' },
            },
          ]"
        />
      </div>
      <div class="col-span-5 md:col-span-2">
        <TrendingList
          :categories="[
            {
              id: 'trending',
              slug: 'trending',
              title: 'Trending',
              data: data.trending,
              params: { filters: 'trending' },
            },
          ]"
        />
      </div>
      <div class="col-span-5 md:col-span-3">
        <CreatorList
          :categories="[
            {
              id: 'top-artists',
              slug: 'top-artists',
              title: 'Top Artists',
              data: data.trending_artists,
              params: { filters: 'trending' },
            },
            {
              id: 'new-artists',
              slug: 'new-artists',
              title: 'New Artists',
              data: data.latest_artists,
              params: { filters: 'latest' },
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <TrackList
          :categories="[
            {
              title: 'Recently Played',
              slug: 'recently-played',
              id: 'recently-played',
              data: data.recently_played,
              params: { filters: 'recently_played' },
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <ProjectList
          :categories="[
            {
              title: 'Active Projects',
              slug: 'active-projects',
              id: 'active-projects',
              data: data.active_projects,
              params: { filters: 'active' },
            },
            {
              title: 'Top Projects',
              slug: 'top-projects',
              id: 'top-projects',
              data: data.top_projects,
              params: { filters: 'active,top' },
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <CreatorList
          :categories="[
            {
              id: 'top-creators',
              slug: 'top-creators',
              title: 'Top Creators',
              data: data.top_creators,
              params: { filters: 'creator,top' },
            },
            {
              id: 'new-creators',
              slug: 'new-creators',
              title: 'New Creators',
              data: data.new_creators,
              params: { filters: 'creator,latest' },
            },
          ]"
        />
      </div>

      <div class="col-span-5">
        <AlbumList
          hide-all-link
          :params="{ filters: 'album' }"
          :categories="[
            {
              id: 'top-albums',
              slug: 'top-albums',
              title: 'Top Albums',
              data: data.top_albums,
              params: { filters: 'album,top' },
            },
            {
              id: 'latest-albums',
              slug: 'latest-albums',
              title: 'Latest Albums',
              data: data.latest_albums,
              params: { filters: 'album,latest' },
            },
          ]"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import TrackList from 'src/components/Showcase/TrackList.vue';
import ProjectList from 'src/components/Showcase/ProjectList.vue';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import TrendingList from 'src/components/Showcase/TrendingList.vue';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { exploreRequest } from 'src/utils/requests/requests';
import { computed } from 'vue';
import { useRequest } from 'alova';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    await exploreRequest({
      with: 'artist',
      trending: 18,
      top_albums: 18,
      top_creators: 18,
      new_creators: 18,
      top_projects: 18,
      latest_tracks: 18,
      latest_albums: 18,
      latest_artists: 18,
      active_projects: 18,
      recently_played: 15,
      trending_artists: 18,
    })
      .send()
      .then((data) => {
        boot.pageData.current = data;
      });
  },
});

const boot = computed(() => useBootstrapStore());

const { data } = useRequest(
  () =>
    exploreRequest({
      with: 'artist',
      trending: 18,
      top_albums: 18,
      top_creators: 18,
      new_creators: 18,
      top_projects: 18,
      latest_tracks: 18,
      latest_albums: 18,
      latest_artists: 18,
      active_projects: 18,
      recently_played: 15,
      trending_artists: 18,
    }),
  {
    immediate: false,
    initialData: boot.value.pageData.current,
  },
);

useMeta(() => {
  return {
    title: 'Explore',
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore and Create Music on Toneflix Collab',
      },
      ogTitle: { property: 'og:title', content: 'Explore and Create Music' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore and Create Music on Toneflix Collab',
      },
    },
  };
});
</script>
