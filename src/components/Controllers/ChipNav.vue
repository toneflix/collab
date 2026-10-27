<template>
  <!-- Page shortcuts for phones, where the side menu is hidden. A grid, so all of them show at once. -->
  <nav class="chip-nav sm:hidden!" :aria-label="label" :style="{ '--chip-columns': columns }">
    <router-link
      :key="link.label"
      :to="link.to"
      class="chip-nav__chip"
      :class="{ 'chip-nav__chip--active': link.active }"
      :aria-current="link.active ? 'page' : undefined"
      v-for="link in links"
    >
      <q-icon size="20px" :name="link.icon" v-if="link.icon" />
      <span class="chip-nav__label">{{ link.label }}</span>
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RouteLocationRaw } from 'vue-router';

const props = defineProps<{
  label: string;
  links: { label: string; to: RouteLocationRaw; icon?: string; active?: boolean }[];
}>();

/** Up to four fit on one row; more go three to a row. */
const columns = computed(() => (props.links.length <= 4 ? props.links.length : 3));
</script>

<style lang="scss" scoped>
.chip-nav {
  display: grid;
  grid-template-columns: repeat(var(--chip-columns), minmax(0, 1fr));
  gap: 8px;
  margin-bottom: 12px;

  &__chip {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 0;
    padding: 10px 4px;
    font-size: 12px;
    font-weight: 500;
    color: var(--tf-text);
    border-radius: 14px;
    background: var(--tf-surface-2);

    .q-icon {
      color: var(--tf-text-muted);
    }

    &--active {
      color: var(--tf-on-primary);
      background: var(--q-primary);

      .q-icon {
        color: inherit;
      }
    }
  }

  &__label {
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
</style>
