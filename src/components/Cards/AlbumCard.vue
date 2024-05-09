<template>
  <router-link
    class="block mx-auto md:w-44"
    :class="{ 'w-28': dense, 'w-32': !dense }"
    :to="{
      name: 'artist.album',
      params: { album_id: album.slug, artist_id: album.artist?.username },
    }"
  >
    <q-card flat square class="w-full bg-transparent cursor-pointer">
      <q-avatar
        round
        class="!rounded-2xl md:w-44 md:h-44"
        :class="{ 'w-28 h-28': dense, 'w-32 h-32': !dense }"
      >
        <q-img
          no-spinner
          class="bg-gray-400"
          loading="eager"
          :ratio="1 / 1"
          :src="album.imageUrl"
        />
      </q-avatar>

      <q-card-section align="left" class="p-1">
        <h6
          class="!text-gray-300 text-md md:text-lg w-28 overflow-hidden text-nowrap text-ellipsis"
        >
          {{ album.title }}
        </h6>
        <div class="text-gray-400 text-subtitle2">
          {{ album.tracks_count }} Tracks
          <span class="!flex-none">•</span>
          {{ album.duration }}:00
        </div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<script setup lang="ts">
import { Album } from 'src/utils/models';

defineProps({
  dense: Boolean,
});

const album = defineModel<Album>('album', {
  required: true,
});
</script>
