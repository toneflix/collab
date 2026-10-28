<template>
  <q-item clickable @click="emit('open', run)">
    <q-item-section>
      <q-item-label class="prompt">{{ run.prompt }}</q-item-label>
      <q-item-label caption class="mt-1">
        <span v-if="run.owner">For @{{ run.owner.username }} · </span>
        <span v-if="run.counts">
          {{ countStr(run.counts.artists, 'artist') }}, {{ countStr(run.counts.albums, 'album') }},
          {{ countStr(run.counts.tracks, 'track') }}<template v-if="run.counts.releases">, {{ countStr(run.counts.releases, 'release') }}</template><template v-if="run.counts.updates">, {{ countStr(run.counts.updates, 'touch-up') }}</template><template v-if="run.counts.songs">, {{ countStr(run.counts.songs, 'composition') }}</template> ·
        </span>
        {{ run.credits }} credits · {{ date.formatDate(run.createdAt, 'MMM D, HH:mm') }}
      </q-item-label>
      <q-linear-progress
        rounded
        size="4px"
        color="toneflix"
        track-color="grey-9"
        class="mt-2"
        :value="run.progress.total ? run.progress.done / run.progress.total : 0"
        v-if="run.progress?.total && run.status === 'running'"
      />
      <q-item-label caption class="mt-1 text-red-4" v-if="run.error">{{ run.error }}</q-item-label>
    </q-item-section>
    <q-item-section side top>
      <q-badge rounded :color="runStatusLabels[run.status].color" :label="runStatusLabels[run.status].label" />
    </q-item-section>
  </q-item>
</template>

<script setup lang="ts">
import { date } from 'quasar';
import { countStr } from 'src/utils/helpers';
import { runStatusLabels, type AgentRun } from 'src/utils/requests/agent';

defineProps<{ run: AgentRun }>();
const emit = defineEmits<{ open: [run: AgentRun] }>();
</script>

<style lang="scss" scoped>
.prompt {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
