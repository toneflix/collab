<template>
  <div class="w-32 md:w-44" v-intersection="onIntersect">
    <GenreTile
      size="fill"
      :genre="genre"
      :to="{
        name: 'explore',
        query: {
          genre: genre.slug,
          origin: encodeURIComponent($router.resolve({ name: 'genres' }).href),
        },
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { Genre } from 'src/utils/models';
import GenreTile from './GenreTile.vue';

const emit = defineEmits<{
  scrollEnd: [value: boolean];
}>();

const props = defineProps({
  isLast: Boolean,
});

const genre = defineModel<Genre>('genre', {
  required: true,
});

const onIntersect = (evt: IntersectionObserverEntry): void => {
  if (props.isLast && evt.isIntersecting) {
    emit('scrollEnd', true);
  }
};
</script>
