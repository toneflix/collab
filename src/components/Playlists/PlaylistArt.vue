<template>
  <q-avatar rounded class="playlist-art" :size="size">
    <q-img no-spinner :ratio="1" :src="playlist.imageUrl" v-if="playlist.imageUrl" />
    <q-icon name="lucide-list-music" :size="iconSize" v-else />
  </q-avatar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Playlist } from 'src/utils/models';

/**
 * A playlist's cover: its first track's artwork, or a list icon while it's empty.
 */
const props = withDefaults(defineProps<{ playlist: Pick<Playlist, 'imageUrl'>; size?: string }>(), {
  size: '48px',
});

const iconSize = computed(() => `calc(${props.size} * 0.42)`);
</script>

<style scoped lang="scss">
.playlist-art {
  background: var(--tf-surface-3);
  color: var(--tf-text-muted);
}
</style>
