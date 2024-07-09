<template>
  <div :key="category.id" v-for="(category, i) in categories">
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
    <CreatorCategory
      :params="params"
      :immediate="immediate"
      :special-icon="specialIcon"
      :hide-all-link="hideAllLink"
      :vertical-list="verticalList"
      v-model:category="categories[i]"
    />
  </div>
</template>

<script setup lang="ts">
import { Artist, Category, GenericData, User } from 'src/utils/models';
import { PropType } from 'vue';
import CreatorCategory from './CreatorCategory.vue';

defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  artist: Boolean,
  immediate: Boolean,
  specialIcon: Object as PropType<[string, (p: string | number) => boolean]>,
  hideAllLink: Boolean,
  verticalList: Boolean,
});

const categories = defineModel('categories', {
  type: Array as PropType<Category<User | Artist>[]>,
  default: () => [
    {
      title: 'Top Creators',
      slug: 'top-creators',
      id: 'top-creators',
      data: { list: [], meta: {} },
    },
  ],
});
</script>
