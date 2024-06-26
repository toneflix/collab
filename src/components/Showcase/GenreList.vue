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
        <GenreCard
          class="m-1"
          :key="genre.id"
          :genre="genre"
          v-for="genre in genres"
        />
      </div>
    </q-scroll-area>
    <div
      v-else
      class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
    >
      <GenreCard
        class="m-1"
        :key="genre.id"
        :genre="genre"
        v-for="genre in genres"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import GenreCard from 'src/components/Cards/GenreCard.vue';
import { Category } from 'src/utils/models';
import { genres } from 'src/utils/dummy';
import { PropType } from 'vue';

defineProps({
  verticalList: Boolean,
  hideAllLink: Boolean,
  categories: {
    type: Array as PropType<Category[]>,
    default: () => [
      {
        title: 'Genres',
        slug: 'genres',
        id: 'genres',
      },
    ],
  },
});
</script>
