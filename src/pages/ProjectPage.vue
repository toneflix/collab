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
              with-notifications
              size="2.4em"
              icon="lucide-hash"
              dropdown-icon="none"
              color="dark-opaque"
              class="!flex-none opacity-90 rounded-full"
              :class="{
                'border-2 border-solid border-orange-400': project.pendingData,
              }"
              :links="[
                {
                  label: 'Project Studio',
                  icon: 'lucide-expand',
                  show: project.isCollaber || project.isOwner,
                  to: {
                    name: 'studio.project',
                    params: { project_id: project.slug },
                  },
                },
                {
                  label: 'Edit Project',
                  icon: 'lucide-pencil',
                  show: project.isOwner,
                  to: {
                    name: 'studio.projects.create',
                    params: { project_id: project.slug },
                  },
                },
                {
                  label: 'Request to Join',
                  icon: 'lucide-user-plus',
                  color: 'green',
                  show:
                    !project.isCollaber &&
                    !project.isOwner &&
                    !project.pendingData,
                  click: () => collaberDialogRef.toggle(),
                },
                {
                  label: project.pendingData
                    ? 'Cancel Request'
                    : 'Leave Project',
                  icon: project.pendingData ? 'lucide-user-x' : 'lucide-user-minus',
                  show:
                    (project.isCollaber || !!project.pendingData) &&
                    !project.isOwner,
                  color: 'red',
                  action: 'delete',
                  target: `projects/${project.id}/collaborators/${project.pendingData?.id || 'self'}`,
                  actionMsg: `Are you sure you want to ${project.pendingData ? 'cancel your request to join' : 'leave'} this project?`,
                  actionTitle: project.pendingData
                    ? 'Cancel Request'
                    : 'Leave Project',
                  callback: () => {
                    project.isCollaber = false;
                    delete project.pendingData;
                  },
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
                  <q-btn
                    flat
                    no-caps
                    @click="submit"
                  >
                    <q-icon
                      color="white"
                      :name="active ? 'lucide-hand:fill' : 'lucide-hand'"
                      :fill="active"
                    />
                    <span :class="`text-sm font-${active ? 'bold' : 'medium'}`">
                      &nbsp;{{ intStr(project.props) }} Props
                    </span>
                  </q-btn>
                </TInteraction>
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                <q-icon color="white" name="lucide-message-square" />
                &nbsp;{{ intStr(project.commentsCount) }}
              </span>
            </div>
            <p class="mt-8 text-sm max-w-96">
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
            'lucide-circle-check',
            (id: string | number) => id === project.userId,
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
    <AddCollaberDialog
      hide-btn
      guest-request
      ref="collaberDialogRef"
      :project="project"
      @created="project.pendingData = $event"
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
  PageMeta,
  Project,
  User,
  UserComment,
} from 'src/utils/models';
import { useRoute } from 'vue-router';
import { intStr, subString } from 'src/utils/helpers';
import { useMeta } from 'quasar';
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadCommentsRequest,
  loadProjectRequest,
  loadUsersRequest,
} from 'src/utils/requests/requests';
import { useWatcher } from 'alova/client';
import { ref } from 'vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import AddCollaberDialog from 'src/components/Cards/AddCollaberDialog.vue';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = currentRoute.params.project_id as string;

    const [project, { data: comments, meta: commentsMeta }, { data: creators, meta: creatorMeta }] = await Promise.all([
      loadProjectRequest(
        id,
        { with: 'comments_count,pending_data' },
        true,
      ).send(),
      loadCommentsRequest(
        id,
        undefined,
        {
          with: 'user',
        },
      ).send(),
      loadUsersRequest({
        project_id: id,
        filters: 'creator',
        limit: 30,
      }).send(),
    ]);

    boot.pageData.current = {
      project,
      creators,
      comments,
      creatorMeta,
      commentsMeta,
    };
  },
});

const route = useRoute();
const collaberDialogRef = ref();

const current = useBootstrapStore().pageData.current as {
  project: Project;
  creators: User[];
  comments: UserComment[];
  commentsMeta: Partial<PageMeta>;
  creatorMeta: Partial<PageMeta>;
};

const categories = ref({
  creators: <Category<User>[]>[
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
      { with: 'comments_count,pending_data' },
      true,
    ),
  [() => route.params.project_id],
  {
    middleware: (_, next) => (route.params.project_id ? next() : undefined),
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
