<template>
  <div
    class="icon-btn icon-btn--static"
    :class="[
      `icon-btn--${size}`,
      { 'icon-btn--pill': hasCount, 'icon-btn--active': active },
    ]"
    :aria-label="label"
    v-if="plain"
  >
    <q-icon :name="icon" :color="color" />
    <span class="icon-btn__count" v-if="hasCount">{{ count }}</span>
    <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
  </div>
  <q-btn
    flat
    no-caps
    :round="!hasCount"
    :rounded="hasCount"
    :icon="icon"
    :label="hasCount ? String(count) : undefined"
    :color="color"
    :aria-label="label"
    :aria-pressed="active === undefined ? undefined : active"
    class="icon-btn"
    :class="[
      `icon-btn--${size}`,
      { 'icon-btn--pill': hasCount, 'icon-btn--active': active },
    ]"
    v-else
  >
    <q-tooltip v-if="tooltip">{{ tooltip }}</q-tooltip>
    <slot />
  </q-btn>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * A round button that shows only an icon, or a pill with an icon and a count.
 * `plain` draws the same shape without a button, for plain stats that sit
 * in a row of buttons. Other QBtn props and listeners pass through.
 */
const props = withDefaults(
  defineProps<{
    icon: string;
    /** Read by screen readers, and shown as the tooltip unless `tooltip` is set */
    label?: string;
    tooltip?: string | false;
    count?: number | string;
    color?: string;
    size?: 'sm' | 'md' | 'lg';
    active?: boolean;
    plain?: boolean;
  }>(),
  { size: 'md', tooltip: undefined, active: undefined },
);

const hasCount = computed(
  () => props.count !== undefined && props.count !== null && props.count !== '',
);
const tooltip = computed(() =>
  props.tooltip === false ? undefined : (props.tooltip ?? props.label),
);
</script>

<style lang="scss">
.icon-btn {
  flex: none !important;
  font-size: 14px;
  color: inherit;
  transition:
    background-color var(--tf-duration) var(--tf-ease),
    color var(--tf-duration) var(--tf-ease);

  &.q-btn--round {
    width: 2.6em;
    height: 2.6em;
    min-width: 0;
    min-height: 0;
    padding: 0;
  }

  &.q-btn .q-icon,
  &--static .q-icon {
    font-size: 1.43em;
  }

  &--sm {
    font-size: 11px;
  }

  &--lg {
    font-size: 16px;
  }

  &--pill {
    min-height: 2.6em;
    padding: 0 0.9em;
    font-weight: 600;

    .on-left {
      margin-right: 0.45em;
    }
  }

  &--active {
    color: var(--q-primary);
  }

  &--static {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45em;
    min-width: 2.6em;
    height: 2.6em;
    font-weight: 600;
    border-radius: var(--tf-radius-full);
  }

  &--static.icon-btn--pill {
    padding: 0 0.9em;
  }
}
</style>
