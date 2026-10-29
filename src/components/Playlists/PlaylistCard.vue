<template>
  <router-link class="block playlist-card" :to="{ name: 'playlist', params: { playlist_id: playlist.slug } }">
    <div class="playlist-card__art">
      <q-img no-spinner :ratio="1" :src="playlist.imageUrl" v-if="playlist.imageUrl" />
      <q-icon name="lucide-list-music" size="48px" v-else />
    </div>
    <div class="mt-2 font-semibold truncate">{{ playlist.title }}</div>
    <div class="flex items-center gap-1 text-sm text-fg-muted flex-nowrap!">
      <q-icon class="flex-none!" size="14px" name="lucide-lock" v-if="playlist.privacy === 'private'" />
      <span class="truncate">{{ countStr(playlist.tracksCount, 'track') }}</span>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import { countStr } from 'src/utils/helpers';
import type { Playlist } from 'src/utils/models';

defineProps<{ playlist: Playlist }>();
</script>

<style scoped lang="scss">
.playlist-card__art {
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: var(--tf-radius-xl);
  background: var(--tf-surface-3);
  color: var(--tf-text-muted);

  > * {
    width: 100%;
  }

  > .q-icon {
    width: auto;
  }
}
</style>
