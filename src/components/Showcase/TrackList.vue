<template>
  <div :key="category.id" v-for="category in categories">
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
import { PropType } from 'vue';

defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  hideAllLink: Boolean,
  verticalList: Boolean,
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
