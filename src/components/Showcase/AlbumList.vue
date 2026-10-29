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
    <AlbumCategory
      :params="params"
      :immediate="immediate"
      :hide-all-link="hideAllLink"
      :vertical-list="verticalList"
      v-model:category="categories[i]"
      v-if="category.data?.list?.length"
    />
  </div>
</template>

<script setup lang="ts">
import AlbumCategory from 'src/components/Showcase/AlbumCategory.vue';
import { Category, GenericData, Release } from 'src/utils/models';
import { PropType, computed } from 'vue';
import { RouteLocationRaw } from 'vue-router';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  hideAllLink: Boolean,
  to: { type: [String, Object] as PropType<RouteLocationRaw>, default: undefined },
  verticalList: Boolean,
});

/** Page behind "See All": the given route, else the full list page. */
const allLink = computed<RouteLocationRaw | undefined>(() => props.to ?? { name: 'albums' });

const categories = defineModel('categories', {
  type: Array as PropType<Category<Release>[]>,
  default: () => [
    {
      title: 'Top Albums',
      slug: 'top-albums',
      id: 'top-albums',
      data: { list: [], meta: {} },
    },
  ],
});
</script>
