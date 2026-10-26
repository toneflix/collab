<template>
  <router-link class="song-card" :to="{ name: 'composition', params: { slug: song.slug } }">
    <div class="song-card__art">
      <img :src="song.imageUrl" :alt="song.title" loading="lazy" />
    </div>
    <div class="min-w-0">
      <div class="flex items-center gap-1 no-wrap">
        <span class="explicit !flex-none" title="Explicit" v-if="song.explicit">E</span>
        <span class="font-semibold truncate">{{ song.title }}</span>
      </div>
      <div class="text-xs truncate text-grey-5">{{ song.writer?.name }}</div>
    </div>
    <div class="song-card__excerpt" v-if="song.excerpt?.length">
      <div class="truncate" :key="n" v-for="(line, n) in song.excerpt">{{ line }}</div>
    </div>
    <div class="flex items-center gap-3 text-[11px] text-grey-6 no-wrap">
      <span class="flex items-center gap-1 !flex-none" v-if="song.forksCount">
        <q-icon name="lucide-git-fork" size="12px" />
        {{ song.forksCount }}
      </span>
      <span class="!flex-none" v-if="song.bpm">{{ song.bpm }} BPM</span>
      <span class="!flex-none" v-if="song.key">{{ song.key }}</span>
      <span class="truncate" v-if="song.mood">{{ song.mood }}</span>
    </div>
  </router-link>
</template>

<script setup lang="ts">
import type { PublicSong } from 'src/utils/requests/composer';

defineProps<{ song: PublicSong }>();
</script>

<style lang="scss" scoped>
.song-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  padding: 10px;
  color: inherit;
  text-decoration: none;
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  background: #15171c;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(3, 191, 255, 0.45);
  }

  &__art {
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 10px;
    background: #1f2229;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__excerpt {
    font-size: 12px;
    font-style: italic;
    line-height: 1.5;
    color: #c9ccd3;
  }
}

.explicit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #121212;
  font-size: 10px;
  font-weight: 700;
  border-radius: 3px;
  background: #b3b3b3;
}
</style>
