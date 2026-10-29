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
import { PropType, computed } from 'vue';
import { RouteLocationRaw } from 'vue-router';
import CreatorCategory from './CreatorCategory.vue';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  artist: Boolean,
  immediate: Boolean,
  specialIcon: Object as PropType<[string, (p: string | number) => boolean]>,
  hideAllLink: Boolean,
  to: { type: [String, Object] as PropType<RouteLocationRaw>, default: undefined },
  verticalList: Boolean,
});

/** Page behind "See All": the given route, else the artists or creators page. */
const allLink = computed<RouteLocationRaw | undefined>(() => props.to ?? { name: props.artist ? 'artists' : 'creators' });

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
