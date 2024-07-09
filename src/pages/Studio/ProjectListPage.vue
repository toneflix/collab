<template>
  <q-page>
    <div class="max-w-full p-4 mx-auto md:max-w-2xl lg:max-w-3xl">
      <div class="flex justify-start gap-4 mb-2">
        <h4 class="text-xl !flex-none font-semibold md:text-2xl">Projects</h4>
        <div class="!flex-none">
          <q-btn
            dense
            no-caps
            icon="add"
            size="md"
            label="Create Project"
            color="white"
            text-color="dark"
            :to="{
              name: 'studio.projects.create',
            }"
          />
        </div>
      </div>
      <q-list class="grid grid-cols-1 md:grid-cols-2">
        <q-item
          clickable
          :to="{
            name: 'studio.project',
            params: { project_id: project.slug },
          }"
          :key="project.id"
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
              class="flex !flex-none flex-row items-center justify-start gap-2 text-xs font-semibold text-gray-900 dark:text-white"
            >
              <span class="!flex-none flex items-center gap-1">
                <q-icon name="fas fa-users" size=".6rem" />
                {{ intStr(project.collaboratorsCount) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none flex items-center gap-1">
                <q-icon :name="ionHandLeft" size=".7rem" />
                {{ intStr(project.props) }}
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none flex items-center gap-1">
                <q-icon name="fas fa-compact-disc" size=".7rem" />
                {{ intStr(project.tracksCount) }}
              </span>
              <span class="!flex-none" v-if="project.released">•</span>
              <span
                class="!flex-none flex items-center gap-1"
                v-if="project.released"
              >
                <q-icon
                  name="fas fa-check-circle"
                  size=".7rem"
                  color="success"
                  class="icon-fill"
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
              icon="fas fa-ellipsis"
              item-name="Project"
              dropdown-icon="none"
              color="white"
              :links="[
                {
                  label: 'Project Home',
                  icon: 'fas fa-home',
                  to: {
                    name: 'project',
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
                  show: user.id === project.user_id,
                  label: 'Delete Project',
                  icon: 'fas fa-trash',
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
      </q-list>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ionHandLeft } from '@quasar/extras/ionicons-v7';
import { date } from 'quasar';
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { intStr } from 'src/utils/helpers';
import { GenericData, Project } from 'src/utils/models';
import { loadProjectsRequest } from 'src/utils/requests';
import { computed } from 'vue';

defineOptions({
  async preFetch({ store }) {
    const boot = useBootstrapStore(store);
    const { data } = await loadProjectsRequest({ with: 'tracks' }).send();

    boot.pageData.current = data as unknown as GenericData[];
  },
});

const user = computed(() => useBootstrapStore().user);
const projects = useBootstrapStore().pageData.current as unknown as Project[];
</script>
