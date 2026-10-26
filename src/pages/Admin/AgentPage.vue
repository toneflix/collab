<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Content agent</h1>
        <p class="text-grey-5">
          Give it instructions and it plans artists, albums and songs, then writes the lyrics, makes the
          music and builds the releases on an agent account.
        </p>
      </div>

      <AgentWorkspace scope="admin" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import AgentWorkspace from 'src/components/Agent/AgentWorkspace.vue';

useMeta(() => ({
  title: 'Content agent',
  titleTemplate: (title) => `${title} - Toneflix Collab`,
}));
</script>
