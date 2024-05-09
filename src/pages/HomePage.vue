<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <TrackList />
      </div>
      <div class="col-span-5 md:col-span-2">
        <TrendingList
          :categories="[
            {
              id: 'trending',
              slug: 'trending',
              title: 'Trending',
            },
          ]"
        />
      </div>
      <div class="col-span-5 md:col-span-3">
        <CreatorList
          :categories="[
            {
              id: 'top-creators',
              slug: 'top-creators',
              title: 'Top Creators',
            },
            {
              id: 'new-creators',
              slug: 'new-creators',
              title: 'New Creators',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <ProjectList />
      </div>
      <div class="col-span-5">
        <AlbumList
          hide-all-link
          :categories="[
            {
              id: 'top-albums',
              slug: 'top-albums',
              title: 'Top Albums',
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
