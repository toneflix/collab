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
    <ProjectCategory
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
import ProjectCategory from 'src/components/Showcase/ProjectCategory.vue';
import { Category, GenericData, Project } from 'src/utils/models';
import { PropType } from 'vue';

defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  hideAllLink: Boolean,
  verticalList: Boolean,
});

const categories = defineModel('categories', {
  type: Array as PropType<Category<Project>[]>,
  default: () => [
    {
      title: 'Active Projects',
      slug: 'active-projects',
      id: 'active-projects',
      data: { list: [], meta: {} },
    },
  ],
});
</script>
