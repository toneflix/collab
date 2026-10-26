<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <CreatorList immediate hide-all-link :categories="categories.top" />
      </div>
      <div class="col-span-5">
        <CreatorList
          immediate
          hide-all-link
          vertical-list
          :categories="categories.next"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRequest } from 'alova/client';
import { useMeta } from 'quasar';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { exploreRequest } from 'src/utils/requests/requests';
import { computed, reactive } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    await exploreRequest({
      with: 'artist',
      top_creators: 30,
      new_creators: 30,
      random_creators: 30,
    })
      .send()
      .then((data) => {
        boot.pageData.current = data;
      });
  },
});

const boot = computed(() => useBootstrapStore());

const { data } = useRequest(
  () =>
    exploreRequest({
      with: 'artist',
      top_creators: 30,
      new_creators: 30,
      random_creators: 30,
    }),
  {
    immediate: false,
    initialData: boot.value.pageData.current,
  },
);

useMeta(() => {
  return {
    title: 'Explore Creators',
    titleTemplate: (title) => `${title} - Toneflix Music`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore Creators on Toneflix Music',
      },
      ogTitle: { property: 'og:title', content: 'Explore Creators' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore Creators on Toneflix Music',
      },
    },
  };
});

const categories = reactive({
  top: [
    {
      id: 'top-creators',
      data: data.value.topCreators,
      slug: 'top-creators',
      title: 'Top Creators',
      params: { filters: 'creator,top' },
    },
    {
      id: 'new-creators',
      data: data.value.newCreators,
      slug: 'new-creators',
      title: 'New Creators',
      params: { filters: 'creator,latest' },
    },
  ],
  next: [
    {
      id: 'all-creators',
      data: data.value.randomCreators,
      slug: 'all-creators',
      title: 'All Creators',
      params: { filters: 'creator,random' },
    },
  ],
});
</script>
