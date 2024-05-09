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
    <q-scroll-area class="h-52 md:h-64 max-w" v-if="!verticalList">
      <div class="flex flex-row max-w-full gap-2 overflow-auto flex-nowrap">
        <CreatorCard
          class="m-1"
          :key="creator.id"
          :creator="creator"
          v-for="creator in creatorList"
        />
      </div>
    </q-scroll-area>
    <div v-else class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
      <CreatorCard
        dense
        class="m-1"
        :key="creator.id"
        :creator="creator"
        v-for="creator in creatorList"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import CreatorCard from 'src/components/Cards/CreatorCard.vue';
import { Category } from 'src/utils/models';
import { artistList as creatorList } from 'src/utils/dummy';
import { PropType } from 'vue';

defineProps({
  artist: Boolean,
  hideAllLink: Boolean,
  verticalList: Boolean,
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
