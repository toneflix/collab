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
    </div>
  </q-page>
</template>

<script setup lang="ts">
import TrackList from 'src/components/Showcase/TrackList.vue';
import ProjectList from 'src/components/Showcase/ProjectList.vue';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import TrendingList from 'src/components/Showcase/TrendingList.vue';
</script>
