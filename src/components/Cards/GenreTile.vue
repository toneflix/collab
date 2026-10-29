<template>
  <component
    :is="to ? 'router-link' : 'div'"
    :to="to"
    class="genre-tile"
    :class="`genre-tile--${size}`"
    :style="genre.imageUrl ? undefined : { background: fallback }"
  >
    <img class="genre-tile__img" loading="lazy" alt="" :src="genre.imageUrl" v-if="genre.imageUrl" />
    <span class="genre-tile__shade" />
    <span class="genre-tile__title">{{ genre.title }}</span>
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { Genre } from 'src/utils/models';

const props = withDefaults(
  defineProps<{
    genre: Pick<Genre, 'slug' | 'title' | 'imageUrl'>;
    to?: RouteLocationRaw;
    size?: 'sm' | 'md' | 'fill';
  }>(),
  { size: 'md', to: undefined },
);

/** A steady two-colour gradient from the slug, for genres without a cover. */
const fallback = computed(() => {
  const hash = [...(props.genre.slug || props.genre.title)].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  const hue = hash % 360;

  return `linear-gradient(135deg, hsl(${hue} 70% 42%), hsl(${(hue + 50) % 360} 65% 22%))`;
});
</script>

<style lang="scss" scoped>
.genre-tile {
  position: relative;
  display: block;
  overflow: hidden;
  flex: none;
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-2);
  isolation: isolate;
  transition: transform var(--tf-duration) var(--tf-ease);

  &:is(a):hover {
    transform: translateY(-2px);
  }

  &:is(a):hover .genre-tile__img {
    transform: scale(1.05);
  }
}

.genre-tile--sm {
  width: 132px;
  height: 84px;
}

.genre-tile--md {
  width: 176px;
  height: 176px;
}

.genre-tile--fill {
  width: 100%;
  aspect-ratio: 1;
}

.genre-tile__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s var(--tf-ease);
}

.genre-tile__shade {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgb(0 0 0 / 75%), rgb(0 0 0 / 0%) 65%);
}

.genre-tile__title {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 10px;
  overflow: hidden;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.2;
  color: #fff;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.genre-tile--sm .genre-tile__title {
  font-size: 0.875rem;
}

.genre-tile--md .genre-tile__title,
.genre-tile--fill .genre-tile__title {
  font-size: 1.125rem;
}
</style>
