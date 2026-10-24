<template>
  <slot :toggle="open">
    <q-btn icon="fas fa-info-circle" v-bind="$attrs" @click="open">
      <span class="ml-2 text-base">{{ btnLabel }}</span>
    </q-btn>
  </slot>
  <q-dialog transition-show="rotate" transition-hide="rotate" v-model="toggle">
    <q-card flat>
      <q-toolbar>
        <q-toolbar-title>
          <span class="text-bold">{{ title }}</span>
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>
      <q-separator />
      <q-card-section class="scroll max-h-[60vh]">
        <CommentSection
          immediate
          hide-title
          label="message"
          :id="id"
          :params="params"
          @commented="(e, t) => emit('commented', e, t)"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { PropType, ref } from 'vue';
import CommentSection from '../Sections/CommentSection.vue';
import { GenericData, UserComment } from 'src/utils/models';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { useConversationStore } from 'src/stores/conversation-store';
import type { ConversationType } from 'src/utils/requests/conversations';

const emit = defineEmits<{
  commented: [value: UserComment, type: 'comment' | 'reply'];
}>();

defineOptions({
  name: 'ProjectTrackInfoDialog',
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

const toggle = ref(false);
const boot = useBootstrapStore();
const conversations = useConversationStore();

/** Which conversation these props point at, in the conversations API's terms. */
const conversationType = (): ConversationType => {
  if (props.params.baseUrl === 'tracks') return 'track';
  if (props.params.baseUrl === 'releases') return 'release';
  if (props.params.track_id) return 'project-track';
  return 'project';
};

/**
 * Signed-in people chat in the corner window, which leaves the page usable.
 * Guests can still read the conversation here.
 */
const open = () => {
  if (!boot.user?.id) {
    toggle.value = !toggle.value;
    return;
  }
  const type = conversationType();
  const id = type === 'project-track' ? (props.params.track_id as string | number) : props.id;
  conversations.openDock({ type, id, title: props.title === 'Conversation' ? undefined : props.title });
};

defineExpose({ toggle: open });
</script>
