<template>
  <router-link
    class="block mx-auto md:w-44"
    :class="{ 'w-28': dense, 'w-32': !dense }"
    :to="{
      name: 'artist',
      params: { artist_id: creator.username },
    }"
  >
    <q-card flat square class="w-full bg-transparent cursor-pointer">
      <q-avatar
        round
        class="!rounded-full md:w-44 md:h-44"
        :class="{ 'w-28 h-28': dense, 'w-32 h-32': !dense }"
      >
        <q-img
          no-spinner
          class="bg-gray-400"
          loading="eager"
          :ratio="1 / 1"
          :src="creator.imageUrl"
        />
      </q-avatar>

      <q-card-section align="left" class="p-1">
        <h6
          class="!text-gray-300 text-md md:text-lg w-28 overflow-hidden text-nowrap text-ellipsis"
        >
          <q-icon
            name="verified"
            color="toneflix"
            class="verified-badge"
            v-if="creator.verified"
          />
          {{ creator.name }}
        </h6>
        <div class="text-gray-400 text-subtitle2">
          {{ creator.projects_count }} Projects
          <span class="!flex-none">•</span>
          {{ creator.reputation }} Reps.
        </div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<script setup lang="ts">
import { Artist } from 'src/utils/models';

defineProps({
  dense: Boolean,
});

const creator = defineModel<Artist>('creator', {
  required: true,
});
</script>
