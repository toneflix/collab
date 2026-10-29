<template>
  <MoreMenu>
    <template #header>
      <MenuHeader :title="release.title" :caption="release.artist?.name" :image-url="release.imageUrl" />
    </template>

    <q-list dark class="track-menu-list">
      <template v-if="playable.length">
        <TrackMenuItem icon="lucide-radio" label="Start mix" @click="startMix" />
        <TrackMenuItem icon="lucide-list-start" label="Play next" @click="playNext" />
        <TrackMenuItem icon="lucide-list-end" label="Add to queue" @click="addToQueue" />
      </template>
      <TrackMenuItem icon="lucide-user" label="Go to artist" :to="artistLink" v-if="artistLink" />
      <TrackMenuItem icon="lucide-share-2" label="Share" @click="share" />
    </q-list>
  </MoreMenu>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from 'src/stores/player-store';
import { countStr, notify } from 'src/utils/helpers';
import { shareLink } from 'src/utils/share';
import type { Release } from 'src/utils/models';
import MoreMenu from './MoreMenu.vue';
import MenuHeader from './MenuHeader.vue';
import TrackMenuItem from 'src/components/Tracks/TrackMenuItem.vue';

/**
 * The ⋮ menu on an album page: queue the album, start a mix from it, share it.
 */
const props = defineProps<{ release: Release }>();

const player = usePlayerStore();

/** Locked albums play only once bought */
const playable = computed(() => (props.release.locked ? [] : (props.release.tracks ?? [])));

const artistLink = computed(() =>
  props.release.artist?.username
    ? { name: 'artist', params: { artist_id: props.release.artist.username } }
    : null,
);

const startMix = () => {
  void player.startMix(playable.value[0]!);
};

const playNext = () => {
  const queued = player.playNext(...playable.value);
  notify(`${countStr(queued, 'song')} playing next.`, 'success');
};

const addToQueue = () => {
  const queued = player.addToQueue(...playable.value);
  notify(`${countStr(queued, 'song')} added to queue.`, 'success');
};

const share = () => shareLink(props.release.title, window.location.href);
</script>
