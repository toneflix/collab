<template>
  <div :key="category.id" v-for="category in categories">
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
    <q-scroll-area class="h-52 md:h-64 max-w" v-if="!verticalList">
      <div class="flex flex-row max-w-full gap-2 overflow-auto flex-nowrap">
        <ProjectCard
          class="m-1"
          :key="project.id"
          :project="project"
          v-for="project in dummyProjects"
        />
      </div>
    </q-scroll-area>
    <div v-else class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5">
      <ProjectCard
        dense
        class="m-1"
        :key="project.id"
        :project="project"
        v-for="project in dummyProjects"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import ProjectCard from 'src/components/Cards/ProjectCard.vue';
import { Category } from 'src/utils/models';
import { dummyProjects } from 'src/utils/dummy';
import { PropType } from 'vue';

defineProps({
  hideAllLink: Boolean,
  verticalList: Boolean,
  categories: {
    type: Array as PropType<Category[]>,
    default: () => [
      {
        title: 'Active Projects',
        slug: 'active-projects',
        id: 'active-projects',
      },
    ],
  },
});
</script>
