<template>
  <div class="env-keys">
    <div class="mb-2 text-xs text-grey-5">
      {{ caption }}
    </div>
    <ul class="flex flex-col gap-1">
      <li class="env-keys__row" :key="key.env" v-for="key in keys">
        <q-icon
          size="16px"
          class="flex-none!"
          :name="key.isSet ? 'lucide-circle-check' : key.required ? 'lucide-circle-alert' : 'lucide-circle'"
          :color="key.isSet ? 'green-5' : key.required ? 'orange-5' : 'grey-6'"
        />
        <code class="flex-none!">{{ key.env }}</code>
        <span class="min-w-0 text-xs truncate text-grey-5">
          {{ key.title }}{{ key.isSet ? '' : key.required ? ' · not set' : ' · optional' }}
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { EnvKey } from 'src/utils/models';

withDefaults(defineProps<{ keys: EnvKey[]; caption?: string }>(), {
  caption: 'Keys are read from the API server\'s .env file.',
});
</script>

<style lang="scss" scoped>
.env-keys {
  padding: 10px 12px;
  border-radius: 8px;
  background: #0d0f12;

  &__row {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
  }

  code {
    font-size: 0.8rem;
  }
}
</style>
