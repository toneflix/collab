<template>
  <!-- A row of page shortcuts for phones, where the side menu is hidden -->
  <nav class="chip-nav sm:!hidden" :aria-label="label">
    <router-link
      :key="link.label"
      :to="link.to"
      class="chip-nav__chip"
      :class="{ 'chip-nav__chip--active': link.active }"
      v-for="link in links"
    >
      <q-icon size="16px" :name="link.icon" v-if="link.icon" />
      {{ link.label }}
    </router-link>
  </nav>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from 'vue-router';

defineProps<{
  label: string;
  links: { label: string; to: RouteLocationRaw; icon?: string; active?: boolean }[];
}>();
</script>

<style lang="scss" scoped>
.chip-nav {
  display: flex;
  flex-wrap: nowrap;
  gap: 8px;
  // Bleed to the screen edges past the page's 8px phone padding
  margin: 0 -8px 8px;
  padding: 0 8px;
  overflow-x: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &__chip {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 500;
    color: var(--tf-text);
    background: var(--tf-surface-2);

    &--active {
      color: var(--tf-on-primary);
      background: var(--q-primary);
    }
  }
}
</style>
