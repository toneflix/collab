<template>
  <div
    class="list-skeleton"
    role="status"
    aria-label="Loading"
    :class="{ 'list-skeleton--dense': dense }"
  >
    <div class="list-skeleton__row" :key="i" v-for="i in rows">
      <q-skeleton
        dark
        :type="avatar === 'square' ? 'rect' : 'QAvatar'"
        :size="avatarSize"
        class="list-skeleton__avatar"
        v-if="avatar"
      />
      <div class="list-skeleton__text">
        <q-skeleton dark type="text" :width="widths[i % widths.length]" />
        <q-skeleton
          dark
          type="text"
          class="list-skeleton__caption"
          :width="captionWidths[i % captionWidths.length]"
          v-if="lines > 1"
        />
      </div>
      <q-skeleton
        dark
        type="text"
        width="48px"
        class="list-skeleton__side"
        v-if="side"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * Placeholder rows for a list that is still loading.
 */
const props = withDefaults(
  defineProps<{
    rows?: number;
    /** Leading avatar or artwork: round, square, or none */
    avatar?: boolean | 'square';
    lines?: 1 | 2;
    /** A short value on the right, such as a date or amount */
    side?: boolean;
    dense?: boolean;
  }>(),
  { rows: 5, avatar: true, lines: 2, side: false, dense: false },
);

const widths = ['46%', '62%', '38%', '55%', '70%'];
const captionWidths = ['30%', '24%', '36%', '28%'];
const avatarSize = computed(() => (props.dense ? '32px' : '40px'));
</script>

<style lang="scss" scoped>
.list-skeleton {
  display: flex;
  flex-direction: column;
  gap: 4px;

  &__row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 14px;
    padding: 10px 12px;
  }

  &--dense &__row {
    gap: 10px;
    padding: 6px 8px;
  }

  &__avatar {
    flex: none;
    border-radius: var(--tf-radius-md);
  }

  &__text {
    display: flex;
    flex: 1 1 auto;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__caption {
    height: 12px;
  }

  &__side {
    flex: none;
  }
}
</style>
