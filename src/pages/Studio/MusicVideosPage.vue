<template>
  <q-page class="p-4">
    <div class="max-w-full mx-auto md:max-w-3xl lg:max-w-4xl">
      <div class="flex items-center gap-3 mb-1 no-wrap">
        <h4 class="text-xl font-semibold md:text-2xl flex-none!">
          Music videos
        </h4>
        <q-btn
          flat
          rounded
          no-caps
          label="My characters"
          icon="lucide-users"
          class="flex-none! ml-auto"
          :to="{ name: 'studio.videos.characters' }"
        />
        <q-btn
          unelevated
          rounded
          no-caps
          color="toneflix"
          text-color="dark"
          label="New video"
          class="flex-none!"
          icon="lucide-plus"
          :disable="!ai"
          @click="creating = true"
          v-if="ai?.enabled"
        />
      </div>
      <p class="mb-8 text-sm text-grey-5">
        Pick a song and AI plans a video on its beat: you singing the lines, and
        scenes that fit between them. Or make a free lyric video.
        <template v-if="minutesLeft > 0">
          Your plan has {{ minutesLeft }} video
          {{ minutesLeft === 1 ? 'minute' : 'minutes' }} left this month.
        </template>
      </p>

      <SimpleInfo
        icon="lucide-sparkles"
        class="mb-4"
        title="AI tools are off for now."
        text="Music videos come back when they're switched on again."
        v-if="ai && !ai.enabled"
      />

      <SimpleInfo
        icon="lucide-clapperboard"
        class="mb-4"
        title="No music videos yet."
        text="Start one for any of your songs."
        v-else-if="!videos.length && !loading"
      />

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <router-link
          class="video-card"
          :key="video.id"
          :to="{ name: 'studio.videos.show', params: { video_id: video.id } }"
          v-intersection="
            (e: IntersectionObserverEntry) =>
              onIntersect(e, i === videos.length - 1)
          "
          v-for="(video, i) in videos"
        >
          <span class="video-card__icon flex-none!">
            <q-spinner-dots size="20px" v-if="videoBusy(video)" />
            <q-icon :name="statusIcon[video.status]" size="20px" v-else />
          </span>
          <div class="min-w-0 flex-1">
            <div class="font-semibold truncate">
              {{ video.track?.title ?? 'Untitled song' }}
            </div>
            <div class="text-xs text-grey-5">
              {{ statusText[video.status] }}
              <template v-if="video.mode === 'lyrics'"> · Lyric video</template>
              · {{ video.ratio }}
              <template v-if="video.duration">
                · {{ clock(video.duration) }}</template
              >
            </div>
          </div>
          <IconBtn
            size="sm"
            class="flex-none!"
            aria-label="Delete video"
            icon="lucide-trash-2"
            @click.stop.prevent="remove(video, i)"
            v-if="!videoBusy(video)"
          />
        </router-link>
      </div>

      <ListSkeleton
        avatar="square"
        :rows="4"
        v-if="loading && !videos.length"
      />
    </div>

    <NewMusicVideoDialog
      :ai="ai"
      :own-photos="ownPhotos"
      :advanced="advanced"
      v-model="creating"
      @created="opened"
      v-if="ai"
    />
  </q-page>
</template>

<script setup lang="ts">
import { useMeta, useQuasar } from 'quasar';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import NewMusicVideoDialog from 'src/components/Studio/NewMusicVideoDialog.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notifyError } from 'src/utils/composer';
import { loadAiAccountRequest, type AiAccount } from 'src/utils/requests/ai';
import {
  deleteMusicVideoRequest,
  loadMusicVideosRequest,
  videoBusy,
  type MusicVideo,
  type MusicVideoStatus,
} from 'src/utils/requests/videos';

defineOptions({ name: 'MusicVideosPage' });

const $q = useQuasar();
const router = useRouter();
const boot = useBootstrapStore();

const videos = ref<MusicVideo[]>([]);
const ai = ref<AiAccount | null>(null);
const minutesLeft = ref(0);
const ownPhotos = ref(false);
const advanced = ref(false);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const creating = ref(false);
let poll: ReturnType<typeof setInterval> | undefined;

const statusText: Record<MusicVideoStatus, string> = {
  planning: 'Planning the shots',
  storyboard: 'Storyboard ready',
  rendering: 'Making the video',
  ready: 'Ready to watch',
  failed: 'Failed',
};

const statusIcon: Record<MusicVideoStatus, string> = {
  planning: 'lucide-loader',
  storyboard: 'lucide-layout-grid',
  rendering: 'lucide-loader',
  ready: 'lucide-circle-play',
  failed: 'lucide-circle-alert',
};

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

const load = async (reset = false) => {
  if (reset) page.value = 1;
  loading.value = true;
  try {
    const res = await loadMusicVideosRequest(page.value).send();
    videos.value = reset ? res.data : [...videos.value, ...res.data];
    lastPage.value = res.meta?.lastPage ?? 1;
    minutesLeft.value = res.minutesLeft ?? 0;
    ownPhotos.value = !!res.ownPhotos;
    advanced.value = !!res.advanced;
  } catch (e) {
    notifyError(e, "Your music videos couldn't be loaded.");
  } finally {
    loading.value = false;
  }
};

/** Brings the first page up to date while any video on it is still being made */
const refresh = async () => {
  if (loading.value || !videos.value.some(videoBusy)) return;
  try {
    const res = await loadMusicVideosRequest(1).send();
    const fresh = new Map(res.data.map((v) => [v.id, v]));
    videos.value = videos.value.map((v) => fresh.get(v.id) ?? v);
  } catch {
    // The next tick tries again
  }
};

const onIntersect = (evt: IntersectionObserverEntry, isLast: boolean) => {
  if (
    isLast &&
    evt.isIntersecting &&
    !loading.value &&
    page.value < lastPage.value
  ) {
    page.value++;
    void load();
  }
};

const opened = (video: MusicVideo) => {
  void router.push({
    name: 'studio.videos.show',
    params: { video_id: video.id },
  });
};

const remove = (video: MusicVideo, i: number) => {
  $q.dialog({
    dark: true,
    title: 'Delete this music video?',
    message: `The video for "${video.track?.title ?? 'this song'}" and its storyboard will be deleted.`,
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
      await deleteMusicVideoRequest(video.id).send();
      videos.value.splice(i, 1);
    } catch (e) {
      notifyError(e, "The music video couldn't be deleted.");
    }
  });
};

onMounted(() => {
  void load(true);
  loadAiAccountRequest()
    .send()
    .then((res) => (ai.value = res))
    .catch((e) => notifyError(e, "Your AI credits couldn't be loaded."));
  poll = setInterval(() => void refresh(), 10000);
});

onBeforeUnmount(() => clearInterval(poll));

useMeta(() => ({
  title: 'Music videos',
  titleTemplate: (title) => `${title} - ${boot.configuration.app_name}`,
}));
</script>

<style lang="scss" scoped>
.video-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);
  color: inherit;
  text-decoration: none;
  transition: border-color var(--tf-duration) var(--tf-ease);

  &:hover {
    border-color: var(--tf-border-strong);
  }

  &__icon {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    border-radius: var(--tf-radius-md);
    color: var(--tf-primary);
    background: var(--tf-primary-soft);
  }
}
</style>
