<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
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
      <div class="col-span-5">
        <CreatorList
          artist
          hide-all-link
          :categories="[
            {
              id: 'top-artists',
              slug: 'top-artists',
              title: 'Top Artists',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          hide-all-link
          :categories="[
            {
              id: 'new-albums',
              slug: 'new-albums',
              title: 'New Albums',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          vertical-list
          hide-all-link
          :categories="[
            {
              id: 'all',
              slug: 'all',
              title: 'All Albums',
            },
          ]"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import CreatorList from 'src/components/Showcase/CreatorList.vue';

useMeta(() => {
  return {
    title: 'Explore Albums',
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore Albums on Toneflix Collab',
      },
      ogTitle: { property: 'og:title', content: 'Explore Albums' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore Albums on Toneflix Collab',
      },
    },
  };
});
</script>
