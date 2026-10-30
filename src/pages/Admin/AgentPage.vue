<template>
  <PanePage title="AI Studio">
    <template #subtitle>
      Give it instructions to create new artists, albums and tracks on an agent account, or to fix
      what's already there: fill in missing artwork, sync lyrics and release existing projects.
    </template>

    <AgentWorkspace scope="admin" />
  </PanePage>
</template>

<script setup lang="ts">
import PanePage from 'src/components/Sections/PanePage.vue';
import { useMeta } from 'quasar';
import AgentWorkspace from 'src/components/Agent/AgentWorkspace.vue';

useMeta(() => ({
  title: 'AI Studio',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>
