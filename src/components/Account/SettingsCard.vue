<template>
  <section
    class="settings-card"
    :class="{ 'settings-card--danger': danger }"
    :aria-labelledby="headingId"
  >
    <div class="settings-card__head">
      <div>
        <h2 :id="headingId" class="settings-card__title">{{ title }}</h2>
        <p class="settings-card__caption" v-if="caption">{{ caption }}</p>
      </div>
      <slot name="action" />
    </div>

    <slot />
  </section>
</template>

<script setup lang="ts">
import { useId } from 'vue';

defineProps<{
  title: string;
  caption?: string;
  danger?: boolean;
}>();

const headingId = useId();
</script>

<!-- Not scoped: the form helpers below style fields that pages put in the slot. -->
<style lang="scss">
.settings-card {
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-xl);
  background: var(--tf-surface-1);

  &--danger {
    border-color: color-mix(in srgb, var(--tf-danger) 45%, var(--tf-border));
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 16px;

    > * {
      flex: none;
    }

    > :first-child {
      flex: 1 1 auto;
      min-width: 0;
    }
  }

  &__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.4;
  }

  &__caption {
    margin: 2px 0 0;
    font-size: 0.85rem;
    color: var(--tf-text-muted);
  }

  &__label {
    display: block;
    margin-bottom: 10px;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--tf-text-muted);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 12px;

    &--3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }

    @media (max-width: 600px) {
      &,
      &--3 {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  }

  &__wide,
  &__actions {
    grid-column: 1 / -1;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
  }

  &__row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 16px;

    > * {
      flex: none;
    }

    > :first-child {
      flex: 1 1 auto;
      min-width: 0;
    }

    @media (max-width: 600px) {
      flex-wrap: wrap;
    }
  }
}
</style>
