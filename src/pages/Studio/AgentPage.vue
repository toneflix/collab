<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Content agent</h1>
        <p class="text-grey-5">
          Give it instructions and it plans artists, albums and songs for this account, then writes the
          lyrics, makes the music and builds the releases with your AI credits.
        </p>
      </div>

      <AgentWorkspace scope="creator" v-if="boot.user?.contentAgent" />
      <SimpleInfo text="The content agent isn't on for this account." v-else />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import AgentWorkspace from 'src/components/Agent/AgentWorkspace.vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

const boot = useBootstrapStore();

useMeta(() => ({
  title: 'Content agent',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>
