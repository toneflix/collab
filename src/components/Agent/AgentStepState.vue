<template>
  <span class="text-sm" :class="state.color" :title="step?.error || undefined">{{ state.label }}</span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentStep } from 'src/utils/requests/agent';

const props = defineProps<{ step?: AgentStep | undefined }>();

const state = computed(() => {
  const step = props.step;

  if (!step || step.status === 'pending') return { label: 'Waiting', color: 'text-grey-6' };
  if (step.status === 'failed') return { label: 'Failed', color: 'text-red-4' };
  if (step.status === 'skipped') return { label: 'Stopped', color: 'text-grey-6' };
  if (step.status === 'waiting') return { label: 'Working', color: 'text-blue-4' };
  if (step.kind === 'release') return { label: step.published ? 'Published' : 'Draft release', color: 'text-green-4' };

  return { label: 'Done', color: 'text-green-4' };
});
</script>
