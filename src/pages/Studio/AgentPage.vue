<template>
  <PanePage title="AI Studio">
    <template #subtitle>
      Give it instructions to create new artists, albums and tracks, or to fix what you already have:
      fill in missing artwork, sync lyrics and release existing projects. It uses your AI credits.
    </template>

    <AgentWorkspace scope="creator" v-if="boot.user?.agentAccess" />
    <SimpleInfo
      class="m-4 flex-none!"
      v-else
      icon="lucide-bot"
      text="AI Studio comes with some plans. Upgrade to describe albums, tracks and fixes in plain words and let AI build them in your studio."
    >
      <template #actions>
        <q-btn unelevated no-caps color="primary" label="See plans" :to="{ name: 'premium' }" />
      </template>
    </SimpleInfo>
  </PanePage>
</template>

<script setup lang="ts">
import PanePage from 'src/components/Sections/PanePage.vue';
import { useMeta } from 'quasar';
import AgentWorkspace from 'src/components/Agent/AgentWorkspace.vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';

const boot = useBootstrapStore();

useMeta(() => ({
  title: 'AI Studio',
  titleTemplate: (title) => `${title} - Toneflix Music`,
}));
</script>
