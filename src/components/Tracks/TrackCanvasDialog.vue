<template>
  <ResponsiveDialog
    title="Canvas"
    card-class="w-full max-w-md"
    body-class="max-h-[80vh] overflow-y-auto"
    v-model="open"
    @before-show="load"
    @hide="stopPoll"
  >
    <div class="flex flex-col gap-4 pb-4 flex-nowrap!" v-if="track">
      <div class="canvas-dialog__preview">
        <CanvasLoop class="canvas-dialog__frame" :canvas="canvas" v-if="canvas?.videoUrl" />
        <q-img no-spinner class="canvas-dialog__frame" :src="track.imageUrl" v-else />
        <div class="canvas-dialog__overlay" v-if="drawing">
          <q-spinner size="32px" />
          <span>Making your canvas</span>
        </div>
      </div>

      <q-banner dense rounded class="text-white bg-red-10" v-if="canvas?.status === 'failed'">
        {{ canvas.error || "The canvas couldn't be made." }}
      </q-banner>

      <template v-if="ai?.enabled && ai.access">
        <q-input
          outlined
          dense
          autogrow
          maxlength="500"
          label="Describe the motion (optional)"
          :disable="busy"
          v-model="brief"
        />
        <q-btn
          no-caps
          unelevated
          color="toneflix"
          text-color="dark"
          icon="lucide-sparkles"
          :label="`Make with AI · ${cost} credits`"
          :loading="making"
          :disable="busy"
          @click="make"
        />
      </template>

      <q-btn
        no-caps
        outline
        icon="lucide-upload"
        label="Upload a clip"
        :loading="uploading"
        :disable="busy"
        @click="fileEl?.click()"
      />
      <div class="text-xs text-center text-fg-muted">
        {{ CANVAS_SECONDS.min }} to {{ CANVAS_SECONDS.max }} seconds, tall clips fit best
      </div>
      <input ref="fileEl" type="file" accept="video/mp4,video/quicktime,video/webm" hidden @change="upload" />

      <q-btn
        flat
        no-caps
        color="negative"
        icon="lucide-trash-2"
        label="Remove canvas"
        :loading="removing"
        :disable="busy"
        @click="remove"
        v-if="canvas && !drawing"
      />
    </div>
  </ResponsiveDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import ResponsiveDialog from 'src/components/Controllers/ResponsiveDialog.vue';
import CanvasLoop from './CanvasLoop.vue';
import { notify } from 'src/utils/helpers';
import { notifyError } from 'src/utils/composer';
import { loadAiAccountRequest, type AiAccount } from 'src/utils/requests/ai';
import {
  CANVAS_SECONDS,
  loadOwnCanvasRequest,
  makeCanvasRequest,
  removeCanvasRequest,
  uploadCanvasRequest,
  type TrackCanvas,
} from 'src/utils/requests/canvas';
import type { Track } from 'src/utils/models';

/**
 * The owner's canvas for a released track: a preview of the loop, and ways to
 * make one with AI, upload their own clip or remove it.
 */
const props = defineProps<{ track: Track | null }>();

const open = defineModel<boolean>({ default: false });

/** How often a canvas being made is checked, in milliseconds */
const POLL = 5000;

const canvas = ref<TrackCanvas | null>(null);
const ai = ref<AiAccount>();
const brief = ref('');
const making = ref(false);
const uploading = ref(false);
const removing = ref(false);
const fileEl = ref<HTMLInputElement>();
let poll: ReturnType<typeof setTimeout> | undefined;

const drawing = computed(() => canvas.value?.status === 'drawing');
const busy = computed(() => drawing.value || making.value || uploading.value || removing.value);
const cost = computed(() => ai.value?.costs.canvas ?? 0);

const stopPoll = () => {
  clearTimeout(poll);
  poll = undefined;
};

const watchDrawing = () => {
  stopPoll();
  if (drawing.value && open.value) poll = setTimeout(() => void refresh(), POLL);
};

const refresh = async () => {
  if (!props.track) return null;
  try {
    canvas.value = await loadOwnCanvasRequest(props.track.id).send();
  } catch {
    // The last state stays until the next check
  }
  watchDrawing();
  return canvas.value;
};

const load = async () => {
  canvas.value = null;
  brief.value = '';
  const [found] = await Promise.all([
    refresh(),
    loadAiAccountRequest()
      .send()
      .then((account) => (ai.value = account))
      .catch(() => (ai.value = undefined)),
  ]);
  brief.value = found?.brief ?? '';
};

const make = async () => {
  if (!props.track) return;
  making.value = true;
  try {
    const { data, message } = await makeCanvasRequest(props.track.id, brief.value.trim()).send();
    canvas.value = data;
    notify(message, 'success');
    watchDrawing();
  } catch (e) {
    notifyError(e, "The canvas couldn't be started.");
  } finally {
    making.value = false;
  }
};

const upload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file || !props.track) return;

  uploading.value = true;
  try {
    const { data, message } = await uploadCanvasRequest(props.track.id, file).send();
    canvas.value = data;
    notify(message, 'success');
  } catch (e) {
    notifyError(e, "The clip couldn't be used.");
  } finally {
    uploading.value = false;
  }
};

const remove = async () => {
  if (!props.track) return;
  removing.value = true;
  try {
    const { message } = await removeCanvasRequest(props.track.id).send();
    canvas.value = null;
    notify(message, 'success');
  } catch (e) {
    notifyError(e, "The canvas couldn't be removed.");
  } finally {
    removing.value = false;
  }
};

onBeforeUnmount(stopPoll);
</script>

<style lang="scss" scoped>
.canvas-dialog__preview {
  position: relative;
  width: min(100%, 220px);
  margin-inline: auto;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  border-radius: 12px;
  background: #000;
}

.canvas-dialog__frame {
  position: absolute !important;
  inset: 0;
  width: 100%;
  height: 100%;
}

.canvas-dialog__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-size: 0.875rem;
  background: rgb(0 0 0 / 55%);
}
</style>
