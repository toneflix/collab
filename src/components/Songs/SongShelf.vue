<template>
  <div class="shelf">
    <PublicSongCard class="shelf__item" :key="song.id" :song="song" v-for="song in songs" />
  </div>
</template>

<script setup lang="ts">
import PublicSongCard from 'src/components/Songs/PublicSongCard.vue';
import type { PublicSong } from 'src/utils/requests/composer';

defineProps<{ songs: PublicSong[] }>();
</script>

<style lang="scss" scoped>
.shelf {
  display: grid;
  width: 100%;
  min-width: 0;
  contain: inline-size;
  grid-auto-columns: 184px;
  grid-auto-flow: column;
  gap: 14px;
  padding-bottom: 6px;
  overflow-x: auto;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;

  @media (max-width: 599px) {
    grid-auto-columns: 150px;
    gap: 10px;
  }

  &__item {
    scroll-snap-align: start;
  }
}
</style>
