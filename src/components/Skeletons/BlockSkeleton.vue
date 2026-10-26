<template>
  <div
    class="block-skeleton"
    :class="`block-skeleton--${variant}`"
    role="status"
    aria-label="Loading"
  >
    <template v-if="variant === 'stats'">
      <div class="block-skeleton__stat" :key="i" v-for="i in count">
        <q-skeleton dark type="text" width="45%" />
        <q-skeleton dark type="text" width="65%" height="32px" />
        <q-skeleton dark type="text" width="35%" />
      </div>
    </template>
    <template v-else-if="variant === 'form'">
      <div class="block-skeleton__field" :key="i" v-for="i in count">
        <q-skeleton dark type="text" :width="['28%', '20%', '34%'][i % 3]" />
        <q-skeleton
          dark
          type="rect"
          height="44px"
          class="block-skeleton__input"
        />
      </div>
    </template>
    <template v-else>
      <q-skeleton
        dark
        type="text"
        :width="['92%', '78%', '85%', '64%', '88%', '70%'][(i - 1) % 6]"
        :key="i"
        v-for="i in count"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * Placeholder blocks for loading content: stat cards, form fields or lines of text.
 */
withDefaults(
  defineProps<{
    variant?: 'stats' | 'form' | 'lines';
    count?: number;
  }>(),
  { variant: 'lines', count: 4 },
);
</script>

<style lang="scss" scoped>
.block-skeleton {
  &--stats {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 12px;
  }

  &__stat {
    padding: 16px;
    border: 1px solid var(--tf-border);
    border-radius: var(--tf-radius-lg);
    background: var(--tf-surface-1);
  }

  &--form {
    display: flex;
    flex-direction: column;
    gap: 18px;
    max-width: 640px;
  }

  &__input {
    border-radius: var(--tf-radius-md);
  }

  &--lines {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
