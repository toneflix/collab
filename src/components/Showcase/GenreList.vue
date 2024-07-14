<template>
  <div :key="category.id" v-for="(category, i) in categories">
    <q-toolbar class="px-0" v-if="category.data?.list?.length">
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
    <GenreCategory
      :params="params"
      :immediate="immediate"
      :vertical-list="verticalList"
      v-model:category="categories[i]"
      v-if="category.data?.list?.length"
    />
  </div>
</template>

<script setup lang="ts">
import { Category, GenericData, Genre } from 'src/utils/models';
import { PropType } from 'vue';
import GenreCategory from './GenreCategory.vue';

defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  specialIcon: Object as PropType<[string, (p: string | number) => boolean]>,
  hideAllLink: Boolean,
  verticalList: Boolean,
});

const categories = defineModel('categories', {
  type: Array as PropType<Category<Genre>[]>,
  default: () => [
    {
      title: 'Genres',
      slug: 'genres',
      id: 'genres',
      data: { list: [], meta: {} },
    },
  ],
});
</script>
