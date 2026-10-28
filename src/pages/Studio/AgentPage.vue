<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Content agent</h1>
        <p class="text-grey-5">
          Give it instructions to create new artists, albums and tracks, or to fix what you already have:
          fill in missing artwork, sync lyrics and release existing projects. It uses your AI credits.
        </p>
      </div>

      <AgentWorkspace scope="creator" v-if="boot.user?.agentAccess" />
      <SimpleInfo
        v-else
        icon="lucide-bot"
        text="The content agent comes with some plans. Upgrade to describe albums, tracks and fixes in plain words and let AI build them in your studio."
      >
        <template #actions>
          <q-btn unelevated no-caps color="primary" label="See plans" :to="{ name: 'premium' }" />
        </template>
      </SimpleInfo>
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
