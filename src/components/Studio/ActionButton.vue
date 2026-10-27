<template>
  <q-btn
    no-caps
    unelevated
    :round="!expanded"
    :rounded="expanded"
    :flat="!expanded"
    :padding="expanded ? '6px 14px 6px 10px' : '8px'"
    class="action-btn flex-none!"
    :class="{
      'action-btn--open': expanded,
      'action-btn--active': active,
      'action-btn--glow': glow,
    }"
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
  /** Pulses a glow around the button while work it started runs. */
  glow?: boolean;
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

  &--glow {
    overflow: visible;

    &::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      animation: action-btn-glow 1.4s ease-in-out infinite;
    }
  }

  &--open &__label {
    max-width: 10em;
    margin-left: 8px;
    opacity: 1;
  }
}

@keyframes action-btn-glow {
  0%,
  100% {
    box-shadow:
      0 0 0 1px color-mix(in srgb, var(--tf-primary) 35%, transparent),
      0 0 4px 0 color-mix(in srgb, var(--tf-primary) 25%, transparent);
  }

  50% {
    box-shadow:
      0 0 0 1px var(--tf-primary),
      0 0 16px 3px color-mix(in srgb, var(--tf-primary) 65%, transparent);
  }
}

@media (prefers-reduced-motion: reduce) {
  .action-btn--glow::after {
    animation: none;
    box-shadow:
      0 0 0 1px var(--tf-primary),
      0 0 10px 2px color-mix(in srgb, var(--tf-primary) 45%, transparent);
  }
}
</style>
