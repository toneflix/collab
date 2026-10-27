<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { trackInputModality } from 'src/utils/input-modality';

defineOptions({
  name: 'App',
});

const router = useRouter();

/** Fades out the launch splash from index.html, once the first page has painted. */
const hideSplash = () => {
  const splash = document.getElementById('app-splash');
  if (!splash) return;
  splash.classList.add('app-splash--hidden');
  setTimeout(() => splash.remove(), 400);
};

onMounted(() => {
  trackInputModality();
  void router.isReady().then(() => requestAnimationFrame(() => requestAnimationFrame(hideSplash)));
});
</script>
