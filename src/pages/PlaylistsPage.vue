<template>
  <q-page padding>
    <ChipNav label="Library" :links="libraryLinks" />

    <div class="flex items-center justify-between gap-3 mb-4 flex-nowrap!">
      <h1 class="text-2xl font-bold">Your playlists</h1>
      <q-btn
        unelevated
        no-caps
        rounded
        color="toneflix"
        class="flex-none!"
        icon="lucide-plus"
        label="New playlist"
        @click="formOpen = true"
      />
    </div>

    <ListSkeleton avatar="square" :rows="4" v-if="loading && !playlists.length" />

    <SimpleInfo
      icon="lucide-list-music"
      text="No playlists yet. Make one here, or pick Save to playlist from any song's menu."
      v-else-if="!playlists.length"
    />

    <div class="playlists-grid" v-else>
      <PlaylistCard :key="playlist.id" :playlist="playlist" v-for="playlist in playlists" />
    </div>

    <div class="flex justify-center mt-6" v-if="page < lastPage">
      <q-btn flat no-caps rounded class="flex-none!" label="Show more" :loading="loading" @click="load(page + 1)" />
    </div>

    <PlaylistFormDialog v-model="formOpen" @saved="opened" v-if="mounted" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import ChipNav from 'src/components/Controllers/ChipNav.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import PlaylistCard from 'src/components/Playlists/PlaylistCard.vue';
import PlaylistFormDialog from 'src/components/Playlists/PlaylistFormDialog.vue';
import { libraryChipLinks } from 'src/utils/navigations';
import { loadMyPlaylistsRequest } from 'src/utils/requests/playlists';
import type { Playlist } from 'src/utils/models';

const router = useRouter();

const libraryLinks = computed(() => libraryChipLinks('playlists'));

const playlists = ref<Playlist[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(true);
const formOpen = ref(false);
/** The form uses a bottom sheet on phones, which only renders in the browser */
const mounted = ref(false);

const load = async (to = 1) => {
  loading.value = true;
  try {
    const { data, meta } = await loadMyPlaylistsRequest({ page: to, limit: 30 }).send();
    playlists.value = to === 1 ? data : [...playlists.value, ...data];
    page.value = meta?.currentPage ?? to;
    lastPage.value = meta?.lastPage ?? to;
  } finally {
    loading.value = false;
  }
};

const opened = (playlist: Playlist) => {
  void router.push({ name: 'playlist', params: { playlist_id: playlist.slug } });
};

onMounted(() => {
  mounted.value = true;
  void load();
});
</script>

<style scoped lang="scss">
.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px 16px;
}
</style>
