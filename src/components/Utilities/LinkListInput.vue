<template>
  <div class="flex flex-col gap-2">
    <div class="flex items-start gap-2 flex-nowrap" v-for="(_link, i) in links" :key="i">
      <q-input
        dark
        filled
        dense
        hide-bottom-space
        type="url"
        :placeholder="placeholder"
        :error="!!errors[`${name}.${i}`]"
        :error-message="errors[`${name}.${i}`]"
        v-model="links[i]"
      />
      <IconBtn
        class="flex-none! mt-1"
        icon="lucide-x"
        :aria-label="`Remove link ${i + 1}`"
        v-if="links.length > 1"
        @click="links.splice(i, 1)"
      />
    </div>
    <div class="text-xs text-negative" v-if="errors[name]">{{ errors[name] }}</div>
    <q-btn
      flat
      dense
      no-caps
      size="sm"
      icon="lucide-plus"
      label="Add another link"
      class="flex-none! self-start"
      v-if="links.length < max"
      @click="links.push('')"
    />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ name?: string; max?: number; errors?: Record<string, string> }>(), {
  name: 'links',
  max: 5,
  errors: () => ({}),
});

const placeholder = 'https://';

const links = defineModel<string[]>({ required: true });
</script>
