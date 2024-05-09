<template>
  <router-link
    class="block"
    :to="{
      name: 'artist.track',
      params: { artist_id: track.artist?.username, track_id: track.slug },
    }"
  >
    <q-card flat square class="w-32 bg-transparent cursor-pointer md:w-44">
      <q-avatar rounded class="!rounded-2xl w-32 h-32 md:w-44 md:h-44">
        <q-img
          no-spinner
          class="bg-gray-400"
          loading="eager"
          :ratio="1 / 1"
          :src="track.imageUrl"
        />
      </q-avatar>

      <q-card-section align="center" class="p-1">
        <h6
          class="!text-gray-300 text-md md:text-lg w-28 overflow-hidden text-nowrap text-ellipsis"
        >
          {{ track.title }}
        </h6>
        <div class="text-gray-400 text-subtitle2">{{ track.artist?.name }}</div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<script setup lang="ts">
import { Track } from 'src/utils/models';

const track = defineModel<Track>('track', {
  required: true,
});
</script>
