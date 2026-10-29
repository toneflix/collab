<template>
  <q-page padding>
    <div class="relative" v-if="artist?.id">
      <div
        class="absolute top-0 bottom-0 left-0 right-0 bg-center bg-cover h-72 bg-slate-500"
        :class="artist.coverUrl ? 'cover-photo' : 'blur-3xl'"
        :style="{
          backgroundImage: `url(${artist.coverUrl || artist.imageUrl})`,
        }"
      ></div>
      <div class="relative flex flex-col items-center w-full sm:flex-row sm:items-stretch">
        <AtroposViewer
          class="flex-none! w-36 h-36 sm:w-48 sm:h-48 md:h-72 md:w-72"
          :main-image="artist.imageUrl"
        >
          <template #button>
            <q-btn
              round
              color="dark-opaque"
              :size="$q.screen.lt.sm ? 'lg' : 'xl'"
              class="flex-none! opacity-90"
              :icon="playing ? 'lucide-pause:fill' : 'lucide-play:fill'"
              @click="togglePlay"
            />
          </template>
        </AtroposViewer>
        <div class="flex flex-row items-center justify-center flex-1 w-full min-w-0 pt-4 text-center sm:justify-start sm:p-5 sm:text-left">
          <div class="min-w-0">
            <h6 class="text-sm">
              <q-icon
                name="lucide-badge-check"
                color="toneflix"
                v-if="artist.verified"
              />
              {{ artist.verified ? 'Verified Artist' : 'Artist' }}
            </h6>

            <h1 class="text-3xl sm:text-4xl md:text-5xl font-circlular-std break-words">
              {{ artist?.name }}
            </h1>

            <div
              class="flex flex-row items-center justify-center gap-2 font-semibold sm:justify-start"
            >
              <span class="flex-none!">
                <ToggleFollow
                  :following="artist.youFollow"
                  :base-url="`artists/${artist.id}`"
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
              <span class="flex-none!">
                {{ intStr(artist.followers) }} Followers
              </span>
              <span class="flex-none!">•</span>
              <span class="flex-none!">
                {{ intStr(artist.reputation) }} Reps.
              </span>
              <span class="flex-none!" v-if="artist.canEdit">
                <q-btn
                  no-caps
                  rounded
                  outline
                  padding="6px 16px"
                  icon="lucide-pen"
                  label="Edit profile"
                  @click="editing = true"
                />
              </span>
              <span class="flex-none!" v-if="artist.canVoice">
                <q-btn
                  no-caps
                  rounded
                  outline
                  padding="6px 16px"
                  icon="lucide-audio-lines"
                  label="Voice"
                  @click="voicing = true"
                />
              </span>
              <span class="flex-none!" v-else-if="artist.claimable && artist.yourClaim?.status !== 'pending'">
                <q-btn
                  no-caps
                  rounded
                  outline
                  padding="6px 16px"
                  icon="lucide-id-card"
                  label="Claim this artist"
                  @click="claimDialog?.open()"
                />
                <q-tooltip>Manage this artist? Claim the profile to edit it and manage the catalogue.</q-tooltip>
              </span>
              <span class="flex-none!">
                <ArtistMenu :artist="artist" />
              </span>
            </div>
            <p class="block mt-4 text-sm sm:mt-8 max-w-96 max-sm:mx-auto">
              {{ artist.about }}
            </p>
            <div class="claim-status" v-if="artist.claimable && artist.yourClaim">
              <template v-if="artist.yourClaim.status === 'pending'">
                <q-icon name="lucide-hourglass" color="orange-5" class="flex-none!" />
                <span>Your claim is being reviewed. We'll let you know when a moderator decides.</span>
              </template>
              <template v-else-if="artist.yourClaim.status === 'rejected'">
                <q-icon name="lucide-circle-x" color="red-5" class="flex-none!" />
                <span>
                  Your claim was declined<template v-if="artist.yourClaim.reviewNote">: {{ artist.yourClaim.reviewNote }}</template>.
                  You can send a new one with more proof.
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="grid grid-cols-5 gap-x-3 gap-y-3 pt-6 sm:pt-8" v-if="artist?.id">
      <div class="col-span-5" v-if="artist.type === 'user'">
        <ProjectList
          :categories="[
            {
              id: 'projects',
              slug: 'projects',
              title: 'Projects',
            },
          ]"
        />
      </div>
      <div class="col-span-5">
        <TrackList
          hide-all-link
          v-model:categories="categories.tracks"
          :params="{ limit: 30 }"
        />
      </div>
      <div class="col-span-5">
        <AlbumList
          hide-all-link
          v-model:categories="categories.albums"
          :params="{ limit: 30, filters: 'album' }"
        />
      </div>
    </div>
    <ArtistEditDialog
      v-model="editing"
      :artist="artist"
      @saved="(e) => (artist = { ...artist, ...e })"
      v-if="artist?.canEdit"
    />
    <ArtistVoiceDialog v-model="voicing" :artist-id="artist.id" v-if="artist?.canVoice" />
    <ArtistClaimDialog
      ref="claimDialog"
      :artist="artist"
      @claimed="(claim) => (artist = { ...artist, yourClaim: claim })"
      v-if="artist?.claimable"
    />
    <OopsAlert
      text="This artist is not home now, you may check back later..."
      v-else-if="!loading"
    />
  </q-page>
</template>

<script setup lang="ts">
import { emptyPage, missing } from 'src/utils/requests/prefetch';
import TrackList from 'src/components/Showcase/TrackList.vue';
import ProjectList from 'src/components/Showcase/ProjectList.vue';
import AlbumList from 'src/components/Showcase/AlbumList.vue';
import AtroposViewer from 'src/components/Controllers/AtroposViewer.vue';
import {
  Artist,
  Category,
  PageMeta,
  Release,
  Track,
} from 'src/utils/models';
import { useRoute } from 'vue-router';
import { intStr } from 'src/utils/helpers';
import { useMeta } from 'quasar';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import {
  loadArtistRequest,
  loadReleasesRequest,
  loadTracksRequest,
} from 'src/utils/requests/requests';
import { useRequest } from 'alova/client';
import { computed, ref } from 'vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import ToggleFollow from 'src/components/Utilities/ToggleFollow.vue';
import ArtistEditDialog from 'src/components/Artists/ArtistEditDialog.vue';
import ArtistClaimDialog from 'src/components/Artists/ArtistClaimDialog.vue';
import ArtistVoiceDialog from 'src/components/Artists/ArtistVoiceDialog.vue';
import { usePlayerStore } from 'src/stores/player-store';
import ArtistMenu from 'src/components/Menus/ArtistMenu.vue';

defineOptions({
  async preFetch({ store, currentRoute }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.artist_id);

    const [artist, { data: tracks, meta: tracksMeta }, { data: features, meta: featuresMeta }, { data: releases, meta: rMeta }] = await Promise.all([
      loadArtistRequest(id, {}, true).send().catch(missing),
      loadTracksRequest({
        artist_id: id,
        limit: 30,
      }).send().catch(emptyPage),
      loadTracksRequest({
        artist_id: id,
        filters: 'features',
        limit: 30,
      }).send().catch(emptyPage),
      loadReleasesRequest({
        artist_id: id,
        limit: 30,
      }).send().catch(emptyPage),
    ]);

    boot.pageData.current = {
      artist,
      tracks,
      features,
      releases,
      tracksMeta,
      featuresMeta,
      lastReleaseMeta: rMeta,
    };
  },
});

const route = useRoute();
const player = usePlayerStore();
const playing = computed(() => player.isPlayingSource(route.fullPath));

const current = useBootstrapStore().pageData.current as unknown as {
  artist: Artist;
  tracks: Track[];
  features: Track[];
  releases: Release[];
  tracksMeta: Partial<PageMeta>;
  featuresMeta: Partial<PageMeta>;
  lastReleaseMeta: Partial<PageMeta>;
};

const categories = ref({
  albums: <Category<Release>[]>[
    {
      id: 'albums',
      slug: 'albums',
      title: 'Albums',
      data: { list: current.releases, meta: current.lastReleaseMeta },
      params: { artist_id: route.params.artist_id },
    },
  ],
  tracks: <Category<Track>[]>[
    {
      id: 'top-songs',
      slug: 'top-songs',
      title: 'Top Songs',
      data: { list: current.tracks, meta: current.tracksMeta },
      params: { artist_id: route.params.artist_id },
    },
    {
      id: 'features',
      slug: 'features',
      title: 'Features',
      data: { list: current.features, meta: current.featuresMeta },
      params: { artist_id: route.params.artist_id, filters: 'features' },
    },
  ],
});

const { data: artist, loading } = useRequest(
  () => loadArtistRequest(route.params.artist_id as string, {}, true),
  {
    immediate: false,
    initialData: current.artist,
  },
);

const editing = ref(false);
const voicing = ref(false);
const claimDialog = ref<InstanceType<typeof ArtistClaimDialog> | null>(null);

const togglePlay = () => {
  if (current.tracks.length) {
    player.toggleQueue(current.tracks, route.fullPath);
  }
};

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

<style scoped>
.claim-status {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 0.5rem;
  max-width: 28rem;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.8rem;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.35);
}

.cover-photo::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.15), rgba(0, 0, 0, 0.75));
}
</style>
