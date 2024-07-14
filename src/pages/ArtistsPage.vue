<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <CreatorList artist hide-all-link v-model:categories="categories.top" />
      </div>
      <div class="col-span-5">
        <CreatorList
          artist
          hide-all-link
          vertical-list
          v-model:categories="categories.next"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRequest } from 'alova';
import { useMeta } from 'quasar';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { GenericData } from 'src/utils/models';
import { exploreRequest } from 'src/utils/requests/requests';
import { computed, reactive } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    await exploreRequest({
      with: '',
      latest_artists: 30,
      random_artists: 30,
      trending_artists: 30,
      recommended_artists: 30,
    })
      .send()
      .then((data) => {
        boot.pageData.current = data as unknown as GenericData[];
      });
  },
});

const boot = computed(() => useBootstrapStore());

const { data } = useRequest(
  () =>
    exploreRequest({
      with: '',
      latest_artists: 30,
      random_artists: 30,
      trending_artists: 30,
      recommended_artists: 30,
    }),
  {
    immediate: false,
    initialData: boot.value.pageData.current,
  },
);

useMeta(() => {
  return {
    title: 'Explore Artists',
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore Artists on Toneflix Collab',
      },
      ogTitle: { property: 'og:title', content: 'Explore Artists' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore Artists on Toneflix Collab',
      },
    },
  };
});

const categories = reactive({
  top: [
    {
      id: 'top-artists',
      data: data.value.trending_artists,
      slug: 'top-artists',
      title: 'Top Artists',
      params: { filters: 'trending' },
    },
    {
      id: 'new-artists',
      data: data.value.latest_artists,
      slug: 'new-artists',
      title: 'New Artists',
      params: { filters: 'latest' },
    },
    {
      id: 'recommended-artists',
      data: data.value.recommended_artists,
      slug: 'recommended-artists',
      title: 'Recommended Artists',
      params: { filters: 'recommends' },
    },
  ],
  next: [
    {
      id: 'all',
      data: data.value.random_artists,
      slug: 'all',
      title: 'All Artists',
      params: { filters: 'random' },
    },
  ],
});
</script>
