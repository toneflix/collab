<template>
  <div
    :key="category.id"
    v-for="category in categories.filter((e) => !!e.data?.list?.length)"
  >
    <q-toolbar class="px-0">
      <h1 class="va-h5">{{ category.title }}</h1>
    </q-toolbar>
    <q-scroll-area
      class="w-full max-w-full md:max-w-xs lg:max-w-sm h-[580px]"
      v-if="!flexible"
    >
      <div
        class="flex flex-row max-w-full gap-2 overflow-auto flex-nowrap"
        v-if="category.data?.list?.length"
      >
        <div
          class="flex flex-col min-w-[80vw] md:min-w-64 gap-2 md:w-64"
          :key="i"
          v-for="(list, i) in chunk(category.data.list, 9)"
        >
          <TrendingItem
            class="m-1"
            :key="track.id"
            :track="track"
            v-for="track in list"
          />
        </div>
      </div>
    </q-scroll-area>
    <div v-else :class="flexibleClasses">
      <TrendingItem
        class="m-1"
        :key="track.id"
        :track="track"
        v-for="track in category.data?.list"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import TrendingItem from 'src/components/Cards/TrendingItem.vue';
import { chunk } from 'src/utils/helpers';
import { Category, Track } from 'src/utils/models';
import { PropType } from 'vue';

defineProps({
  flexible: Boolean,
  flexibleClasses: {
    type: String,
    default: 'grid grid-cols-1 gap-2 md:grid-cols-2',
  },
});

const categories = defineModel('categories', {
  type: Array as PropType<Category<Track>[]>,
  default: () => [
    {
      title: 'Recently Played',
      slug: 'recently-played',
      id: 'recently-played',
      data: { list: [], lastPage: 1 },
    },
  ],
});
</script>
