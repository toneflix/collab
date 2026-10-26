<template>
  <q-btn
    no-caps
    unelevated
    :round="!expanded"
    :rounded="expanded"
    :flat="!expanded"
    :padding="expanded ? '6px 14px 6px 10px' : '8px'"
    class="action-btn !flex-none"
    :class="{ 'action-btn--open': expanded, 'action-btn--active': active }"
    :aria-label="label"
    :loading="loading"
    :disable="disable"
    @click="emit('click')"
  >
    <q-icon :name="icon" size="20px" />
    <span class="action-btn__label">{{ label }}</span>
    <q-tooltip v-if="!expanded">{{ label }}</q-tooltip>
  </q-btn>
</template>

<script setup lang="ts">
/**
 * A toolbar button that shows only its icon, or its icon and label when
 * `expanded`. The label slides in and out.
 */
defineProps<{
  icon: string;
  label: string;
  expanded?: boolean;
  /** Highlights the button while the panel it opens is showing. */
  active?: boolean;
  loading?: boolean;
  disable?: boolean;
}>();

const emit = defineEmits<{ click: [] }>();
</script>

<style lang="scss" scoped>
.action-btn {
  transition:
    background-color 0.25s ease,
    color 0.25s ease,
    padding 0.25s ease;

  &__label {
    display: inline-block;
    max-width: 0;
    overflow: hidden;
    white-space: nowrap;
    opacity: 0;
    transition:
      max-width 0.3s ease,
      margin 0.3s ease,
      opacity 0.2s ease;
  }

  &--active:not(&--open) {
    background: rgba(3, 191, 255, 0.18);
    color: #03bfff !important;
  }

  &--open {
    background: var(--tf-surface-2);
    box-shadow: inset 0 0 0 1px var(--tf-border);

    &:hover {
      background: var(--tf-surface-3);
    }
  }

  &--open#{&}--active {
    color: var(--q-primary) !important;
    background: var(--tf-primary-soft);
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--q-primary) 40%, transparent);
  }

  &--open &__label {
    max-width: 10em;
    margin-left: 8px;
    opacity: 1;
  }
}
</style>
