<template>
  <div class="otp" :class="{ 'otp--error': error }" @paste.prevent="paste">
    <input
      :key="index"
      :ref="(el) => (inputs[index] = el as HTMLInputElement)"
      :value="digits[index]"
      :aria-label="`Digit ${index + 1}`"
      :autocomplete="index === 0 ? 'one-time-code' : 'off'"
      :disabled="disabled"
      class="otp__box"
      inputmode="numeric"
      maxlength="1"
      @input="type(index, $event)"
      @keydown="key(index, $event)"
      @focus="($event.target as HTMLInputElement).select()"
      v-for="(_, index) in length"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

const props = withDefaults(
  defineProps<{ length?: number; error?: boolean; disabled?: boolean }>(),
  { length: 6 },
);
const emit = defineEmits<{ complete: [code: string] }>();
const model = defineModel<string>({ default: '' });

const inputs = ref<HTMLInputElement[]>([]);
const digits = computed(() => model.value.padEnd(props.length, ' ').split('').map((d) => d.trim()));

const set = (value: string) => {
  const code = value.replace(/\D/g, '').slice(0, props.length);

  model.value = code;

  if (code.length === props.length) {
    emit('complete', code);
  }

  return code;
};

const focus = (index: number) => inputs.value[Math.max(0, Math.min(index, props.length - 1))]?.focus();

const type = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement;
  const digit = input.value.replace(/\D/g, '').slice(-1);
  const chars = digits.value.slice();

  chars[index] = digit;
  input.value = digit;
  set(chars.join(''));

  if (digit) {
    focus(index + 1);
  }
};

const key = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !digits.value[index]) {
    event.preventDefault();

    const chars = digits.value.slice();

    chars[index - 1] = '';
    set(chars.join(''));
    focus(index - 1);
  } else if (event.key === 'ArrowLeft') {
    focus(index - 1);
  } else if (event.key === 'ArrowRight') {
    focus(index + 1);
  }
};

const paste = (event: ClipboardEvent) => {
  focus(set(event.clipboardData?.getData('text') ?? '').length);
};

onMounted(() => focus(model.value.length));

defineExpose({ focus: () => focus(0) });
</script>

<style lang="scss" scoped>
.otp {
  display: grid;
  grid-template-columns: repeat(v-bind(length), minmax(0, 1fr));
  gap: 8px;
}

.otp__box {
  width: 100%;
  height: 56px;
  border: 1px solid var(--tf-border-strong);
  border-radius: var(--tf-radius-lg);
  font-family: var(--tf-font-mono);
  font-size: 1.5rem;
  font-weight: 600;
  text-align: center;
  color: var(--tf-text);
  background: var(--tf-surface-1);
  outline: none;
  transition: border-color var(--tf-duration) var(--tf-ease), box-shadow var(--tf-duration) var(--tf-ease);

  &:focus {
    border-color: var(--tf-primary);
    box-shadow: 0 0 0 3px var(--tf-focus);
  }
}

.otp--error .otp__box {
  border-color: var(--tf-danger);
}
</style>
