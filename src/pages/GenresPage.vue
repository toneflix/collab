<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <GenreList
          vertical-list
          hide-all-link
          :categories="[
            {
              id: 'genres',
              slug: 'genres',
              title: 'Genres',
            },
          ]"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import GenreList from 'src/components/Showcase/GenreList.vue';
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
