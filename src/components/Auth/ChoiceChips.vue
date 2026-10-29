<template>
  <div class="choice-chips" role="group">
    <button
      type="button"
      class="choice-chips__chip"
      :class="{ 'choice-chips__chip--on': picked(option.value) }"
      :aria-pressed="picked(option.value)"
      :disabled="!picked(option.value) && full"
      :key="option.value"
      v-for="option in options"
      @click="toggle(option.value)"
    >
      <q-icon name="lucide-check" size="14px" v-if="picked(option.value)" />
      <img class="choice-chips__img" alt="" loading="lazy" :src="option.image" v-else-if="option.image" />
      {{ option.label }}
    </button>
    <slot name="after" />
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
import { computed } from 'vue';

const props = defineProps<{
  options: { value: T; label: string; image?: string | null }[];
  /** Most options that can be picked at once */
  max?: number;
}>();

const model = defineModel<T[]>({ default: () => [] });

const full = computed(() => !!props.max && model.value.length >= props.max);

const picked = (value: T) => model.value.includes(value);

const toggle = (value: T) => {
  model.value = picked(value)
    ? model.value.filter((item) => item !== value)
    : [...model.value, value];
};
</script>

<style lang="scss" scoped>
.choice-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.choice-chips__img {
  width: 20px;
  height: 20px;
  margin-left: -8px;
  border-radius: 50%;
  object-fit: cover;
}

.choice-chips__chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--tf-text);
  border: 1px solid var(--tf-border);
  border-radius: 999px;
  background: var(--tf-surface-1);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--q-primary) 50%, var(--tf-border));
  }

  &:focus-visible {
    outline: 2px solid var(--q-primary);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--on {
    color: var(--q-primary);
    border-color: var(--q-primary);
    background: color-mix(in srgb, var(--q-primary) 10%, var(--tf-surface-1));
  }
}
</style>
