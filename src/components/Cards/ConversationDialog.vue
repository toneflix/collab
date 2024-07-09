<template>
  <slot :toggle="() => (toggle = !toggle)">
    <q-btn icon="fas fa-info-circle" v-bind="$attrs" @click="toggle = !toggle">
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
        <CommentSection immediate hide-title label="message" :params="params" />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { PropType, ref } from 'vue';
import CommentSection from '../Sections/CommentSection.vue';
import { GenericData } from 'src/utils/models';

defineOptions({
  name: 'ProjectTrackInfoDialog',
});

defineProps({
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

defineExpose({ toggle: () => (toggle.value = !toggle.value) });
</script>
