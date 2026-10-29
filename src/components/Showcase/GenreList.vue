<template>
  <div :key="category.id" v-for="(category, i) in categories">
    <q-toolbar class="px-0" v-if="category.data?.list?.length">
      <h1 class="text-2xl font-bold">{{ category.title }}</h1>
      <q-space v-if="!hideAllLink && allLink" />
      <q-btn
        flat
        no-caps
        :to="allLink"
        v-if="!hideAllLink && allLink"
      >
        <span class="text-sm font-semibold">See All</span>
      </q-btn>
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
import { PropType, computed } from 'vue';
import { RouteLocationRaw } from 'vue-router';
import GenreCategory from './GenreCategory.vue';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  specialIcon: Object as PropType<[string, (p: string | number) => boolean]>,
  hideAllLink: Boolean,
  to: { type: [String, Object] as PropType<RouteLocationRaw>, default: undefined },
  verticalList: Boolean,
});

/** Page behind "See All": the given route, else the full list page. */
const allLink = computed<RouteLocationRaw | undefined>(() => props.to ?? { name: 'genres' });

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
