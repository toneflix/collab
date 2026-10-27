<template>
  <q-scroll-area
    class="h-44 sm:h-52 md:h-[17rem] max-w"
    v-if="!verticalList && category.data?.list"
  >
    <div class="flex flex-row max-w-full gap-2 overflow-auto flex-nowrap">
      <TrackCard
        class="m-1"
        :key="track.id"
        :track="track"
        :is-last="i === category.data.list.length - 1"
        @scroll-end="loadMore"
        v-for="(track, i) in category.data.list"
      />
    </div>
  </q-scroll-area>
  <div
    v-else-if="category.data?.list"
    class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5"
  >
    <TrackCard
      class="m-1"
      :key="track.id"
      :track="track"
      :is-last="i === category.data.list.length - 1"
      @scroll-end="loadMore"
      v-for="(track, i) in category.data.list"
    />
  </div>
</template>

<script setup lang="ts">
import TrackCard from 'src/components/Cards/TrackCard.vue';
import { usePagination } from 'alova/client';
import { Category, GenericData, PageMeta, Track } from 'src/utils/models';
import { loadTracksRequest } from 'src/utils/requests/requests';
import { PropType } from 'vue';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  immediate: Boolean,
  hideAllLink: Boolean,
  verticalList: Boolean,
});

const category = defineModel('category', {
  type: Object as PropType<Category<Track>>,
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
    loadTracksRequest({
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

  if (cmeta.lastPage > cmeta.currentPage) {
    page.value++;
  }
};
</script>
