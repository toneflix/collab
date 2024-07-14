<template>
  <q-scroll-area
    class="max-w-full w-[inherit]"
    :class="{
      'h-[540px]': $q.screen.lt.sm,
      'h-[590px]': $q.screen.gt.xs,
    }"
    v-if="!flexible && category.data?.list"
  >
    <div
      class="flex flex-row max-w-full gap-2 overflow-hidden flex-nowrap"
      v-if="category.data?.list?.length"
    >
      <div
        class="flex flex-col xs:min-w-[80vw] sm:min-w-[17rem] gap-2 self-start"
        :key="i"
        v-for="(list, i) in chunkedList"
      >
        <TrendingItem
          class="m-1"
          :key="track.id"
          :ii="ii"
          :track="track"
          :is-last="
            ii === ($q.screen.lt.sm ? 4 : 5) && i === chunkedList.length - 1
          "
          @scroll-end="loadMore"
          v-for="(track, ii) in list"
        />
      </div>
    </div>
  </q-scroll-area>
  <div v-else-if="category.data?.list" :class="flexibleClasses">
    <TrendingItem
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
import TrendingItem from 'src/components/Cards/TrendingItem.vue';
import { chunk } from 'src/utils/helpers';
import { usePagination } from '@alova/scene-vue';
import {
  Category,
  ExploreItem,
  GenericData,
  PageMeta,
  Track,
} from 'src/utils/models';
import { loadTracksRequest } from 'src/utils/requests/requests';
import { computed, PropType } from 'vue';
import { useQuasar } from 'quasar';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  flexible: Boolean,
  immediate: Boolean,
  disablePagination: Boolean,
  flexibleClasses: {
    type: String,
    default: 'grid grid-cols-1 gap-2 md:grid-cols-2',
  },
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

const q = useQuasar();
const chunkedList = computed(() =>
  chunk(
    (category.value.data as ExploreItem<Track>).list,
    q.screen.lt.sm ? 8 : 9,
  ),
);

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
  if (loading.value || isLastPage.value || props.disablePagination)
    return false;
  const cmeta = category.value.data?.meta as PageMeta;

  if (cmeta.last_page > cmeta.current_page) {
    page.value++;
  }
};
</script>
