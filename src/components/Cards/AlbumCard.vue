<template>
  <router-link
    class="block mx-auto md:w-44"
    :class="{ 'w-28': dense, 'w-32': !dense }"
    :to="{
      name: 'artist.album',
      params: { album_id: album.slug, artist_id: album.artist?.username },
    }"
    v-intersection="onIntersect"
  >
    <q-card flat square class="w-full bg-transparent cursor-pointer">
      <q-avatar
        round
        class="md:w-44 md:h-44"
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
          class="!text-gray-300 text-md md:text-lg w-28 md:w-40 overflow-hidden text-nowrap text-ellipsis"
        >
          {{ album.title }}
        </h6>
        <div class="text-gray-400 text-subtitle2">
          {{ album.tracksCount }} Tracks
          <span class="!flex-none">•</span>
          {{ formatSeconds(album.duration) }}
        </div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<script setup lang="ts">
import { formatSeconds } from 'src/utils/helpers';
import { Album } from 'src/utils/models';

const emit = defineEmits<{
  scrollEnd: [value: boolean];
}>();

const props = defineProps({
  dense: Boolean,
  isLast: Boolean,
});

const album = defineModel<Album>('album', {
  required: true,
});

const onIntersect = (evt: IntersectionObserverEntry): boolean => {
  if (props.isLast && evt.isIntersecting) {
    emit('scrollEnd', true);
  }
  return true;
};
</script>
