<template>
  <router-view />
</template>

<script setup lang="ts">
import { useColors } from 'vuestic-ui/web-components';

defineOptions({
  name: 'App',
});
const { applyPreset } = useColors();
applyPreset('dark');
</script>
