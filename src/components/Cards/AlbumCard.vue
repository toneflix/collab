<template>
  <router-link
    class="block mx-auto md:w-44"
    :class="{ 'w-24 sm:w-28': dense, 'w-28 sm:w-32': !dense }"
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
        :class="{ 'w-24 h-24 sm:w-28 sm:h-28': dense, 'w-28 h-28 sm:w-32 sm:h-32': !dense }"
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
          class="text-gray-300! text-sm sm:text-base md:text-lg w-full md:w-40 overflow-hidden text-nowrap text-ellipsis"
        >
          {{ album.title }}
        </h6>
        <div class="text-gray-400 text-subtitle2">
          {{ countStr(album.tracksCount, 'Track') }}
          <span class="flex-none!">•</span>
          {{ formatSeconds(album.duration) }}
        </div>
      </q-card-section>
    </q-card>
  </router-link>
</template>

<script setup lang="ts">
import { countStr, formatSeconds } from 'src/utils/helpers';
import { Album } from 'src/utils/models';
import { PropType } from 'vue';

const emit = defineEmits<{
  scrollEnd: [value: boolean];
}>();

const props = defineProps({
  dense: Boolean,
  isLast: Boolean,
  album: {
    type: Object as PropType<Album>,
    required: true,
  },
});

const onIntersect = (evt: IntersectionObserverEntry): void => {
  if (props.isLast && evt.isIntersecting) {
    emit('scrollEnd', true);
  }
};
</script>
