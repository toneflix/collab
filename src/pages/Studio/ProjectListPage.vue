<template>
  <q-page>
    <div class="max-w-full p-4 mx-auto md:max-w-2xl lg:max-w-3xl">
      <div class="flex items-center gap-3 mb-3 flex-nowrap!">
        <h4 class="text-xl font-semibold md:text-2xl">Projects</h4>
        <q-space />
        <q-btn
          rounded
          unelevated
          no-caps
          icon="lucide-plus"
          :label="$q.screen.gt.xs ? 'Create project' : 'New'"
          color="white"
          text-color="dark"
          class="flex-none!"
          :to="{ name: 'studio.projects.create' }"
        />
      </div>
      <!-- Whose projects to list -->
      <q-btn-toggle
        rounded
        unelevated
        no-caps
        toggle-color="primary"
        toggle-text-color="dark"
        color="grey-10"
        text-color="grey-4"
        class="mb-3"
        :options="[
          { label: 'Mine', value: true },
          { label: 'Collabs', value: false },
        ]"
        v-model="own"
      />
      <q-list class="grid grid-cols-1 md:grid-cols-2">
        <SimpleInfo
          icon="lucide-folder-open"
          class="m-3 md:col-span-2"
          text="You do not have any projects yet."
          v-if="!projects.length"
        />
        <q-item
          clickable
          :to="{
            name: 'studio.project',
            params: { project_id: project.slug },
          }"
          :key="project.id"
          v-intersection="(e) => onIntersect(e, i === projects.length - 1)"
          v-for="(project, i) in projects"
        >
          <q-item-section avatar>
            <q-avatar rounded color="gray-400" text-color="white">
              <q-img no-spinner :src="project.imageUrl" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            <q-item-label>{{ project.title }}</q-item-label>
            <q-item-label
              class="flex flex-none! flex-row items-center justify-start gap-2 text-xs font-semibold text-gray-900 dark:text-white"
            >
              <span class="flex-none! flex items-center gap-1">
                <q-icon name="lucide-users" size=".6rem" />
                {{ intStr(project.collaboratorsCount) }}
              </span>
              <span class="flex-none!">•</span>
              <span class="flex-none! flex items-center gap-1">
                <q-icon name="lucide-hand" size=".7rem" />
                {{ intStr(project.props) }}
              </span>
              <span class="flex-none!">•</span>
              <span class="flex-none! flex items-center gap-1">
                <q-icon name="lucide-disc-3" size=".7rem" />
                {{ intStr(project.tracksCount) }}
              </span>
              <span class="flex-none!" v-if="project.released">•</span>
              <span
                class="flex-none! flex items-center gap-1"
                v-if="project.released"
              >
                <q-icon
                  name="lucide-circle-check"
                  size=".7rem"
                  color="success"
                />
              </span>
            </q-item-label>
          </q-item-section>
          <q-item-section side top>
            <q-item-label caption>
              {{ date.formatDate(project.createdAt, 'YYYY/MM/DD') }}
            </q-item-label>

            <TDropdown
              flat
              dense
              rounded
              icon="lucide-ellipsis"
              item-name="Project"
              dropdown-icon="none"
              color="white"
              :links="[
                {
                  label: 'Project Home',
                  icon: 'lucide-house',
                  to: {
                    name: 'project',
                    params: { project_id: project.slug },
                  },
                },
                {
                  label: 'Edit Project',
                  icon: 'lucide-pencil',
                  to: {
                    name: 'studio.projects.create',
                    params: { project_id: project.slug },
                  },
                },
                {
                  show: project.isOwner && !projectReleaseBlocker(project),
                  label: projectReleaseLabel(project),
                  icon: 'lucide-disc-3',
                  to: projectReleaseLink(project),
                },
                {
                  show: project.isOwner,
                  label: 'Delete Project',
                  icon: 'lucide-trash-2',
                  color: 'negative',
                  target: `creator/projects/${project.id}`,
                  action: 'delete',
                  callback: () => projects.splice(i, 1),
                },
              ]"
              @click.stop.prevent
            />
          </q-item-section>
        </q-item>
        <ListSkeleton class="md:col-span-2" avatar="square" :rows="4" v-if="(fetching || loading) && !projects.length" />
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { usePagination } from 'alova/client';
import { date } from 'quasar';
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { intStr } from 'src/utils/helpers';
import { PageMeta, Project } from 'src/utils/models';
import { loadProjectsRequest } from 'src/utils/requests/requests';
import {
  projectReleaseBlocker,
  projectReleaseLabel,
  projectReleaseLink,
} from 'src/utils/navigations';
import { ref } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    const { data: projects, meta: projectsMeta } = await loadProjectsRequest({
      own: true,
      with: 'tracks',
      limit: 30,
    }).send();

    boot.pageData.current = {
      projects,
      projectsMeta,
    };
  },
});

const own = ref(true);
const current = useBootstrapStore().pageData.current as {
  projects: Project[];
  projectsMeta: Partial<PageMeta>;
};

const {
  page,
  data: projects,
  loading,
  fetching,
  isLastPage,
} = usePagination(
  (page, limit) =>
    loadProjectsRequest({ page, limit, with: 'tracks', own: own.value }),
  {
    watchingStates: [own],
    initialData: { data: current.projects, meta: current.projectsMeta },
    immediate: false,
    append: true,
    total: (e) => e.meta?.total,
    data: (e) => e.data,
  },
);

const onIntersect = (
  evt: IntersectionObserverEntry,
  isLast: boolean,
): void => {
  if (isLast && !isLastPage.value && evt.isIntersecting) {
    page.value++;
  }
};
</script>
