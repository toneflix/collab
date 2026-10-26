<template>
  <q-btn
    dense
    no-caps
    rounded
    unelevated
    padding="xs md"
    color="dark-opaque"
    icon="lucide-sparkles"
    :size="size"
    :label="label"
    v-bind="$attrs"
    @click.stop="open = true"
    v-if="ai?.enabled"
  />
  <AiArtworkDialog
    v-model="open"
    :ai="ai"
    :kind="kind"
    :title="title"
    :artist="artist"
    :genre="genre"
    @pick="(e) => emit('pick', e)"
    @spent="loadAi"
    v-if="ai?.enabled"
  />
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AiArtworkDialog, { type ArtworkPick } from './AiArtworkDialog.vue';
import {
  loadAiAccountRequest,
  type AiAccount,
  type ArtworkKind,
} from 'src/utils/requests/ai';

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    kind: ArtworkKind;
    /** The title, artist and genre of what the artwork is for */
    title?: string | null;
    artist?: string | null;
    genre?: string | null;
    label?: string;
    size?: string;
  }>(),
  { label: 'Generate with AI', size: undefined },
);

const emit = defineEmits<{ pick: [ArtworkPick] }>();

const open = ref(false);
const ai = ref<AiAccount>();

const loadAi = async () => {
  try {
    ai.value = await loadAiAccountRequest().send();
  } catch {
    ai.value = undefined;
  }
};

onMounted(loadAi);
</script>
