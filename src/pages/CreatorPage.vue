<template>
  <q-page padding>
    <div class="relative" v-if="artist?.id">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{
          backgroundImage: `url(${artist.imageUrl})`,
        }"
      ></div>
      <div class="relative flex flex-col items-center w-full sm:flex-row sm:items-stretch">
        <AtroposViewer
          class="flex-none! w-36 h-36 sm:w-48 sm:h-48 md:h-72 md:w-72"
          :main-image="artist.imageUrl"
        >
        </AtroposViewer>
        <div class="flex flex-row items-center justify-center flex-1 w-full min-w-0 pt-4 text-center sm:justify-start sm:p-5 sm:text-left">
          <div class="min-w-0">
            <h6 class="text-sm">
              <q-icon
                name="lucide-badge-check"
                color="toneflix"
                v-if="artist.verified"
              />
              {{ artist.verified ? 'Verified creator' : artist.projectsCount ? 'Creator' : 'Member' }}
              <PremiumBadge class="ml-1" v-if="artist.badge" />
            </h6>

            <h1 class="text-3xl sm:text-4xl md:text-5xl font-circlular-std break-words">
              {{ artist?.name }}
            </h1>

            <div
              class="flex flex-row items-center justify-center gap-2 font-semibold sm:justify-start"
            >
              <span class="flex-none!" v-if="!isMe">
                <ToggleFollow
                  :following="artist.youFollow"
                  :base-url="`users/${artist.id}`"
                  @done="
                    (e) => {
                      artist.followers = e.followers;
                      artist.reputation = e.reputation;
                    }
                  "
                  v-slot="{ submit, following }"
                >
                  <q-btn
                    no-caps
                    rounded
                    unelevated
                    padding="6px 16px"
                    :outline="following"
                    :icon="following ? undefined : 'lucide-plus'"
                    :label="following ? 'Unfollow' : 'Follow'"
                    :color="following ? undefined : 'primary'"
                    @click="submit"
                  />
                </ToggleFollow>
              </span>
              <span class="flex-none!" v-if="artist.type === 'user' && !isMe">
                <TipDialog :creator="artist" v-if="artist.acceptsTips !== false" />
              </span>
              <span class="flex-none!" v-if="artist.type === 'user' && !isMe">
                <ReportDialog type="user" label="account" :id="artist.id" />
              </span>
              <span class="flex-none!">
                {{ intStr(artist.followers) }} Followers
              </span>
              <span class="flex-none!">•</span>
              <span class="flex-none!">
                {{ intStr(artist.reputation) }} Reps.
              </span>
              <q-btn
                outline
                rounded
                no-caps
                padding="6px 16px"
                icon="lucide-pen"
                label="Edit profile"
                class="flex-none!"
                :to="{ name: 'account.settings' }"
                v-if="isMe"
              />
            </div>
            <p class="block mt-4 text-sm sm:mt-8 max-w-96 max-sm:mx-auto">
              {{ artist.about }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3 pt-6 sm:pt-8" v-if="artist?.id">
      <div class="col-span-5" v-if="artist.type === 'user'">
        <ProjectList
          hide-all-link
          vertical-list
          v-model:categories="categories.projects"
        />
      </div>
    </div>
    <OopsAlert
      text="This creator is not home now, you may check back later..."
      v-else-if="!loading"
    />
  </q-page>
</template>

<script setup lang="ts">
import { emptyPage, missing } from 'src/utils/requests/prefetch';
import ProjectList from 'src/components/Showcase/ProjectList.vue';
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import { Artist, Category, PageMeta, Project } from 'src/utils/models';
import { useRoute } from 'vue-router';
import { intStr } from 'src/utils/helpers';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadArtistRequest,
  loadProjectsRequest,
  loadUserRequest,
} from 'src/utils/requests/requests';
import { useWatcher } from 'alova/client';
import { computed, ref } from 'vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import ToggleFollow from 'src/components/Utilities/ToggleFollow.vue';
import TipDialog from 'src/components/Payments/TipDialog.vue';
import ReportDialog from 'src/components/Moderation/ReportDialog.vue';
import PremiumBadge from 'src/components/Payments/PremiumBadge.vue';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.artist_id);

    const artist = await loadUserRequest(id, { with: 'tracks' }).send().catch(missing);

    const { data: projects, meta: projectsMeta } = !artist ? emptyPage() : await loadProjectsRequest(
      {
        creator_id: artist.id,
        limit: 30,
      },
      true,
    ).send();

    boot.pageData.current = {
      artist,
      projects,
      projectsMeta,
    };
  },
});

const route = useRoute();
const current = useBootstrapStore().pageData.current as {
  artist: Artist;
  projects: Project[];
  projectsMeta: Partial<PageMeta>;
};

const categories = ref({
  projects: <Category<Project>[]>[
    {
      id: 'projects',
      slug: 'projects',
      title: 'All Projects',
      data: { list: current.projects, meta: current.projectsMeta },
      params: { creator_id: route.params.artist_id },
    },
  ],
});

const { data: artist, loading } = useWatcher(
  () =>
    loadArtistRequest(
      route.params.artist_id as string,
      { with: 'tracks' },
      true,
    ),
  [() => route.params.artist_id],
  {
    middleware: (_, next) => (route.params.artist_id ? next() : undefined),
    immediate: false,
    initialData: current.artist || {},
  },
);

const boot = useBootstrapStore();
const isMe = computed(() => !!boot.user.id && boot.user.id === artist.value.id);

useMeta(() => {
  return artist.value
    ? {
        title: artist.value.name,
        titleTemplate: (title) => `${title} - Toneflix Music`,
        meta: {
          description: {
            name: 'description',
            content: artist.value.name + ' on Toneflix Music',
          },
          ogImage: { property: 'og:image', content: artist.value.imageUrl },
          ogTitle: { property: 'og:title', content: artist.value.name },
          ogDescription: {
            property: 'og:description',
            content: artist.value.name + ' on Toneflix Music',
          },
        },
      }
    : { title: 'Not found' };
});
</script>
