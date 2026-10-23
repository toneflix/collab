<template>
  <q-scroll-area
    class="h-48 md:h-64 max-w"
    v-if="!verticalList && category.data?.list"
  >
    <div class="flex flex-row max-w-full gap-2 overflow-auto flex-nowrap">
      <GenreCard
        class="m-1"
        :key="genre.id"
        :genre="genre"
        :is-last="i === category.data.list.length - 1"
        @scroll-end="loadMore"
        v-for="(genre, i) in category.data.list"
      />
    </div>
  </q-scroll-area>
  <div
    v-else-if="category.data?.list"
    class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7"
  >
    <GenreCard
      class="m-1"
      :key="genre.id"
      :genre="genre"
      :is-last="i === category.data.list.length - 1"
      @scroll-end="loadMore"
      v-for="(genre, i) in category.data.list"
    />
  </div>
</template>

<script setup lang="ts">
import GenreCard from 'src/components/Cards/GenreCard.vue';
import { usePagination } from 'alova/client';
import { Category, GenericData, Genre, PageMeta } from 'src/utils/models';
import { loadGenresRequest } from 'src/utils/requests/requests';
import { PropType } from 'vue';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  verticalList: Boolean,
});

const category = defineModel('category', {
  type: Object as PropType<Category<Genre>>,
  default: () => ({
    title: 'Recently Played',
    slug: 'recently-played',
    id: 'recently-played',
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
    loadGenresRequest({
      page,
      limit,
      ...props.params,
      ...category.value.params,
    }),
  {
    total: (data) => data.meta?.total || 0,
    append: true,
    immediate: props.immediate,
    initialData: { data: [] },
    initialPageSize: 30,
  },
);

onSuccess(({ data }) => {
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
