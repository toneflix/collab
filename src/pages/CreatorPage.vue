<template>
  <q-page padding>
    <div class="relative xs:min-h-16 sm:min-h-full" v-if="artist?.id">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center h-72 bg-slate-500 blur-3xl"
        :style="{
          backgroundImage: `url(${artist.imageUrl})`,
        }"
      ></div>
      <div class="absolute flex justify-center md:!justify-start w-full">
        <AtroposViewer
          class="!flex-none w-48 h-48 md:h-72 md:w-72"
          :main-image="artist.imageUrl"
        >
        </AtroposViewer>
        <div class="flex flex-row items-center justify-start flex-1 p-5">
          <div>
            <h6 class="text-sm">
              <q-icon
                name="lucide-badge-check"
                color="toneflix"
                v-if="artist.verified"
              />
              {{ artist.verified ? 'Verified Creator' : 'Artist' }}
              <PremiumBadge class="ml-1" v-if="artist.badge" />
            </h6>

            <h1 class="text-4xl md:text-5xl font-circlular-std break-words">
              {{ artist?.name }}
            </h1>

            <div
              class="flex flex-row items-center justify-start gap-2 font-semibold"
            >
              <span class="!flex-none">
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
                    dense
                    no-caps
                    rounded
                    unelevated
                    size="sm"
                    padding="0 sm"
                    :icon="following ? undefined : 'lucide-plus'"
                    :label="following ? 'Unfollow' : 'Follow'"
                    :color="following ? 'primary' : undefined"
                    @click="submit"
                  />
                </ToggleFollow>
              </span>
              <span class="!flex-none" v-if="artist.type === 'user' && !isMe">
                <TipDialog :creator="artist" v-if="artist.acceptsTips !== false" />
              </span>
              <span class="!flex-none" v-if="artist.type === 'user' && !isMe">
                <ReportDialog type="user" label="account" :id="artist.id" />
              </span>
              <span class="!flex-none">
                {{ intStr(artist.followers) }} Followers
              </span>
              <span class="!flex-none">•</span>
              <span class="!flex-none">
                {{ intStr(artist.reputation) }} Reps.
              </span>
            </div>
            <p class="block mt-8 text-sm max-w-96">
              {{ artist.about }}
            </p>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3 pt-80" v-if="artist?.id">
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

    const artist = await loadUserRequest(id, { with: 'tracks' }).send();

    const { data: projects, meta: projectsMeta } = await loadProjectsRequest(
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
        titleTemplate: (title) => `${title} - Toneflix Collab`,
        meta: {
          description: {
            name: 'description',
            content: artist.value.name + ' on Toneflix Collab',
          },
          ogImage: { property: 'og:image', content: artist.value.imageUrl },
          ogTitle: { property: 'og:title', content: artist.value.name },
          ogDescription: {
            property: 'og:description',
            content: artist.value.name + ' on Toneflix Collab',
          },
        },
      }
    : { title: 'Not found' };
});
</script>
