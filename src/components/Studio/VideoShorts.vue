<template>
  <section>
    <div class="flex items-center gap-3 mb-3 no-wrap">
      <h5 class="text-base font-semibold">Shorts</h5>
      <q-btn
        outline
        rounded
        no-caps
        icon="lucide-smartphone"
        label="New short"
        class="flex-none! ml-auto"
        :disable="shorts.length >= MAX"
        @click="creating = true"
      />
    </div>

    <p class="text-sm text-grey-5" v-if="loaded && !shorts.length">
      Cut vertical clips from this video for Shorts, Reels and TikTok.
    </p>

    <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
      <div class="short" :key="short.id" v-for="(short, i) in shorts">
        <div class="short__frame">
          <video
            controls
            playsinline
            preload="metadata"
            :src="`${short.fileUrl}#t=0.5`"
            v-if="short.status === 'ready' && short.fileUrl"
          />
          <div class="short__state" v-else-if="short.status === 'cutting'">
            <q-spinner-dots size="22px" color="toneflix" />
            <span>Cutting</span>
          </div>
          <div class="short__state text-red-3" v-else>
            <q-icon name="lucide-circle-alert" size="22px" />
            <span>{{ short.error ?? "Couldn't be cut" }}</span>
          </div>
        </div>
        <div class="flex items-center gap-1 p-2 pl-3 no-wrap">
          <span class="text-xs text-grey-5 tabular-nums truncate">
            {{ clock(short.start) }}–{{ clock(short.end) }} ·
            {{ Math.round(short.length) }} s
          </span>
          <IconBtn
            icon="lucide-download"
            label="Download"
            tooltip="Download"
            class="flex-none! ml-auto"
            type="a"
            :href="short.downloadUrl"
            v-if="short.downloadUrl"
          />
          <IconBtn
            icon="lucide-trash-2"
            label="Delete"
            tooltip="Delete"
            class="flex-none!"
            :class="{ 'ml-auto': !short.downloadUrl }"
            :disable="short.status === 'cutting'"
            @click="remove(short, i)"
          />
        </div>
      </div>
    </div>

    <NewShortDialog :video="video" @created="added" v-model="creating" />
  </section>
</template>

<script setup lang="ts">
import { useQuasar } from 'quasar';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import NewShortDialog from 'src/components/Studio/NewShortDialog.vue';
import { notifyError } from 'src/utils/composer';
import type { MusicVideo } from 'src/utils/requests/videos';
import {
  deleteShortRequest,
  loadShortsRequest,
  type MusicVideoShort,
} from 'src/utils/requests/shorts';

const props = defineProps<{ video: MusicVideo }>();

const MAX = 20;
const $q = useQuasar();
const shorts = ref<MusicVideoShort[]>([]);
const loaded = ref(false);
const creating = ref(false);
let poll: ReturnType<typeof setInterval> | undefined;

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const load = async () => {
  try {
    const res = await loadShortsRequest(props.video.id).send();
    shorts.value = res.data;
  } catch (e) {
    notifyError(e, "The shorts couldn't be loaded.");
  } finally {
    loaded.value = true;
  }
};

const added = (short: MusicVideoShort) => {
  shorts.value.unshift(short);
};

const remove = (short: MusicVideoShort, i: number) => {
  $q.dialog({
    dark: true,
    title: 'Delete this short?',
    ok: {
      label: 'Delete',
      color: 'negative',
      noCaps: true,
      unelevated: true,
      rounded: true,
    },
    cancel: { label: 'Keep it', flat: true, noCaps: true, rounded: true },
  }).onOk(async () => {
    try {
      await deleteShortRequest(props.video.id, short.id).send();
      shorts.value.splice(i, 1);
    } catch (e) {
      notifyError(e, "The short couldn't be deleted.");
    }
  });
};

onMounted(() => {
  void load();
  poll = setInterval(() => {
    if (shorts.value.some((short) => short.status === 'cutting')) void load();
  }, 4000);
});

onBeforeUnmount(() => clearInterval(poll));
</script>

<style lang="scss" scoped>
.short {
  overflow: hidden;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);

  &__frame {
    display: grid;
    place-items: center;
    aspect-ratio: 9 / 16;
    background: #000;

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px;
    font-size: 12px;
    text-align: center;
  }
}
</style>
