<template>
  <div class="py-4 border-[0.3px] text-center border-white border-solid">
    {{ text }}
    <slot />
  </div>
</template>

<script setup lang="ts">
defineProps({
  text: String,
});
</script>
