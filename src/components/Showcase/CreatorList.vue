<template>
  <div :key="category.id" v-for="(category, i) in categories">
    <q-toolbar class="px-0" v-if="category.data?.list?.length">
      <h1 class="text-2xl font-bold">{{ category.title }}</h1>
      <q-space v-if="!hideAllLink" />
      <q-btn
        flat
        no-caps
        v-if="!hideAllLink"
      >
        <h1>See All</h1>
      </q-btn>
    </q-toolbar>
    <CreatorCategory
      :params="params"
      :artist="artist"
      :immediate="immediate"
      :special-icon="specialIcon"
      :hide-all-link="hideAllLink"
      :vertical-list="verticalList"
      v-model:category="categories[i]"
      v-if="category.data?.list?.length"
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
