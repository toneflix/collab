<template>
  <MoreMenu>
    <template #header>
      <MenuHeader round :title="artist.name" caption="Artist" :image-url="artist.imageUrl" />
    </template>

    <q-list dark class="track-menu-list">
      <TrackMenuItem icon="lucide-radio" label="Start mix" @click="startMix" />
      <TrackMenuItem icon="lucide-list-start" label="Play next" @click="playNext" />
      <TrackMenuItem icon="lucide-list-end" label="Add to queue" @click="addToQueue" />
      <TrackMenuItem icon="lucide-share-2" label="Share" @click="share" />
    </q-list>
  </MoreMenu>
</template>

<script setup lang="ts">
import { usePlayerStore } from 'src/stores/player-store';
import { countStr, notify } from 'src/utils/helpers';
import { loadTracksRequest } from 'src/utils/requests/requests';
import { shareLink } from 'src/utils/share';
import type { Artist, Track } from 'src/utils/models';
import MoreMenu from './MoreMenu.vue';
import MenuHeader from './MenuHeader.vue';
import TrackMenuItem from 'src/components/Tracks/TrackMenuItem.vue';

/**
 * The ⋮ menu on an artist page. Queue actions use the first page of the
 * artist's songs, the same list the page plays.
 */
const props = defineProps<{ artist: Artist }>();

const PAGE_SIZE = 30;

const player = usePlayerStore();

const songs = async (): Promise<Track[]> => {
  const { data } = await loadTracksRequest({ artist_id: props.artist.username, limit: PAGE_SIZE }).send();

  if (!data.length) notify(`${props.artist.name} has no songs yet.`, 'info');

  return data;
};

const startMix = async () => {
  const [first] = await songs();
  if (first) void player.startMix(first);
};

const playNext = async () => {
  const tracks = await songs();
  if (!tracks.length) return;

  const queued = player.playNext(...tracks);
  notify(`${countStr(queued, 'song')} playing next.`, 'success');
};

const addToQueue = async () => {
  const tracks = await songs();
  if (!tracks.length) return;

  const queued = player.addToQueue(...tracks);
  notify(`${countStr(queued, 'song')} added to queue.`, 'success');
};

const share = () => shareLink(props.artist.name, window.location.href);
</script>
