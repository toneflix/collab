<template>
  <div :key="category.id" v-for="category in categories">
    <q-toolbar class="px-0" v-if="category.data?.list?.length">
      <h1 class="text-2xl font-bold">{{ category.title }}</h1>
    </q-toolbar>
    <TrendingCategory
      :params="params"
      :flexible="flexible"
      :immediate="immediate"
      :flexible-classes="flexibleClasses"
      :disable-pagination="disablePagination"
      v-model:category="
        categories[categories.findIndex((e) => e.id === category.id)]
      "
      v-if="category.data?.list?.length"
    />
  </div>
</template>

<script setup lang="ts">
import TrendingCategory from 'src/components/Showcase/TrendingCategory.vue';
import { Category, GenericData, Track } from 'src/utils/models';
import { PropType } from 'vue';

defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  flexible: Boolean,
  immediate: Boolean,
  disablePagination: Boolean,
  flexibleClasses: {
    type: String,
    default: 'grid grid-cols-1 gap-2 md:grid-cols-2',
  },
});

const categories = defineModel('categories', {
  type: Array as PropType<Category<Track>[]>,
  default: () => [
    {
      title: 'Recently Played',
      slug: 'recently-played',
      id: 'recently-played',
      data: { list: [], meta: {} },
    },
  ],
});
</script>
