<template>
  <q-dialog v-model="show" @before-show="resume">
    <q-card class="w-full max-w-xl bg-dark">
      <q-card-section class="flex items-center justify-between flex-nowrap">
        <div class="text-lg font-bold">Generate artwork</div>
        <IconBtn icon="lucide-x" class="flex-none!" v-close-popup />
      </q-card-section>

      <q-card-section class="pt-0" v-if="!ai.access">
        <div class="text-sm text-grey-5">
          With Premium, AI can draw your artwork.
          <router-link :to="{ name: 'premium' }">See plans</router-link>
        </div>
      </q-card-section>

      <template v-else>
        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-input
            dark
            filled
            autogrow
            counter
            type="textarea"
            maxlength="1000"
            label="Describe the picture"
            input-class="min-h-16"
            :disable="busy"
            v-model="prompt"
            @keydown.enter.ctrl.prevent="generate"
          />
          <div class="flex items-center justify-between gap-3 flex-nowrap">
            <div class="text-xs text-grey-6">
              {{ cost }} credits · {{ ai.balance.total.toLocaleString() }} left
              <template v-if="short">
                ·
                <router-link :to="{ name: 'studio.credits' }"
                  >Get credits</router-link
                >
              </template>
            </div>
            <q-btn
              unelevated
              rounded
              no-caps
              color="toneflix"
              class="flex-none!"
              icon="lucide-sparkles"
              :label="images.length ? 'Generate again' : 'Generate'"
              :loading="starting || busy"
              :disable="prompt.trim().length < 3 || short"
              @click="generate"
            />
          </div>
        </q-card-section>

        <q-card-section class="pt-0" v-if="busy || images.length || failed">
          <div class="text-sm text-negative" v-if="failed">
            {{ job?.error || 'Something went wrong. Your credits were refunded.' }}
          </div>
          <div class="grid gap-2" :class="gridClass" v-else>
            <template v-if="busy">
              <q-skeleton
                dark
                square
                class="w-full rounded"
                :style="{ aspectRatio: ratio }"
                :key="n"
                v-for="n in placeholders"
              />
            </template>
            <template v-else>
              <button
                type="button"
                class="artwork-option"
                :class="{ 'artwork-option--active': picked === image.index }"
                :style="{ aspectRatio: ratio }"
                :key="image.url"
                v-for="image in images"
                @click="picked = image.index"
              >
                <img :src="image.url" alt="" class="w-full h-full object-cover" />
              </button>
            </template>
          </div>
        </q-card-section>

        <q-card-section
          class="flex flex-col gap-3 pt-0"
          v-if="textable && picked !== null && !busy"
        >
          <q-toggle
            dark
            color="toneflix"
            label="Put the title on the cover"
            v-model="lettering"
          />
          <template v-if="lettering">
            <div class="grid gap-3 sm:grid-cols-2">
              <q-input
                dark
                filled
                dense
                maxlength="80"
                label="Title"
                v-model="text.title"
              />
              <q-input
                dark
                filled
                dense
                maxlength="60"
                label="Artist"
                v-model="text.artist"
              />
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <q-btn-toggle
                dense
                no-caps
                rounded
                unelevated
                toggle-color="toneflix"
                color="grey-9"
                class="flex-none!"
                padding="xs md"
                :options="coverTextPositions"
                v-model="text.position"
              />
              <q-btn-toggle
                dense
                no-caps
                rounded
                unelevated
                toggle-color="toneflix"
                color="grey-9"
                class="flex-none!"
                padding="xs md"
                :options="coverTextStyles"
                v-model="text.style"
              />
            </div>
            <canvas ref="preview" class="cover-preview" />
          </template>
        </q-card-section>

        <q-card-actions align="right" v-if="images.length && !busy">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            color="toneflix"
            label="Use this image"
            :loading="using"
            :disable="picked === null"
            @click="use"
          />
        </q-card-actions>
      </template>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useFallbackPoll } from 'src/composables/useFallbackPoll';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { useRealtimeChannel } from 'src/utils/realtime';
import {
  coverTextPositions,
  coverTextStyles,
  drawCoverText,
  loadImage,
  type CoverText,
} from 'src/utils/cover-text';
import type { ResponseBody } from 'src/utils/models';
import {
  generateArtworkRequest,
  loadAiJobRequest,
  loadArtworkJobsRequest,
  type AiAccount,
  type AiJob,
  type ArtworkKind,
} from 'src/utils/requests/ai';

/** The image picked, as a file for the form and a link to preview it */
export type ArtworkPick = { file: File; url: string };

const props = defineProps<{
  ai: AiAccount;
  kind: ArtworkKind;
  title?: string | null;
  artist?: string | null;
  genre?: string | null;
}>();

const emit = defineEmits<{ pick: [ArtworkPick]; spent: [] }>();

const show = defineModel<boolean>({ default: false });

const prompt = ref('');
const job = ref<AiJob>();
const picked = ref<number | null>(null);
const starting = ref(false);
const using = ref(false);
const boot = useBootstrapStore();

const cost = computed(() => props.ai.costs.artwork ?? 1);
const short = computed(() => cost.value > props.ai.balance.total);
const busy = computed(
  () => job.value?.status === 'queued' || job.value?.status === 'running',
);
const failed = computed(() => job.value?.status === 'failed');
const images = computed(() =>
  job.value?.status === 'succeeded' ? (job.value.images ?? []) : [],
);
const ratio = computed(() => (props.kind === 'artist_cover' ? '2 / 1' : '1 / 1'));
const placeholders = 4;
const gridClass = computed(() =>
  props.kind === 'artist_cover' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2',
);

/** Kinds that are covers, which can carry their title */
const textable = computed(() =>
  ['project', 'release', 'track', 'song'].includes(props.kind),
);
const lettering = ref(!!props.title);
const text = reactive<CoverText>({
  title: props.title ?? '',
  artist: props.artist ?? '',
  position: 'bottom',
  style: 'bold',
});
const preview = ref<HTMLCanvasElement>();

/** Downloaded images by their link, so the preview and the pick share one fetch */
const blobs = new Map<string, Promise<Blob>>();

const blobFor = (url: string) => {
  if (!blobs.has(url)) {
    blobs.set(
      url,
      fetch(url).then((response) => {
        if (!response.ok) throw new Error();
        return response.blob();
      }),
    );
  }

  return blobs.get(url)!;
};

const pickedImage = computed(() =>
  images.value.find((i) => i.index === picked.value),
);

/** Draw the picked image with its title onto the preview. */
const drawPreview = async () => {
  await nextTick();
  const image = pickedImage.value;
  if (!lettering.value || !image || !preview.value) return;

  try {
    const loaded = await loadImage(await blobFor(image.url));
    if (preview.value) drawCoverText(loaded, text, preview.value);
  } catch {
    blobs.delete(image.url);
  }
};

watch([pickedImage, lettering, text, preview], drawPreview);

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

/** Take the job's latest state, from realtime or a check. */
const onJob = (update: AiJob) => {
  if (job.value?.id === update.id) job.value = update;
};

const checkJob = async () => {
  const id = job.value?.id;
  if (!id) return;

  try {
    onJob(await loadAiJobRequest(id).send());
  } catch {
    // Checked again on the next round.
  }
};

const { live } = useRealtimeChannel(
  () => (show.value && boot.user?.id ? `user.${boot.user.id}` : null),
  { 'ai.job': onJob },
);

useFallbackPoll({ live, active: () => show.value && busy.value, check: checkJob, every: 2500 });

/** Pick up the last artwork drawn for this kind, while its images last. */
const resume = async () => {
  if (!text.title) {
    text.title = props.title ?? '';
    lettering.value = !!text.title;
  }
  if (!text.artist) text.artist = props.artist ?? '';

  if (job.value) return;

  try {
    const [last] = await loadArtworkJobsRequest(props.kind).send();
    if (!last || job.value) return;
    if (last.status === 'failed' || (last.status === 'succeeded' && !last.images?.length)) return;

    job.value = last;
    prompt.value = last.prompt ?? '';
  } catch {
    // Starts empty.
  }
};

const generate = async () => {
  if (prompt.value.trim().length < 3 || short.value || busy.value) return;

  starting.value = true;
  try {
    const { data } = await generateArtworkRequest({
      kind: props.kind,
      prompt: prompt.value.trim(),
      title: props.title || null,
      artist: props.artist || null,
      genre: props.genre || null,
    }).send();

    job.value = data;
    picked.value = null;
    emit('spent');
  } catch (e) {
    notify(errorText(e, "The artwork couldn't be started."), 'error');
  } finally {
    starting.value = false;
  }
};

const use = async () => {
  const image = pickedImage.value;
  if (!image) return;

  using.value = true;
  try {
    let blob = await blobFor(image.url);

    if (textable.value && lettering.value && text.title.trim()) {
      const canvas = drawCoverText(await loadImage(blob), text);
      blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject()), 'image/jpeg', 0.92),
      );
    }

    const file = new File([blob], `artwork-${props.kind}.jpg`, {
      type: 'image/jpeg',
    });

    emit('pick', { file, url: URL.createObjectURL(blob) });
    show.value = false;
  } catch {
    notify("That image couldn't be loaded. Try generating again.", 'error');
  } finally {
    using.value = false;
  }
};
</script>

<style scoped lang="scss">
.artwork-option {
  display: block;
  overflow: hidden;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: border-color 0.15s;

  &:hover {
    border-color: rgba(255, 255, 255, 0.3);
  }

  &--active,
  &--active:hover {
    border-color: var(--q-toneflix);
  }
}

.cover-preview {
  width: 100%;
  max-width: 280px;
  height: auto;
  border-radius: 6px;
  align-self: center;
}
</style>
