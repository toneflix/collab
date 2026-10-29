<template>
  <div :key="category.id" v-for="category in categories">
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

    <TrackCategory
      :params="params"
      :immediate="immediate"
      :hide-all-link="hideAllLink"
      :vertical-list="verticalList"
      v-model:category="
        categories[categories.findIndex((e) => e.id === category.id)]
      "
      v-if="category.data?.list?.length"
    />
  </div>
</template>

<script setup lang="ts">
import TrackCategory from 'src/components/Showcase/TrackCategory.vue';
import { Category, GenericData, Track } from 'src/utils/models';
import { PropType, computed } from 'vue';
import { RouteLocationRaw } from 'vue-router';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  hideAllLink: Boolean,
  to: { type: [String, Object] as PropType<RouteLocationRaw>, default: undefined },
  verticalList: Boolean,
});

/** Page behind "See All": the given route, else the tracks page. */
const allLink = computed<RouteLocationRaw>(() => props.to ?? { name: 'tracks' });

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
