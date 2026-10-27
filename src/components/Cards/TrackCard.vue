<template>
  <router-link
    class="block"
    :to="{
      name: 'artist.track',
      params: {
        artist_id: track.artist?.username || track.artistId || '---',
        track_id: track.slug,
      },
    }"
    v-intersection="onIntersect"
  >
    <q-card flat square class="w-28 bg-transparent cursor-pointer sm:w-32 md:w-44">
      <q-avatar rounded class="rounded-2xl! w-28 h-28 sm:w-32 sm:h-32 md:w-44 md:h-44">
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
          class="text-gray-300! text-sm sm:text-base md:text-lg w-full md:w-40 overflow-hidden text-nowrap text-ellipsis"
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

const emit = defineEmits<{
  scrollEnd: [value: boolean];
}>();

const props = defineProps({
  dense: Boolean,
  isLast: Boolean,
});

const track = defineModel<Track>('track', {
  required: true,
});

const onIntersect = (evt: IntersectionObserverEntry): void => {
  if (props.isLast && evt.isIntersecting) {
    emit('scrollEnd', true);
  }
};
</script>
