<template>
  <div class="simple-info">
    <div class="simple-info__icon">
      <q-icon :name="icon" size="22px" />
    </div>
    <div class="simple-info__text">
      {{ text }}
      <slot />
    </div>
    <div class="simple-info__actions" v-if="$slots.actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * A quiet card for empty lists and short notes.
 */
withDefaults(
  defineProps<{
    text?: string;
    icon?: string;
  }>(),
  { icon: 'lucide-inbox' },
);
</script>

<style lang="scss" scoped>
.simple-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 24px;
  text-align: center;
  color: var(--tf-text-muted);
  border: 1px dashed var(--tf-border-strong);
  border-radius: var(--tf-radius-xl);
  background: color-mix(in srgb, var(--tf-surface-1) 60%, transparent);

  &__icon {
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    color: var(--q-primary);
    border-radius: var(--tf-radius-full);
    background: var(--tf-primary-soft);
  }

  &__text {
    max-width: 44ch;
    line-height: 1.5;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }
}
</style>
