<template>
  <q-page :class="{ 'flex flex-col justify-center': !project?.id }">
    <!-- The release action: in the details on wider screens, its own row on phones -->
    <DefineRelease>
      <q-btn
        no-caps
        rounded
        unelevated
        color="primary"
        class="flex-none!"
        icon="lucide-disc-3"
        :label="projectReleaseLabel(project)"
        :disable="!!releaseBlocker"
        :to="projectReleaseLink(project)"
      />
      <q-badge
        rounded
        color="positive"
        label="Released"
        class="flex-none!"
        v-if="project.released"
      />
      <span class="text-sm text-fg-subtle flex-none!" v-else-if="releaseBlocker">
        {{ releaseBlocker }}
      </span>
    </DefineRelease>
    <section class="project-hero" v-if="project?.id">
      <div
        class="project-hero__backdrop"
        :style="{ backgroundImage: `url(${project.imageUrl || placeholder})` }"
      ></div>
      <div class="relative flex flex-row flex-wrap gap-x-4 gap-y-3 p-4 mx-auto max-w-3xl md:flex-nowrap md:items-end md:gap-5 md:py-8">
        <div
          class="flex-none! overflow-hidden bg-cover rounded-xl size-20 sm:size-32 md:size-44 bg-surface-3 shadow-lg"
          :style="{ backgroundImage: `url(${project.imageUrl || placeholder})` }"
        >
          <img
            width="0"
            height="0"
            class="hidden w-0 h-0"
            :src="project.imageUrl"
            @error="project.imageUrl = placeholder"
          />
        </div>
        <div class="flex flex-col flex-1 min-w-0 gap-2 md:gap-3">
          <div class="flex items-center gap-2 flex-none!">
            <span class="text-xs font-semibold tracking-wider uppercase text-fg-muted flex-none!">Project</span>
            <IconBtn size="sm"
              icon="lucide-pencil"
              aria-label="Edit project"
              class="flex-none! text-fg-muted"
              :to="{ name: 'studio.projects.create', params: $route.params }"
            />
          </div>
          <h1 class="text-2xl font-bold leading-tight sm:text-3xl md:text-5xl flex-none! break-words">
            {{ project.title }}
          </h1>
          <p class="max-w-2xl text-fg-muted flex-none!" v-if="project.description">
            {{ project.description }}
          </p>
          <q-no-ssr class="flex flex-wrap items-center gap-2 flex-none!">
            <HoverCard
              tag="span"
              trigger="mouseenter click"
              class="project-hero__stat"
              :content="`${intStr(project.collaboratorsCount)} collaborators are working on this project`"
            >
              <q-icon name="lucide-users" size="14px" />
              {{ intStr(project.collaboratorsCount) }}
            </HoverCard>
            <HoverCard
              tag="span"
              trigger="mouseenter click"
              class="project-hero__stat"
              :content="`This project has ${intStr(project.props)} props`"
            >
              <q-icon name="lucide-hand" size="14px" />
              {{ intStr(project.props) }}
            </HoverCard>
            <HoverCard
              tag="span"
              trigger="mouseenter click"
              class="project-hero__stat"
              :content="`This project has ${intStr(project.tracksCount)} tracks`"
            >
              <q-icon name="lucide-disc-3" size="14px" />
              {{ intStr(project.tracksCount) }}
            </HoverCard>
          </q-no-ssr>
          <div class="flex flex-wrap items-center gap-3 mt-1 flex-none! max-md:hidden!" v-if="project.isOwner">
            <q-no-ssr><ReuseRelease /></q-no-ssr>
          </div>
        </div>
        <!-- Phones: the release action gets its own full-width row under the artwork -->
        <div class="flex flex-wrap items-center gap-3 flex-none! w-full md:hidden!" v-if="project.isOwner">
          <q-no-ssr><ReuseRelease /></q-no-ssr>
        </div>
      </div>
    </section>
    <div
      class="max-w-full p-4 mx-auto md:max-w-2xl lg:max-w-3xl"
      v-if="project?.id"
    >
      <div class="flex items-center justify-between gap-4 mb-2 flex-nowrap!">
        <h2 class="text-xl flex-none! font-semibold md:text-2xl">Tracklist</h2>
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
              icon="lucide-plus"
              :label="$q.screen.gt.xs ? 'Add Track' : 'Add'"
              class="flex-none!"
              outline
              rounded
              padding="2px 12px"
              @click="toggle()"
            />
          </template>
        </ProjectTrackInfoDialog>
      </div>
      <ProjectTrackInfoDialog
        ref="editDialogRef"
        :key="editing.id"
        :track="editing"
        :project="project"
        @saved="(e) => updateTrack(e)"
        v-if="editing"
      >
        <template #default><span /></template>
      </ProjectTrackInfoDialog>
      <SimpleInfo dense icon="lucide-disc-3" text="No tracks yet" v-if="!trackList.length" />
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
              rounded
              icon="lucide-disc-3"
              class="bg-primary-soft text-primary"
            />
          </q-item-section>

          <q-item-section>
            <q-item-label>
              {{ track.title }}
            </q-item-label>
            <q-item-label
              caption
              class="flex flex-none! flex-row items-center justify-start gap-2"
            >
              <span
                class="min-w-0 flex flex-nowrap! items-center gap-1"
                v-if="track.artist"
              >
                <q-icon name="lucide-user" size=".6rem" class="flex-none!" />
                <span class="truncate">{{ artistCredit(track) }}</span>
              </span>
              <span class="flex-none! flex items-center gap-1">
                <q-icon name="lucide-audio-waveform" size=".6rem" />
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
              icon="lucide-ellipsis"
              color="white"
              item-name="Track"
              dropdown-icon="none"
              :links="[
                {
                  icon: 'lucide-pencil',
                  label: 'Edit Track',
                  click: () => editTrack(track),
                },
                {
                  show:
                    (!!track.userId && track.userId === user.id) ||
                    project.isOwner,
                  icon: 'lucide-trash-2',
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

      <div class="flex items-center justify-between gap-4 mt-6 mb-2 md:mt-8 flex-nowrap!">
        <h2 class="text-xl flex-none! font-semibold md:text-2xl">Collabers</h2>
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
              icon="lucide-plus"
              :label="$q.screen.gt.xs ? 'Add Collaber' : 'Add'"
              class="flex-none!"
              outline
              rounded
              padding="2px 12px"
              @click="toggle"
            />
          </template>
        </AddCollaberDialog>
      </div>
      <SimpleInfo dense icon="lucide-users" text="No collaborators yet" v-if="!collaborators.length" />
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
              icon="lucide-ellipsis"
              color="white"
              item-name="collaber"
              dropdown-icon="none"
              :links="[
                {
                  show: project.isOwner,
                  icon: 'lucide-user-pen',
                  label: 'Edit Role',
                  color: 'primary',
                  click: () => collaberDialogRef.toggle(artist),
                },
                {
                  icon: 'lucide-user-lock',
                  label: 'Block',
                  color: 'red',
                  click: () => flag(artist.id, i),
                  loading: reporting,
                },
                {
                  show: project.isOwner,
                  icon: 'lucide-user-x',
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
      <q-separator class="my-8 md:my-12" v-if="project.isOwner" />
      <div class="text-center" v-if="project.isOwner">
        <ContentRemover
          outline
          rounded
          no-caps
          color="negative"
          icon="lucide-trash-2"
          label="Delete Project"
          class="flex-none!"
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
import { createReusableTemplate } from '@vueuse/core';
import { avatarFallback } from 'src/utils/imageFallback';
import ProjectTrackInfoDialog from 'src/components/Cards/ProjectTrackInfoDialog.vue';
import AddCollaberDialog from 'src/components/Cards/AddCollaberDialog.vue';
import ContentRemover from 'src/components/Utilities/ContentRemover.vue';
import HoverCard from 'src/components/Cards/HoverCard.vue';
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { useWatcher } from 'alova/client';
import { useMeta } from 'quasar';
import placeholder from 'src/assets/placeholder.svg';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { formatSeconds, intStr } from 'src/utils/helpers';
import { Project, Collaber, ProjectTrack } from 'src/utils/models';
import { loadProjectRequest } from 'src/utils/requests/requests';
import { computed, nextTick, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { collabRole } from 'src/utils/presets';
import { artistCredit } from 'src/utils/credits';
import {
  projectReleaseBlocker,
  projectReleaseLabel,
  projectReleaseLink,
} from 'src/utils/navigations';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import { requestFlagContent } from 'src/utils/requests/content';


const [DefineRelease, ReuseRelease] = createReusableTemplate();
const trackInfoDialogRef = ref();
defineOptions({
  async preFetch({ currentRoute, store }) {
    const boot = useBootstrapStore(store);

    if (currentRoute.params.project_id) {
      boot.pageData.current = {
        project: await loadProjectRequest(String(currentRoute.params.project_id), {
          with: 'tracks,collaborators,genre,artist',
        }).send(),
      };
    }
  },
});

const collaberDialogRef = ref();
const route = useRoute();
const user = computed(() => useBootstrapStore().user);
const curr = useBootstrapStore().pageData.current as { project?: Project };

const { data: project, loading } = useWatcher(
  () =>
    loadProjectRequest(route.params.project_id as string, {
      with: 'tracks,collaborators,genre,artist',
    }),
  [() => route.params.project_id],
  {
    middleware: (_, next) => (route.params.project_id ? next() : undefined),
    immediate: !curr.project?.id,
    initialData: {
      ...curr.project,
      collaboratorsCount: curr.project?.collaboratorsCount || 0,
      tracksCount: curr.project?.tracksCount || 0,
    },
  },
);

const trackList = ref<ProjectTrack[]>([]);
const editing = ref<ProjectTrack | null>(null);
const editDialogRef = ref<{ toggle: () => void } | null>(null);

/** Open a track's info, to change its title, genre, artist or privacy */
const editTrack = async (track: ProjectTrack) => {
  editing.value = track;
  await nextTick();
  editDialogRef.value?.toggle();
};

const updateTrack = (saved: ProjectTrack) => {
  const i = trackList.value.findIndex((track) => track.id === saved.id);
  if (i >= 0) trackList.value[i] = { ...trackList.value[i], ...saved };
};
const collaborators = ref<Collaber[]>([]);

watch(
  project,
  (p) => {
    trackList.value = p?.tracks ?? [];
    collaborators.value = p?.collaborators ?? [];
  },
  { immediate: true },
);

const releaseBlocker = computed(() => projectReleaseBlocker(project.value));

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
    titleTemplate: (title) => `Project: ${title} - Toneflix Music`,
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

<style scoped lang="scss">
.project-hero {
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid var(--tf-border);

  &__backdrop {
    position: absolute;
    inset: 0;
    background-size: cover;
    background-position: center;
    filter: blur(60px) saturate(1.3);
    opacity: 0.45;
    transform: scale(1.3);

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent, var(--tf-bg));
    }
  }

  &__stat {
    display: inline-flex;
    flex: none;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: var(--tf-radius-full);
    font-size: 13px;
    font-weight: 500;
    background: rgb(255 255 255 / 8%);
  }
}
</style>
