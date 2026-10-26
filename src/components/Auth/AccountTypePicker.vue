<template>
  <div class="type-picker" role="radiogroup">
    <button
      type="button"
      role="radio"
      class="type-picker__option"
      :class="{ 'type-picker__option--on': model === option.value }"
      :aria-checked="model === option.value"
      :key="option.value"
      v-for="option in options"
      @click="model = option.value"
    >
      <span class="type-picker__icon">
        <q-icon :name="option.icon" size="22px" />
      </span>
      <span class="type-picker__copy">
        <span class="type-picker__title">{{ option.title }}</span>
        <span class="type-picker__text" v-if="option.text">{{ option.text }}</span>
      </span>
      <span class="type-picker__check">
        <q-icon name="lucide-check" size="14px" v-if="model === option.value" />
      </span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { authText } from 'src/utils/auth-pages';
import type { AccountTypeValue } from 'src/utils/models';

const model = defineModel<AccountTypeValue | null>({ default: null });

const boot = useBootstrapStore();

const icons: Record<AccountTypeValue, string> = {
  creator: 'lucide-mic-vocal',
  listener: 'lucide-headphones',
};

const options = computed(() =>
  boot.accountTypes.map((type) => ({
    value: type.value,
    icon: icons[type.value],
    title: authText('register', `${type.value}_title`) || type.label,
    text: authText('register', `${type.value}_text`),
  })),
);
</script>

<style lang="scss" scoped>
.type-picker {
  display: grid;
  gap: 12px;
}

.type-picker__option {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 16px;
  color: var(--tf-text);
  text-align: left;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg, 14px);
  background: var(--tf-surface-1);
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--q-primary) 50%, var(--tf-border));
  }

  &:focus-visible {
    outline: 2px solid var(--q-primary);
    outline-offset: 2px;
  }

  &--on {
    border-color: var(--q-primary);
    background: color-mix(in srgb, var(--q-primary) 8%, var(--tf-surface-1));
  }
}

.type-picker__icon {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  color: var(--q-primary);
  border-radius: 12px;
  background: color-mix(in srgb, var(--q-primary) 12%, transparent);
}

.type-picker__copy {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  gap: 2px;
}

.type-picker__title {
  font-weight: 700;
}

.type-picker__text {
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--tf-text-muted);
}

.type-picker__check {
  display: grid;
  flex: none;
  place-items: center;
  width: 22px;
  height: 22px;
  color: var(--tf-on-primary, #0b0d10);
  border: 1px solid var(--tf-border);
  border-radius: 50%;

  .type-picker__option--on & {
    border-color: var(--q-primary);
    background: var(--q-primary);
  }
}
</style>
