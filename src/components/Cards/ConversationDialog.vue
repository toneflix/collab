<template>
  <slot :toggle="open">
    <q-btn icon="lucide-info" v-bind="$attrs" @click="open">
      <span class="ml-2 text-base">{{ btnLabel }}</span>
    </q-btn>
  </slot>
</template>

<script setup lang="ts">
import { PropType } from 'vue';
import { GenericData } from 'src/utils/models';
import { useConversationStore } from 'src/stores/conversation-store';
import type { ConversationType } from 'src/utils/requests/conversations';

defineOptions({
  name: 'ConversationDialog',
});

const props = defineProps({
  id: {
    type: [String, Number],
    required: true,
  },
  type: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    default: 'Conversation',
  },
  btnLabel: {
    type: String,
    default: 'Conversation',
  },
  params: { type: Object as PropType<GenericData>, default: () => ({}) },
});

const conversations = useConversationStore();

/** Which conversation these props point at, in the conversations API's terms. */
const conversationType = (): ConversationType => {
  if (props.params.baseUrl === 'tracks') return 'track';
  if (props.params.baseUrl === 'releases') return 'release';
  if (props.params.track_id) return 'project-track';
  return 'project';
};

/**
 * Opens the chat in the corner window, which leaves the page usable. Guests
 * can read public conversations there; signing in lets them reply.
 */
const open = () => {
  const type = conversationType();
  const id = type === 'project-track' ? (props.params.track_id as string | number) : props.id;
  conversations.openDock({ type, id, title: props.title === 'Conversation' ? undefined : props.title });
};

defineExpose({ toggle: open });
</script>
