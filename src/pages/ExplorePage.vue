<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <TrackList
          :categories="[
            {
              id: 'trending',
              slug: 'trending',
              title: `Top ${exploreType}Songs`,
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <TrendingList
          flexible
          :categories="[
            {
              id: 'trending',
              slug: 'trending',
              title: 'Trending',
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
              title: `Top ${exploreType}Creators`,
            },
            {
              id: 'new-creators',
              slug: 'new-creators',
              title: `New ${exploreType}Creators`,
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <ProjectList
          :categories="[
            {
              id: 'new-projects',
              slug: 'new-projects',
              title: `New ${exploreType}Projects`,
            },
            {
              id: 'top-projects',
              slug: 'top-projects',
              title: `Top ${exploreType}Projects`,
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
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();
const exploreType = computed(() =>
  route.query.genre ? route.query.genre + ' ' : '',
);
</script>
