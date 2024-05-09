<template>
  <div :key="category.id" v-for="category in categories">
    <q-toolbar class="px-0">
      <h1 class="va-h5">{{ category.title }}</h1>
    </q-toolbar>
    <q-scroll-area class="w-full max-w-full md:max-w-xs lg:max-w-sm h-[580px]">
      <div class="flex flex-row max-w-full gap-2 overflow-auto flex-nowrap">
        <div class="flex flex-col min-w-[80vw] md:min-w-64 gap-2 md:w-64">
          <TrendingItem
            class="m-1"
            :key="track.id"
            :track="track"
            v-for="track in trackList"
          />
        </div>
        <div class="flex flex-col min-w-[80vw] md:min-w-64 gap-2 md:w-64">
          <TrendingItem
            class="m-1"
            :key="track.id"
            :track="track"
            v-for="track in trackList"
          />
        </div>
      </div>
    </q-scroll-area>
  </div>
</template>

<script setup lang="ts">
import TrendingItem from 'src/components/Cards/TrendingItem.vue';
import { Category } from 'src/utils/models';
import { trackList } from 'src/utils/dummy';
import { PropType } from 'vue';

defineProps({
  categories: {
    type: Array as PropType<Category[]>,
    default: () => [
      {
        title: 'Recently Played',
        slug: 'recently-played',
        id: 'recently-played',
      },
    ],
  },
});
</script>
