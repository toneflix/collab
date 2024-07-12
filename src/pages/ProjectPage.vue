<template>
  <q-page padding>
    <div class="relative" v-if="project?.id">
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
              {{ subString(project.title, 25) }}
            </h1>

            <div
              class="flex flex-row items-center justify-start gap-2 font-semibold"
            >
              <span class="!flex-none">
                {{ intStr(project.collaboratorsCount) }} Collabers
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <TInteraction
                  v-slot="{ submit, active }"
                  type="prop"
                  label="Props"
                  :active="project.proped"
                  :base-url="`projects/${project.id}`"
                  @done="project.props = $event.props"
                >
                  <VaButton
                    size="medium"
                    preset="plain"
                    color="textPrimary"
                    hover-opacity="0.05"
                    @click="submit"
                  >
                    <q-icon
                      color="white"
                      :name="active ? ionHandLeft : ionHandLeftOutline"
                      :fill="active"
                    />
                    <span :class="`text-sm font-${active ? 'bold' : 'medium'}`">
                      &nbsp;{{ intStr(project.props) }} Props
                    </span>
                  </VaButton>
                </TInteraction>
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <q-icon color="white" name="eva-message-square" />
                &nbsp;{{ intStr(project.commentsCount) }}
              </span>
            </div>
            <p class="mt-4 text-sm max-w-96">
              {{ project.description }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div
      class="grid grid-cols-5 gap-x-3 gap-y-3 pt-96 md:pt-80"
      v-if="project?.id"
    >
      <div class="col-span-5">
        <CreatorList
          hide-all-link
          :special-icon="[
            'check_circle',
            (id: string | number) => id === project.user_id,
          ]"
          :params="{ limit: 30, project_id: project.id }"
          v-model:categories="categories.creators"
        />
      </div>
      <q-no-ssr>
        <div class="col-span-5">
          <CommentSection
            v-model:init-comments="current.comments"
            :params="{ limit: 30, project_id: project.id }"
          />
        </div>
      </q-no-ssr>
    </div>
    <OopsAlert
      text="This project was probably canceled..."
      v-else-if="!loading"
    />
  </q-page>
</template>

<script setup lang="ts">
import CommentSection from 'src/components/Sections/CommentSection.vue';
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import CreatorList from 'src/components/Showcase/CreatorList.vue';
import TInteraction from 'src/components/Utilities/TInteraction.vue';
import {
  Category,
  GenericData,
  PageMeta,
  Project,
  User,
  UserComment,
} from 'src/utils/models';
import { useRoute } from 'vue-router';
import { ionHandLeft, ionHandLeftOutline } from '@quasar/extras/ionicons-v7';
import { intStr, subString } from 'src/utils/helpers';
import { useMeta } from 'quasar';
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadCommentsRequest,
  loadProjectRequest,
  loadUsersRequest,
} from 'src/utils/requests';
import { useWatcher } from 'alova';
import { ref } from 'vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = currentRoute.params.project_id as string;

    const project = await loadProjectRequest(
      id,
      { with: 'comments_count' },
      true,
    ).send();

    const { data: comments, meta: commentsMeta } = await loadCommentsRequest(
      id,
      undefined,
      {
        with: 'user',
      },
    ).send();

    const { data: creators, meta: creatorMeta } = await loadUsersRequest({
      project_id: id,
      filters: 'creator',
      limit: 30,
    }).send();

    boot.pageData.current = {
      project,
      creators,
      comments,
      creatorMeta,
      commentsMeta,
    } as unknown as GenericData[];
  },
});

const route = useRoute();
const current = useBootstrapStore().pageData.current as unknown as {
  project: Project;
  creators: User[];
  comments: UserComment[];
  commentsMeta: Partial<PageMeta>;
  creatorMeta: Partial<PageMeta>;
};

const categories = ref({
  creators: <Category[]>[
    {
      id: 'collabers',
      slug: 'collabers',
      title: 'Project Collabers',
      data: { list: current.creators, meta: current.creatorMeta },
      params: { filters: 'creator', artist_id: route.params.project_id_id },
    },
  ],
});

const { data: project, loading } = useWatcher(
  () =>
    loadProjectRequest(
      route.params.project_id,
      { with: 'comments_count' },
      true,
    ),
  [() => route.params.project_id],
  {
    sendable: () => !!route.params.project_id,
    immediate: false,
    initialData: current.project,
  },
);

useMeta(() => {
  return project.value?.id
    ? {
        title: project.value.title,
        titleTemplate: (title) => `${title} - Toneflix Collab`,
        meta: {
          description: {
            name: 'description',
            content: project.value.description,
          },
          ogImage: { property: 'og:image', content: project.value.imageUrl },
          ogTitle: { property: 'og:title', content: project.value.title },
          ogDescription: {
            property: 'og:description',
            content: project.value.description,
          },
        },
      }
    : { title: 'Not Found' };
});
</script>
