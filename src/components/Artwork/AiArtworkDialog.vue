<template>
  <q-dialog v-model="show" @before-show="resume" @hide="stop">
    <q-card class="w-full max-w-xl bg-dark">
      <q-card-section class="flex items-center justify-between flex-nowrap">
        <div class="text-lg font-bold">Generate artwork</div>
        <IconBtn icon="lucide-x" class="!flex-none" v-close-popup />
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
              class="!flex-none"
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
import { computed, onBeforeUnmount, ref } from 'vue';
import { notify } from 'src/utils/helpers';
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
let timer: ReturnType<typeof setTimeout> | undefined;

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

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

const stop = () => {
  clearTimeout(timer);
  timer = undefined;
};

/** Check on the job until it's done. */
const poll = () => {
  stop();
  if (!busy.value || !job.value) return;

  const id = job.value.id;
  timer = setTimeout(async () => {
    try {
      const update = await loadAiJobRequest(id).send();
      if (job.value?.id === id) job.value = update;
    } catch {
      // Tried again on the next tick.
    }
    if (show.value) poll();
  }, 2500);
};

/** Pick up the last artwork drawn for this kind, while its images last. */
const resume = async () => {
  if (job.value) return poll();

  try {
    const [last] = await loadArtworkJobsRequest(props.kind).send();
    if (!last || job.value) return;
    if (last.status === 'failed' || (last.status === 'succeeded' && !last.images?.length)) return;

    job.value = last;
    prompt.value = last.prompt ?? '';
    poll();
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
    poll();
  } catch (e) {
    notify(errorText(e, "The artwork couldn't be started."), 'error');
  } finally {
    starting.value = false;
  }
};

const use = async () => {
  const image = images.value.find((i) => i.index === picked.value);
  if (!image) return;

  using.value = true;
  try {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error();

    const blob = await response.blob();
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

onBeforeUnmount(stop);
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
</style>
