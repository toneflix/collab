<template>
  <router-link
    class="block"
    :to="{
      name: 'explore',
      query: {
        genre: genre.slug,
        origin: encodeURIComponent($router.resolve({ name: 'genres' }).href),
      },
    }"
  >
    <q-card
      flat
      square
      class="relative overflow-hidden bg-transparent cursor-pointer !rounded-2xl md:w-44 w-32 h-32 md:h-44 border-4 border-solid border-white hover:scale-105 transition-all"
    >
      <q-avatar rounded class="w-32 h-32 md:w-44 md:h-44">
        <q-img
          no-spinner
          class="bg-gray-400"
          loading="eager"
          :ratio="1 / 1"
          :src="genre.imageUrl"
        />
      </q-avatar>

      <div
        class="absolute top-0 bottom-0 left-0 right-0 opacity-90 bg-dark"
      ></div>

      <q-card-section
        class="absolute top-0 bottom-0 left-0 right-0 z-10 flex items-center justify-center p-2"
      >
        <h1 class="text-3xl text-center font-circlular-std">
          {{ genre.title }}
        </h1>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<script setup lang="ts">
import { Genre } from 'src/utils/models';

const genre = defineModel<Genre>('genre', {
  required: true,
});
</script>
