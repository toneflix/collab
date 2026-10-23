<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <GenreList
          vertical-list
          hide-all-link
          v-model:categories="categories.main"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import GenreList from 'src/components/Showcase/GenreList.vue';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { loadGenresRequest } from 'src/utils/requests/requests';
import { Category, Genre, PageMeta } from 'src/utils/models';
import { reactive } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    const { data: genres, meta: genresMeta } = await loadGenresRequest({
      limit: 30,
    }).send();

    boot.pageData.current = {
      genres,
      genresMeta,
    };
  },
});

const current = useBootstrapStore().pageData.current as {
  genres: Genre[];
  genresMeta: PageMeta;
};

const categories = reactive({
  main: <Category<Genre>[]>[
    {
      id: 'genres',
      slug: 'genres',
      title: 'Genres',
      data: { list: current.genres, meta: current.genresMeta },
      params: { limit: 30 },
    },
  ],
});

useMeta(() => {
  return {
    title: 'Explore',
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore and Create Music on Toneflix Collab',
      },
      ogTitle: { property: 'og:title', content: 'Explore and Create Music' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore and Create Music on Toneflix Collab',
      },
    },
  };
});
</script>
