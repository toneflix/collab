<template>
  <q-page padding>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3">
      <div class="col-span-5">
        <ProjectList
          hide-all-link
          v-model:categories="categories.top_projects"
        />
      </div>
      <div class="col-span-5">
        <CreatorList
          hide-all-link
          v-model:categories="categories.top_creators"
        />
      </div>
      <div class="col-span-5">
        <ProjectList
          hide-all-link
          v-model:categories="categories.new_projects"
        />
      </div>
      <div class="col-span-5">
        <ProjectList
          vertical-list
          hide-all-link
          v-model:categories="categories.all_projects"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import ProjectList from 'src/components/Showcase/ProjectList.vue';
import { useRequest } from 'alova/client';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { exploreRequest } from 'src/utils/requests/requests';
import { computed, reactive } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    await exploreRequest({
      with: 'artist',
      top_projects: 30,
      new_projects: 30,
      top_creators: 30,
      random_projects: 30,
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
      top_projects: 30,
      new_projects: 30,
      top_creators: 30,
      random_projects: 30,
    }),
  {
    immediate: false,
    initialData: boot.value.pageData.current,
  },
);

const categories = reactive({
  top_projects: [
    {
      title: 'Top Projects',
      slug: 'top-projects',
      id: 'top-projects',
      data: data.value.topProjects,
    },
  ],
  top_creators: [
    {
      id: 'top-creators',
      slug: 'top-creators',
      title: 'Top Creators',
      data: data.value.topCreators,
    },
  ],
  new_projects: [
    {
      id: 'new-projects',
      slug: 'new-projects',
      title: 'New Projects',
      data: data.value.newProjects,
    },
  ],
  all_projects: [
    {
      id: 'all',
      slug: 'all',
      title: 'All Projects',
      data: data.value.randomProjects,
      params: { filters: 'random' },
    },
  ],
});

useMeta(() => {
  return {
    title: 'Explore Projects',
    titleTemplate: (title) => `${title} - Toneflix Music`,
    meta: {
      description: {
        name: 'description',
        content: 'Explore Projects on Toneflix Music',
      },
      ogTitle: { property: 'og:title', content: 'Explore Projects' },
      ogDescription: {
        property: 'og:description',
        content: 'Explore Projects on Toneflix Music',
      },
    },
  };
});
</script>
