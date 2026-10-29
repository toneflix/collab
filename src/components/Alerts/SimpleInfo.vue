<template>
  <div class="simple-info" :class="{ 'simple-info--dense': dense }">
    <div class="simple-info__icon">
      <q-icon :name="icon" :size="dense ? '18px' : '22px'" />
    </div>
    <div class="simple-info__text">
      <div class="simple-info__title" v-if="title">{{ title }}</div>
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
    /** Bold first line, with `text` as the hint under it. */
    title?: string;
    text?: string;
    icon?: string;
    /** One compact row, for empty sections inside a page. */
    dense?: boolean;
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

  &__title {
    font-weight: 600;
    color: var(--tf-text);
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 8px;
  }

  &--dense {
    flex-direction: row;
    flex-wrap: nowrap;
    gap: 12px;
    padding: 10px 12px;
    text-align: left;

    .simple-info__icon {
      flex: none;
      width: 36px;
      height: 36px;
    }

    .simple-info__text {
      display: flex;
      flex-wrap: wrap;
      flex: 1 1 auto;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      max-width: none;
    }
  }
}
</style>
