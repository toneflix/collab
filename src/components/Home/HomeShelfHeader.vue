<template>
  <div class="flex items-end justify-between gap-4 mb-8 flex-nowrap">
    <div class="min-w-0 flex-auto!">
      <h2 class="text-2xl font-bold text-white font-circlular-std md:text-3xl">{{ title }}</h2>
      <p class="mt-1 text-sm text-gray-400 md:text-base" v-if="subtitle">{{ subtitle }}</p>
    </div>
    <q-btn
      flat
      rounded
      no-caps
      dense
      icon-right="lucide-arrow-right"
      label="See all"
      class="flex-none! px-4 text-gray-300"
      :to="to"
      v-if="to"
    />
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue';
import { RouteLocationRaw } from 'vue-router';

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  to: { type: [String, Object] as PropType<RouteLocationRaw>, default: undefined },
});
</script>
