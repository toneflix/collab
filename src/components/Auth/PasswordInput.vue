<template>
  <q-input
    outlined
    hide-bottom-space
    :type="visible ? 'text' : 'password'"
    v-model="model"
    v-bind="$attrs"
  >
    <template #append>
      <q-btn
        flat
        round
        dense
        size="sm"
        tabindex="-1"
        :icon="visible ? 'lucide-eye-off' : 'lucide-eye'"
        :aria-label="visible ? 'Hide password' : 'Show password'"
        @click="visible = !visible"
      />
    </template>
  </q-input>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineOptions({ inheritAttrs: false });

const model = defineModel<string>({ default: '' });
const visible = ref(false);
</script>
