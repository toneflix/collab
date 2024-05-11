<template>
  <div :key="category.id" v-for="category in categories">
    <q-toolbar class="px-0">
      <h1 class="va-h5">{{ category.title }}</h1>
      <q-space v-if="!hideAllLink" />
      <VaButton
        size="medium"
        color="textPrimary"
        preset="plain"
        v-if="!hideAllLink"
      >
        <h1>See All</h1>
      </VaButton>
    </q-toolbar>
    <q-scroll-area class="h-48 md:h-64 max-w" v-if="!verticalList">
      <div class="flex flex-row max-w-full gap-2 overflow-auto flex-nowrap">
        <TrackCard
          class="m-1"
          :key="track.id"
          :track="track"
          v-for="track in trackList"
        />
      </div>
    </q-scroll-area>
    <div v-else class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
      <TrackCard
        class="m-1"
        :key="track.id"
        :track="track"
        v-for="track in trackList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TrackCard from 'src/components/Cards/TrackCard.vue';
import { Category } from 'src/utils/models';
import { trackList } from 'src/utils/dummy';
import { PropType } from 'vue';

defineProps({
  verticalList: Boolean,
  hideAllLink: Boolean,
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
