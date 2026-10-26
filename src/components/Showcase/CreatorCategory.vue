<template>
  <q-scroll-area
    class="h-52 md:h-64 max-w"
    v-if="!verticalList && category.data?.list"
  >
    <div class="flex flex-row max-w-full gap-2 overflow-x-hidden flex-nowrap">
      <CreatorCard
        class="m-1"
        :key="creator.id"
        :artist="artist"
        :creator="creator"
        :is-last="i === category.data.list.length - 1"
        :special-icon="specialIcon"
        @scroll-end="loadMore"
        v-for="(creator, i) in category.data.list"
      />
      <template v-if="loading">
        <div class="creator-skeleton w-32 md:w-44" :key="i" v-for="i in 3">
          <q-skeleton dark type="QAvatar" class="creator-skeleton__avatar" />
          <q-skeleton dark type="text" width="70%" />
        </div>
      </template>
    </div>
  </q-scroll-area>
  <div
    v-else-if="category.data?.list"
    class="grid grid-cols-3 gap-2 md:grid-cols-4 lg:grid-cols-5"
  >
    <CreatorCard
      dense
      class="m-1"
      :key="creator.id"
      :artist="artist"
      :creator="creator"
      :is-last="i === category.data.list.length - 1"
      :special-icon="specialIcon"
      @scroll-end="loadMore"
      v-for="(creator, i) in category.data.list"
    />
    <template v-if="loading">
      <div class="creator-skeleton" :key="i" v-for="i in 5">
        <q-skeleton dark type="QAvatar" class="creator-skeleton__avatar" />
        <q-skeleton dark type="text" width="70%" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { usePagination } from 'alova/client';
import {
  Artist,
  Category,
  GenericData,
  PageMeta,
  User,
} from 'src/utils/models';
import {
  loadArtistsRequest,
  loadUsersRequest,
} from 'src/utils/requests/requests';
import { PropType } from 'vue';
import CreatorCard from '../Cards/CreatorCard.vue';

const props = defineProps({
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
  artist: Boolean,
  immediate: Boolean,
  hideAllLink: Boolean,
  specialIcon: Object as PropType<[string, (p: string | number) => boolean]>,
  verticalList: Boolean,
});

const category = defineModel('category', {
  type: Object as PropType<Category<User | Artist>>,
  default: () => ({
    title: 'Top Creators',
    slug: 'top-creators',
    id: 'top-creators',
    data: { list: [], meta: {} },
  }),
});

const loader = (params: GenericData) =>
  props.artist
    ? loadArtistsRequest(params)
    : (loadUsersRequest(params) as unknown as ReturnType<typeof loadArtistsRequest>);

const {
  page,
  loading,
  onSuccess,
  data: list,
  isLastPage,
} = usePagination(
  (page, limit) =>
    loader({
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

<style lang="scss" scoped>
.creator-skeleton {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin: 4px;
  padding: 12px;

  &__avatar {
    width: 100%;
    max-width: 120px;
    height: auto;
    aspect-ratio: 1;
  }
}
</style>
