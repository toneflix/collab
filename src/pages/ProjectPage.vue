<template>
  <q-page padding>
    <div class="relative">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{ backgroundImage: `url(${project?.imageUrl})` }"
      ></div>
      <div class="absolute flex justify-center md:!justify-start w-full">
        <AtroposViewer
          class="!flex-none w-48 h-48 md:h-72 md:w-72"
          :main-image="project.imageUrl"
        >
          <template #button>
            <TDropdown
              flat
              dense
              rounded
              size="2.4em"
              icon="eva-hash"
              dropdown-icon="none"
              color="dark-opaque"
              class="!flex-none opacity-90 rounded-full"
              :links="[
                {
                  label: 'Open',
                  icon: 'fas fa-expand',
                  to: {
                    name: 'studio.project',
                    params: { project_id: project.slug },
                  },
                },
                {
                  label: 'Edit Project',
                  icon: 'fas fa-edit',
                  to: {
                    name: 'studio.projects.create',
                    params: { project_id: project.slug },
                  },
                },
                {
                  label: 'Request to Join',
                  icon: 'fas fa-user-plus',
                  color: 'green',
                },
                {
                  label: 'Leave Project',
                  icon: 'fas fa-user-minus',
                  color: 'red',
                },
              ]"
              @click.stop.prevent
            />
          </template>
        </AtroposViewer>
        <div class="flex flex-row items-center justify-start flex-1 p-5">
          <div>
            <h6 class="text-sm">Project</h6>

            <h1 class="text-5xl font-circlular-std whitespace-nowrap">
              {{ project?.title }}
            </h1>

            <div
              class="flex flex-row items-center justify-start gap-2 font-semibold"
            >
              <span class="!flex-none">
                {{ intStr(project.collaboratorsCount) }} Collabers
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <VaButton
                  size="medium"
                  preset="plain"
                  color="textPrimary"
                  hover-opacity="0.05"
                  @click="project.proped = !project.proped"
                >
                  <q-icon
                    color="white"
                    :name="project.proped ? ionHandLeft : ionHandLeftOutline"
                    :fill="project.proped"
                  />
                  <span
                    :class="`text-sm font-${project.proped ? 'bold' : 'medium'}`"
                  >
                    &nbsp;{{ intStr(project.props) }} Props
                  </span>
                </VaButton>
              </span>
            </div>
            <p class="mt-4 text-sm max-w-96">
              {{ project.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3 pt-96 md:pt-80">
      <div class="col-span-5">
        <CreatorList
          hide-all-link
          vertical-list
          :categories="[
            {
              id: 'collabers',
              slug: 'collabers',
              title: 'Active Collabers',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <CommentSection />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import CommentSection from 'src/components/Sections/CommentSection.vue';
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import { ref, watch } from 'vue';
import { Project } from 'src/utils/models';
import { useRoute } from 'vue-router';
import { dummyProjects } from 'src/utils/dummy';
import { ionHandLeft, ionHandLeftOutline } from '@quasar/extras/ionicons-v7';
import { intStr } from 'src/utils/helpers';
import { useMeta } from 'quasar';
import TDropdown from 'src/components/Utilities/TDropdown.vue';

const route = useRoute();

const project = ref<Project>({} as unknown as Project);

watch(
  () => route.params,
  (params) => {
    project.value =
      dummyProjects.find(
        (e) => e.id === params.project_id || e.slug === params.project_id,
      ) || ({} as unknown as Project);
  },
  { immediate: true },
);

useMeta(() => {
  return {
    title: project.value.title,
    titleTemplate: (title) => `${title} - Toneflix Collab`,
    meta: {
      description: { name: 'description', content: project.value.description },
      ogImage: { property: 'og:image', content: project.value.imageUrl },
      ogTitle: { property: 'og:title', content: project.value.title },
      ogDescription: {
        property: 'og:description',
        content: project.value.description,
      },
    },
  };
});
</script>
