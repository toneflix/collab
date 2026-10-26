<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <AlbumList
          immediate
          hide-all-link
          v-model:categories="categories.top"
        />
      </div>
      <div class="col-span-5">
        <CreatorList
          artist
          immediate
          hide-all-link
          :categories="categories.artists"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          immediate
          hide-all-link
          v-model:categories="categories.next"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          immediate
          vertical-list
          hide-all-link
          v-model:categories="categories.last"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useRequest } from 'alova/client';
import { useMeta } from 'quasar';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { exploreRequest } from 'src/utils/requests/requests';
import { computed, reactive } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    await exploreRequest({
      with: 'artist',
      top_albums: 30,
      latest_albums: 30,
      random_albums: 30,
      trending_artists: 30,
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
      top_albums: 30,
      latest_albums: 30,
      random_albums: 30,
      trending_artists: 30,
    }),
  {
    immediate: false,
    initialData: boot.value.pageData.current,
  },
);

useMeta(() => {
  return {
    title: 'Explore Albums',
    titleTemplate: (title) => `${title} - Toneflix Music`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore Albums on Toneflix Music',
      },
      ogTitle: { property: 'og:title', content: 'Explore Albums' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore Albums on Toneflix Music',
      },
    },
  };
});

const categories = reactive({
  top: [
    {
      id: 'top-albums',
      slug: 'top-albums',
      data: data.value.topAlbums,
      title: 'Top Albums',
      params: { filters: 'album,top' },
    },
  ],
  next: [
    {
      id: 'new-albums',
      data: data.value.latestAlbums,
      slug: 'new-albums',
      title: 'New Albums',
      params: { filters: 'album,latest' },
    },
  ],
  last: [
    {
      id: 'all',
      data: data.value.randomAlbums,
      slug: 'all',
      title: 'All Albums',
      params: { filters: 'album,random' },
    },
  ],
  artists: [
    {
      id: 'top-artists',
      data: data.value.trendingArtists,
      slug: 'top-artists',
      title: 'Top Artists',
      params: { filters: 'trending' },
    },
  ],
});
</script>
