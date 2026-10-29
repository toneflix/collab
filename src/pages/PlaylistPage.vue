<template>
  <q-page padding>
    <BlockSkeleton v-if="loading && !playlist" />

    <template v-else-if="playlist">
      <div class="playlist-hero">
        <PlaylistArt class="flex-none!" :size="$q.screen.lt.sm ? '160px' : '220px'" :playlist="playlist" />

        <div class="min-w-0">
          <div class="flex items-center gap-1 text-sm text-fg-muted max-sm:justify-center">
            <q-icon :name="playlist.privacy === 'public' ? 'lucide-globe' : 'lucide-lock'" size="14px" class="flex-none!" />
            {{ playlist.privacy === 'public' ? 'Public playlist' : 'Private playlist' }}
          </div>
          <h1 class="mt-1 text-3xl font-bold break-words sm:text-5xl">{{ playlist.title }}</h1>
          <div class="mt-2 text-sm text-fg-muted">
            <router-link
              class="hover:underline"
              :to="{ name: 'user', params: { artist_id: playlist.owner.username } }"
              v-if="playlist.owner?.username"
            >
              {{ playlist.owner.name }}
            </router-link>
            <span v-if="playlist.owner"> • </span>{{ countStr(playlist.tracksCount, 'track') }}
          </div>
          <p class="mt-3 text-sm max-w-xl whitespace-pre-line" v-if="playlist.description">
            {{ playlist.description }}
          </p>

          <div class="flex items-center gap-2 mt-5 max-sm:justify-center">
            <q-btn
              round
              unelevated
              color="toneflix"
              size="lg"
              class="flex-none!"
              :disable="!tracks.length"
              :icon="playing ? 'lucide-pause:fill' : 'lucide-play:fill'"
              :aria-label="playing ? 'Pause' : 'Play'"
              @click="player.toggleQueue(tracks, source)"
            />
            <IconBtn icon="lucide-share-2" label="Share" @click="share" />
            <template v-if="playlist.owned">
              <IconBtn icon="lucide-pencil" label="Edit playlist" @click="formOpen = true" />
              <IconBtn icon="lucide-trash-2" label="Delete playlist" @click="remove" />
            </template>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-2 pt-6 sm:pt-8 md:grid-cols-2" v-if="tracks.length">
        <TrendingItem
          class="m-1"
          :key="track.id"
          :track="track"
          :queue="tracks"
          :source="source"
          :menu-context="menuContext"
          v-for="track in tracks"
        />
      </div>
      <SimpleInfo
        class="mt-8"
        icon="lucide-list-music"
        text="No songs yet. Pick Save to playlist from any song's menu."
        v-else-if="!loadingTracks"
      />

      <div class="flex justify-center mt-6" v-if="page < lastPage">
        <q-btn flat no-caps rounded class="flex-none!" label="Show more" :loading="loadingTracks" @click="loadTracks(page + 1)" />
      </div>

      <PlaylistFormDialog :playlist="playlist" v-model="formOpen" @saved="(saved) => Object.assign(playlist!, saved)" />
    </template>

    <OopsAlert text="This playlist doesn't exist, or it's private." v-else />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { copyToClipboard, useMeta, useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';
import OopsAlert from 'src/components/Alerts/OopsAlert.vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import TrendingItem from 'src/components/Cards/TrendingItem.vue';
import PlaylistArt from 'src/components/Playlists/PlaylistArt.vue';
import PlaylistFormDialog from 'src/components/Playlists/PlaylistFormDialog.vue';
import { usePlayerStore } from 'src/stores/player-store';
import { countStr, notify } from 'src/utils/helpers';
import {
  deletePlaylistRequest,
  loadPlaylistRequest,
  loadPlaylistTracksRequest,
} from 'src/utils/requests/playlists';
import type { Playlist, Track } from 'src/utils/models';
import type { TrackMenuContext } from 'src/utils/track-menu';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const player = usePlayerStore();

const slug = computed(() => String(route.params.playlist_id));
const source = computed(() => `playlist:${slug.value}`);
const playing = computed(() => player.isPlayingSource(source.value));

const playlist = ref<Playlist | null>(null);
const tracks = ref<Track[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(true);
const loadingTracks = ref(false);
const formOpen = ref(false);

useMeta(() => ({ title: playlist.value?.title ?? 'Playlist' }));

/** Owners can take songs out from each song's menu */
const menuContext = computed<TrackMenuContext | undefined>(() =>
  playlist.value?.owned
    ? {
        playlist: {
          slug: playlist.value.slug,
          title: playlist.value.title,
          removed: (track) => {
            tracks.value = tracks.value.filter((t) => t.id !== track.id);
            if (playlist.value) playlist.value.tracksCount = Math.max(0, playlist.value.tracksCount - 1);
          },
        },
      }
    : undefined,
);

const loadTracks = async (to = 1) => {
  loadingTracks.value = true;
  try {
    const { data, meta } = await loadPlaylistTracksRequest(slug.value, { page: to, limit: 50 }).send();
    tracks.value = to === 1 ? data : [...tracks.value, ...data];
    page.value = meta?.currentPage ?? to;
    lastPage.value = meta?.lastPage ?? to;
  } finally {
    loadingTracks.value = false;
  }
};

const load = async () => {
  loading.value = true;
  playlist.value = null;
  tracks.value = [];
  try {
    playlist.value = (await loadPlaylistRequest(slug.value).send()).data;
    await loadTracks(1);
  } catch {
    playlist.value = null;
  } finally {
    loading.value = false;
  }
};

const share = async () => {
  const url = window.location.href;

  if ($q.platform.is.mobile && navigator.share) {
    await navigator.share({ title: playlist.value?.title, url }).catch(() => undefined);
    return;
  }

  await copyToClipboard(url);
  notify(
    playlist.value?.privacy === 'private' ? 'Link copied. Only you can open it while the playlist is private.' : 'Link copied.',
    'success',
  );
};

const remove = () => {
  $q.dialog({
    dark: true,
    title: 'Delete playlist?',
    message: `"${playlist.value?.title}" will be gone for good. The songs stay where they are.`,
    cancel: { flat: true, noCaps: true, label: 'Cancel' },
    ok: { unelevated: true, noCaps: true, color: 'negative', label: 'Delete' },
  }).onOk(async () => {
    const { message } = await deletePlaylistRequest(slug.value).send();

    notify(message, 'success');
    void router.push({ name: 'library.playlists' });
  });
};

onMounted(load);
</script>

<style scoped lang="scss">
.playlist-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  text-align: center;

  @media (min-width: 600px) {
    flex-direction: row;
    align-items: flex-end;
    gap: 28px;
    text-align: left;
  }
}
</style>
