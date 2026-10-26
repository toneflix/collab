<template>
  <div class="ai-review" :class="`ai-review--${review.status}`">
    <div class="flex flex-wrap items-center gap-x-2 mb-1 text-xs">
      <q-spinner-dots size="14px" color="toneflix" class="!flex-none" v-if="review.status === 'queued'" />
      <q-icon :name="icon" :color="color" size="14px" class="!flex-none" v-else />
      <span class="font-bold !flex-none">{{ heading }}</span>
      <span class="text-grey-5 !flex-none" v-if="review.confidence !== null && review.confidence !== undefined && review.status !== 'queued'">
        · {{ review.confidence }}% sure
      </span>
      <span class="text-grey-5 !flex-none">· {{ review.mode === 'auto' ? 'sent automatically' : 'sent by an admin' }}</span>
    </div>
    <div v-if="review.summary">{{ review.summary }}</div>
    <div class="mt-1 text-xs text-grey-4" v-if="review.note && review.status !== 'queued'">
      Note for the submitter: {{ review.note }}
    </div>
    <div class="text-xs text-red-4" v-if="review.status === 'failed' && review.error">{{ review.error }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AiReview } from 'src/utils/requests/moderation';

const props = defineProps<{ review: AiReview }>();

const heading = computed(() => {
  const review = props.review;

  switch (review.status) {
    case 'queued':
      return 'The AI moderator is reviewing this…';
    case 'flagged':
      return `AI moderator leans ${review.decision === 'approve' ? 'approve' : review.decision === 'reject' ? 'decline' : 'neither way'}, but wants a person to decide`;
    case 'failed':
      return 'The AI moderator could not finish. You can send it again.';
    case 'skipped':
      return 'Decided before the AI moderator got to it';
    default:
      return review.decision === 'approve' ? 'Approved by the AI moderator' : 'Declined by the AI moderator';
  }
});

const icon = computed(() => ({
  decided: props.review.decision === 'approve' ? 'lucide-circle-check' : 'lucide-circle-x',
  flagged: 'lucide-flag',
  failed: 'lucide-triangle-alert',
  skipped: 'lucide-fast-forward',
  queued: '',
})[props.review.status]);

const color = computed(() => ({
  decided: props.review.decision === 'approve' ? 'green-5' : 'red-5',
  flagged: 'orange-5',
  failed: 'red-5',
  skipped: 'grey-5',
  queued: 'toneflix',
})[props.review.status]);
</script>

<style scoped>
.ai-review {
  padding: 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem;
  border-left: 3px solid rgba(255, 255, 255, 0.2);
  background: rgba(124, 58, 237, 0.08);
}

.ai-review--flagged {
  border-left-color: #f59e0b;
}

.ai-review--failed {
  border-left-color: #ef4444;
}

.ai-review--queued {
  border-left-color: #22d3ee;
}
</style>
