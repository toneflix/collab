<template>
  <q-icon :name="`${name}${fill ? '' : '-outline'}`" />
</template>

<script setup lang="ts">
defineProps({
  name: {
    type: String,
    required: true,
  },
  fill: {
    type: Boolean,
    required: false,
    default: false,
  },
});
</script>
