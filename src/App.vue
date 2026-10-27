<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { trackInputModality } from 'src/utils/input-modality';

defineOptions({
  name: 'App',
});

onMounted(trackInputModality);
</script>
