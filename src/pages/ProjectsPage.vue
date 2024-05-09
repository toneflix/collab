<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <ProjectList
          hide-all-link
          :categories="[
            {
              id: 'top-projects',
              slug: 'top-projects',
              title: 'Top Projects',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <CreatorList
          hide-all-link
          :categories="[
            {
              id: 'top-creators',
              slug: 'top-creators',
              title: 'Top Creators',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <ProjectList
          hide-all-link
          :categories="[
            {
              id: 'new-projects',
              slug: 'new-projects',
              title: 'New Projects',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <ProjectList
          vertical-list
          hide-all-link
          :categories="[
            {
              id: 'all',
              slug: 'all',
              title: 'All Projects',
            },
          ]"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import ProjectList from 'src/components/Showcase/ProjectList.vue';

useMeta(() => {
  return {
    title: 'Explore Projects',
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore Projects on Toneflix Collab',
      },
      ogTitle: { property: 'og:title', content: 'Explore Projects' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore Projects on Toneflix Collab',
      },
    },
  };
});
</script>
