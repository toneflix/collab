<template>
  <q-page :class="{ 'flex flex-col justify-center': !project?.id }">
    <div class="flex w-full bg-white dark:!bg-gray-500" v-if="project?.id">
      <div
        class="!flex-none h-28 w-28 md:w-40 m-2 md:h-40 overflow-hidden bg-gradient-to-tr from-red-100 to-slate-200 text-center bg-cover rounded-t lg:rounded-t-none lg:rounded-l"
        :style="{
          backgroundImage: `url(${project.imageUrl || placeholder})`,
        }"
      >
        <img
          width="0"
          height="0"
          class="hidden w-0 h-0"
          :src="project.imageUrl"
          @error="project.imageUrl = placeholder"
        />
      </div>
      <div
        class="flex flex-col justify-center flex-1 p-4 leading-normal border-b border-l border-r border-gray-400 rounded-b g:border-l-0 lg:border-t lg:border-gray-400 lg:rounded-b-none lg:rounded-r"
      >
        <h3 class="text-2xl !flex-none font-bold text-gray-900 dark:text-white">
          {{ subString(project.title, 18) }}
        </h3>
        <p class="mb-2 text-sm !flex-none text-gray-900 dark:text-white">
          {{ project.description }}
        </p>
        <q-no-ssr
          class="flex !flex-none flex-row items-center justify-start gap-4 font-semibold text-gray-900 dark:text-white"
        >
          <HoverCard
            tag="span"
            trigger="mouseenter click"
            class="!flex-none flex items-center gap-1"
            :content="`${intStr(project.collaboratorsCount)} collaborators are working on this project`"
          >
            <q-icon name="fas fa-users" size=".8rem" />
            {{ intStr(project.collaboratorsCount) }}
          </HoverCard>
          <span class="!flex-none">•</span>
          <HoverCard
            tag="span"
            trigger="mouseenter click"
            class="!flex-none flex items-center gap-1"
            :content="`This project has ${intStr(project.props)} props`"
          >
            <q-icon :name="ionHandLeft" size=".9rem" />
            {{ intStr(project.props) }}
          </HoverCard>
          <span class="!flex-none">•</span>
          <HoverCard
            tag="span"
            trigger="mouseenter click"
            class="!flex-none flex items-center gap-1"
            :content="`This project has ${intStr(project.tracksCount)} tracks`"
          >
            <q-icon name="fas fa-compact-disc" size=".9rem" />
            {{ intStr(project.tracksCount) }}
          </HoverCard>
          <span class="!flex-none">•</span>
          <span class="!flex-none flex items-center gap-1">
            <q-btn
              flat
              dense
              icon="fas fa-edit"
              size="sm"
              :to="{ name: 'studio.projects.create', params: $route.params }"
            />
          </span>
          <span class="!flex-none" v-if="project.ready">•</span>
          <span class="!flex-none flex items-center gap-1">
            <q-btn
              dense
              no-caps
              rounded
              icon="fas fa-compact-disc"
              size="sm"
              color="white"
              padding="xs sm"
              text-color="dark"
              :disable="project.tracksCount < 1"
              :to="{ name: 'studio.release.create', query: $route.params }"
              v-if="project.ready"
            >
              <span class="ml-2 text-base">
                {{ project.released ? 'Update Release' : 'Release Project' }}
              </span>
            </q-btn>
          </span>
        </q-no-ssr>
      </div>
    </div>
    <div
      class="max-w-full p-4 mx-auto md:max-w-2xl lg:max-w-3xl"
      v-if="project?.id"
    >
      <div class="flex justify-start gap-4 mb-2">
        <h4 class="text-xl !flex-none font-semibold md:text-2xl">Tracklist</h4>
        <ProjectTrackInfoDialog
          ref="trackInfoDialogRef"
          :project="project"
          @created="
            (e) => {
              trackList.push(e);
              project.tracksCount++;
            }
          "
          @saved="
            (e) =>
              $router.push({
                name: 'studio.project.track',
                params: { project_id: project.slug, track_id: e.id },
              })
          "
        >
          <template #default="{ toggle }">
            <q-btn
              dense
              no-caps
              icon="add"
              label="Add Track"
              class="!flex-none"
              color="white"
              text-color="dark"
              :disable="project.released"
              @click="toggle()"
            />
          </template>
        </ProjectTrackInfoDialog>
      </div>
      <SimpleInfo text="This project has no tracks" v-if="!trackList.length">
        <q-btn
          dense
          no-caps
          icon="add"
          class="!flex-none"
          color="white"
          text-color="dark"
          @click="trackInfoDialogRef.toggle()"
        />
      </SimpleInfo>
      <q-list class="grid grid-cols-1 md:grid-cols-2">
        <q-item
          clickable
          :to="{
            name: 'studio.project.track',
            params: { project_id: project.id, track_id: track.id },
          }"
          :key="track.id"
          v-for="(track, i) in trackList"
        >
          <q-item-section avatar>
            <q-avatar
              color="secondary"
              text-color="white"
              icon="fas fa-compact-disc"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label>
              {{ track.title }}
            </q-item-label>
            <q-item-label
              caption
              class="flex !flex-none flex-row items-center justify-start gap-2"
            >
              <span
                class="!flex-none flex items-center gap-1"
                v-if="track.artist"
              >
                <q-icon name="fas fa-user" size=".6rem" />
                {{ track.artist.name }}
              </span>
              <span class="!flex-none flex items-center gap-1">
                <q-icon name="fas fa-wave-square" size=".6rem" />
                {{ intStr(track.stemsCount) }}
              </span>
            </q-item-label>
          </q-item-section>
          <q-item-section side top>
            <q-item-label caption>
              {{ formatSeconds(track.duration) }}
            </q-item-label>
            <TDropdown
              flat
              dense
              rounded
              icon="fas fa-ellipsis"
              color="white"
              item-name="Track"
              dropdown-icon="none"
              :links="[
                {
                  show:
                    (!!track.user_id && track.user_id === user.id) ||
                    project.isOwner,
                  icon: 'fas fa-trash',
                  label: 'Delete Track',
                  color: 'red',
                  action: 'delete',
                  target: `creator/projects/${project.id}/tracks/${track.id}`,
                  callback: () => trackList.splice(i, 1),
                },
              ]"
              @click.stop.prevent
            />
          </q-item-section>
        </q-item>
      </q-list>

      <div class="flex justify-start gap-4 mt-4 mb-2">
        <h4 class="text-xl !flex-none font-semibold md:text-2xl">Collabers</h4>
        <AddCollaberDialog
          ref="collaberDialogRef"
          :project="project"
          @created="
            (e) => {
              collaborators.push(e);
              project.collaboratorsCount++;
            }
          "
        >
          <template #default="{ toggle }">
            <q-btn
              dense
              no-caps
              icon="add"
              label="Add Collaber"
              class="!flex-none"
              color="white"
              text-color="dark"
              :disable="project.released"
              @click="toggle"
            />
          </template>
        </AddCollaberDialog>
      </div>
      <SimpleInfo
        text="This project has no collabers"
        v-if="!collaborators.length"
      >
        <q-btn
          dense
          no-caps
          icon="add"
          class="!flex-none"
          color="white"
          text-color="dark"
          @click="collaberDialogRef.toggle()"
        />
      </SimpleInfo>
      <q-list class="grid grid-cols-1 md:grid-cols-2">
        <q-item
          :key="artist.id"
          :class="{ 'opacity-50': !artist.accepted }"
          :clickable="artist.accepted"
          :to="{ name: 'creator', params: { artist_id: artist.username } }"
          v-for="(artist, i) in collaborators"
        >
          <q-item-section avatar>
            <q-avatar rounded color="gray-400" text-color="white">
              <q-img no-spinner :src="artist.imageUrl" :error-src="avatarFallback" />
            </q-avatar>
          </q-item-section>

          <q-item-section>
            {{ artist.name }}
            <q-item-label v-if="!artist.accepted">Pending</q-item-label>
          </q-item-section>
          <q-item-section side top>
            <q-item-label caption>
              {{ collabRole(artist.role, artist.custom) }}
            </q-item-label>
            <TDropdown
              flat
              dense
              rounded
              icon="fas fa-ellipsis"
              color="white"
              item-name="collaber"
              dropdown-icon="none"
              :links="[
                {
                  show: project.isOwner,
                  icon: 'fas fa-user-edit',
                  label: 'Edit Role',
                  color: 'primary',
                  click: () => collaberDialogRef.toggle(artist),
                },
                {
                  icon: 'fas fa-user-lock',
                  label: 'Block',
                  color: 'red',
                  click: () => flag(artist.id, i),
                  loading: reporting,
                },
                {
                  show: project.isOwner,
                  icon: 'fas fa-user-times',
                  label: 'Remove from Project',
                  color: 'red',
                  action: 'delete',
                  target: `creator/projects/${project.id}/collaborators/${artist.id}`,
                  callback: () => collaborators.splice(i, 1),
                },
              ]"
              @click.stop.prevent
            />
          </q-item-section>
        </q-item>
      </q-list>
      <q-separator class="my-5" v-if="project.isOwner" />
      <div class="text-center" v-if="project.isOwner">
        <ContentRemover
          dense
          no-caps
          color="negative"
          icon="fas fa-trash"
          label="Delete Project"
          class="!flex-none"
          base-url="creator/projects"
          :id="project.id"
          @deleted="$router.replace({ name: 'studio.releases' })"
        />
      </div>
    </div>
    <OopsAlert
      text="Let's assume you do not have access to this project..."
      v-else-if="!loading"
    />
  </q-page>
</template>

<script setup lang="ts">
import { avatarFallback } from 'src/utils/imageFallback';
import ProjectTrackInfoDialog from 'src/components/Cards/ProjectTrackInfoDialog.vue';
import AddCollaberDialog from 'src/components/Cards/AddCollaberDialog.vue';
import ContentRemover from 'src/components/Utilities/ContentRemover.vue';
import HoverCard from 'src/components/Cards/HoverCard.vue';
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { ionHandLeft } from '@quasar/extras/ionicons-v8';
import { useWatcher } from 'alova/client';
import { useMeta } from 'quasar';
import placeholder from 'src/assets/placeholder.svg';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { formatSeconds, intStr, subString } from 'src/utils/helpers';
import { Project, Collaber, ProjectTrack } from 'src/utils/models';
import {
  loadProjectCollaboratorsRequest,
  loadProjectRequest,
  loadProjectTracksRequest,
} from 'src/utils/requests/requests';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import { collabRole } from 'src/utils/presets';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import { requestFlagContent } from 'src/utils/requests/content';

const trackInfoDialogRef = ref();
defineOptions({
  async preFetch({ currentRoute, store }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.project_id);

    if (currentRoute.params.project_id) {
      // Load project
      const project = await loadProjectRequest(id, { with: 'tracks' }).send();

      // Load Tracks
      const tracks = await loadProjectTracksRequest(project, {
        with: 'genre,artist',
      }).send();

      // Collabers
      const collaborators = await loadProjectCollaboratorsRequest(project);

      // Build Data
      boot.pageData.current = {
        tracks,
        project,
        collaborators,
      };
    }
  },
});

const collaberDialogRef = ref();
const route = useRoute();
const user = computed(() => useBootstrapStore().user);
const curr = useBootstrapStore().pageData.current as {
  tracks: ProjectTrack[];
  project: Project;
  collaborators: Collaber[];
};

const { data: project, loading } = useWatcher(
  () =>
    loadProjectRequest(route.params.project_id as string, {
      with: 'tracks,collabers',
    }),
  [() => route.params.project_id],
  {
    middleware: (_, next) => (route.params.project_id ? next() : undefined),
    immediate: true,
    initialData: {
      ...curr.project,
      collaboratorsCount: curr.project?.collaboratorsCount || 0,
      tracksCount: curr.project?.tracksCount || 0,
    },
  },
);

const { data: trackList } = useWatcher(
  () => loadProjectTracksRequest(project.value, { with: 'genre,artist' }),
  [project],
  {
    middleware: (_, next) => (project.value.id ? next() : undefined),
    immediate: true,
    initialData: curr.tracks,
  },
);

const { data: collaborators } = useWatcher(
  () => loadProjectCollaboratorsRequest(project.value),
  [project],
  {
    middleware: (_, next) => (project.value.id ? next() : undefined),
    immediate: true,
    initialData: curr.collaborators,
  },
);

const reporting = ref(false);
const flag = (id: string | number, index: number) => {
  requestFlagContent(
    { type: 'user', id, label: 'user', action: 'block' },
    (state) => {
      reporting.value = state === 'loading';
    },
  ).then(() => {
    collaborators.value.splice(index, 1);
  });
};

useMeta(() => {
  return {
    title: project.value.title,
    titleTemplate: (title) => `Project: ${title} - Toneflix Collab`,
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
