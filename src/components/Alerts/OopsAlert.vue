<template>
  <div class="flex flex-col items-center justify-center">
    <q-icon name="img:/oops.svg" :size="$q.screen.gt.xs ? '30em' : '15rem'" />
    <h3 class="text-3xl font-bold text-center">
      {{ text || 'It appears we are out of content!' }}
    </h3>
  </div>
</template>

<script setup lang="ts">
defineProps({
  text: String,
});
</script>
