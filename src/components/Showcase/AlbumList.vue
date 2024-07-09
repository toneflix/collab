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
import { PropType } from 'vue';

defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  hideAllLink: Boolean,
  verticalList: Boolean,
});

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
