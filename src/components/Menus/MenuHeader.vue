<template>
  <div class="flex items-center gap-3 flex-nowrap! pb-1">
    <q-img
      no-spinner
      class="bg-surface-3 flex-none!"
      :class="round ? 'rounded-full' : 'rounded-md'"
      width="44px"
      height="44px"
      :src="imageUrl"
    />
    <div class="min-w-0">
      <div class="font-bold truncate">{{ title }}</div>
      <div class="text-sm text-fg-muted truncate" v-if="caption">{{ caption }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
/** The art, title and caption at the top of a menu's bottom sheet */
defineProps<{
  title: string;
  caption?: string;
  imageUrl?: string;
  round?: boolean;
}>();
</script>
