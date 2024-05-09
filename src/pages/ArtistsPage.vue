<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <CreatorList
          hide-all-link
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
        <CreatorList
          hide-all-link
          vertical-list
          :categories="[
            {
              id: 'all',
              slug: 'all',
              title: 'All Creators',
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

useMeta(() => {
  return {
    title: 'Explore Artists',
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore Artists on Toneflix Collab',
      },
      ogTitle: { property: 'og:title', content: 'Explore Artists' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore Artists on Toneflix Collab',
      },
    },
  };
});
</script>
