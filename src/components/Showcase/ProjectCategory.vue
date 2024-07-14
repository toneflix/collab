<template>
  <q-scroll-area
    class="h-52 md:h-[17rem] max-w"
    v-if="!verticalList && category.data?.list"
  >
    <div class="flex flex-row max-w-full gap-2 overflow-auto flex-nowrap">
      <ProjectCard
        class="m-1"
        :key="project.id"
        :project="project"
        :is-last="i === category.data.list.length - 1"
        @scroll-end="loadMore"
        v-for="(project, i) in category.data.list"
      />
    </div>
  </q-scroll-area>
  <div
    v-else-if="category.data?.list"
    class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5"
  >
    <ProjectCard
      dense
      class="m-1"
      :key="project.id"
      :project="project"
      :is-last="i === category.data.list.length - 1"
      @scroll-end="loadMore"
      v-for="(project, i) in category.data.list"
    />
  </div>
</template>

<script setup lang="ts">
import ProjectCard from '../Cards/ProjectCard.vue';
import { usePagination } from '@alova/scene-vue';
import { Category, GenericData, PageMeta, Project } from 'src/utils/models';
import { loadProjectsRequest } from 'src/utils/requests/requests';
import { PropType, ref } from 'vue';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  hideAllLink: Boolean,
  verticalList: Boolean,
});

const category = defineModel('category', {
  type: Object as PropType<Category<Project>>,
  default: () => ({
    title: 'Top Projects',
    slug: 'top-projects',
    id: 'top-projects',
    data: { list: [], meta: {} },
  }),
});

const {
  page,
  loading,
  onSuccess,
  data: list,
  isLastPage,
} = usePagination(
  (page, limit) =>
    loadProjectsRequest(
      {
        page,
        limit,
        ...props.params,
        ...category.value.params,
      },
      true,
    ),
  {
    total: (data) => data.meta?.total || 0,
    append: true,
    immediate: props.immediate,
    initialData: { data: [] },
    initialPageSize: 30,
  },
);

const firstLoad = ref(false);
onSuccess(({ data }) => {
  firstLoad.value = true;
  if (category.value.data) {
    category.value.data = {
      list: list.value,
      meta: data.meta as PageMeta,
    };
  }
});

const loadMore = () => {
  if (loading.value || isLastPage.value) return false;
  const cmeta = category.value.data?.meta as PageMeta;

  if (cmeta.last_page > cmeta.current_page) {
    page.value++;
  }
};
</script>
