<template>
  <q-page class="p-4">
    <div class="max-w-full mx-auto md:max-w-4xl lg:max-w-5xl">
      <router-link :to="{ name: 'studio.videos' }" class="inline-flex items-center gap-1 mb-3 text-sm text-grey-5">
        <q-icon name="lucide-arrow-left" size="16px" /> Music videos
      </router-link>

      <ListSkeleton avatar="square" :rows="3" v-if="!video" />

      <template v-else>
        <div class="flex items-center gap-3 mb-1 no-wrap">
          <h4 class="text-xl font-semibold md:text-2xl flex-initial! min-w-0 truncate">{{ video.track?.title ?? 'Music video' }}</h4>
          <span class="status-badge flex-none!" :class="`status-badge--${video.status}`">{{ statusText[video.status] }}</span>
        </div>
        <p class="mb-6 text-sm text-grey-5">
          {{ ratioLabel }}<template v-if="video.shots?.length"> · {{ video.shots.length }} shots</template>
          <template v-if="video.duration"> · {{ clock(video.duration) }}</template>
          <template v-if="video.brief"> · “{{ video.brief }}”</template>
        </p>

        <div class="notice notice--error mb-6" v-if="video.error">
          <q-icon name="lucide-circle-alert" size="18px" class="flex-none!" />
          <span>{{ video.error }}</span>
        </div>

        <!-- The finished video -->
        <div class="mb-8" v-if="video.status === 'ready' && video.videoUrl">
          <video
            controls
            playsinline
            preload="metadata"
            class="player"
            :src="video.videoUrl"
            :poster="video.shots?.[0]?.keyframeUrl ?? undefined"
            :style="{ aspectRatio: aspect }"
          />
          <div class="flex justify-end mt-3">
            <q-btn
              unelevated
              rounded
              no-caps
              color="toneflix"
              text-color="dark"
              icon="lucide-download"
              label="Download"
              class="flex-none!"
              type="a"
              :href="video.videoUrl"
              :download="`${video.track?.slug ?? 'music-video'}.mp4`"
            />
          </div>
        </div>

        <!-- Working on it -->
        <div class="notice mb-6" v-if="busy">
          <q-spinner-dots size="20px" color="toneflix" class="flex-none!" />
          <span v-if="video.status === 'planning'">
            Planning the shots on the beat and drawing a still for each one. This takes a few minutes.
          </span>
          <span v-else>
            Making the video. A song of a few minutes takes around half an hour. You can leave this page and come back.
          </span>
        </div>

        <!-- Retry a failed storyboard -->
        <div class="render-bar mb-6" v-if="video.status === 'failed'">
          <div class="min-w-0">
            <div class="font-semibold">{{ missingStills ? 'Draw the missing scenes' : 'Draw the storyboard again' }}</div>
            <div class="text-xs text-grey-5">
              <template v-if="missingStills">
                Scenes already drawn are kept; only the {{ missingStills }} missing
                {{ missingStills === 1 ? 'one is' : 'ones are' }} drawn again.
              </template>
              {{ retryCost.toLocaleString() }} credits<template v-if="ai"> · {{ ai.balance.total.toLocaleString() }} left</template>
              <template v-if="retryShort">
                · <router-link :to="{ name: 'studio.credits' }">Get credits</router-link>
              </template>
            </div>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            color="toneflix"
            text-color="dark"
            icon="lucide-rotate-ccw"
            label="Try again"
            class="flex-none!"
            :loading="retrying"
            :disable="retryShort"
            @click="retry"
          />
        </div>

        <!-- Render bar -->
        <div class="render-bar mb-6" v-if="video.status === 'storyboard'">
          <div class="min-w-0">
            <div class="font-semibold">Happy with the storyboard?</div>
            <div class="text-xs text-grey-5">
              Drag shots to reorder them or change what any shot shows, then make the video.
              <template v-if="paysWithMinutes">
                Uses {{ video.minutes }} of your {{ minutesLeft }} video {{ minutesLeft === 1 ? 'minute' : 'minutes' }}.
              </template>
              <template v-else>
                {{ renderCost.toLocaleString() }} credits<template v-if="ai"> · {{ ai.balance.total.toLocaleString() }} left</template>
                <template v-if="short">
                  · <router-link :to="{ name: 'studio.credits' }">Get credits</router-link>
                </template>
              </template>
            </div>
          </div>
          <q-btn
            unelevated
            rounded
            no-caps
            color="toneflix"
            text-color="dark"
            icon="lucide-clapperboard"
            label="Make the video"
            class="flex-none!"
            :loading="rendering"
            :disable="short || editing !== null"
            @click="render"
          />
        </div>

        <!-- Storyboard -->
        <template v-if="video.shots?.length">
          <h5 class="mb-3 text-base font-semibold">Storyboard</h5>
          <div ref="board" class="grid gap-3" :class="[gridClass, { 'storyboard--sortable': sortable }]">
            <div class="shot" :key="shot.id" v-for="shot in video.shots">
              <div class="shot__still" :style="{ aspectRatio: aspect }">
                <img :src="shot.keyframeUrl" alt="" loading="lazy" v-if="shot.keyframeUrl" />
                <q-icon name="lucide-image-off" size="24px" class="text-grey-7" v-else />
                <span class="shot__kind">
                  <q-icon :name="shot.kind === 'performance' ? 'lucide-mic-vocal' : 'lucide-film'" size="12px" />
                  {{ shot.kind === 'performance' ? 'Singing' : 'Scene' }}
                </span>
                <span class="shot__time">{{ clock(shot.start) }}–{{ clock(shot.end) }}</span>
              </div>
              <div class="p-3">
                <template v-if="editing === shot.id">
                  <q-input
                    dark
                    filled
                    dense
                    autogrow
                    autofocus
                    maxlength="600"
                    v-model="draft"
                    @keydown.enter.ctrl.prevent="saveShot(shot)"
                    @keydown.esc="editing = null"
                  />
                  <div class="mt-1 text-[11px] text-grey-6">The still stays; the words guide how the shot moves.</div>
                  <div class="flex justify-end gap-1 mt-2">
                    <q-btn flat dense rounded no-caps size="sm" label="Cancel" class="flex-none! px-3" @click="editing = null" />
                    <q-btn
                      unelevated
                      dense
                      rounded
                      no-caps
                      size="sm"
                      color="toneflix"
                      text-color="dark"
                      label="Save"
                      class="flex-none! px-3"
                      :loading="savingShot"
                      :disable="draft.trim().length < 3"
                      @click="saveShot(shot)"
                    />
                  </div>
                </template>
                <div class="flex items-start gap-2 no-wrap" v-else>
                  <p class="flex-1 min-w-0 text-sm text-grey-4 shot__prompt">{{ shot.prompt }}</p>
                  <IconBtn
                    size="sm"
                    icon="lucide-pencil"
                    aria-label="Change this shot"
                    class="flex-none!"
                    @click="edit(shot)"
                    v-if="video.status === 'storyboard'"
                  />
                </div>
              </div>
            </div>
          </div>
        </template>

        <div class="grid gap-3" :class="gridClass" v-else-if="video.status === 'planning'">
          <q-skeleton dark square class="rounded-lg" :style="{ aspectRatio: aspect }" :key="n" v-for="n in 6" />
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import Sortable, { type SortableEvent } from 'sortablejs';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notifyError } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';
import { loadAiAccountRequest, type AiAccount } from 'src/utils/requests/ai';
import {
  loadMusicVideoRequest,
  renderMusicVideoRequest,
  retryStoryboardRequest,
  reorderMusicVideoShotsRequest,
  updateMusicVideoShotRequest,
  VIDEO_RATIOS,
  videoBusy,
  type MusicVideo,
  type MusicVideoShot,
  type MusicVideoStatus,
} from 'src/utils/requests/videos';

defineOptions({ name: 'MusicVideoPage' });

const route = useRoute();
const boot = useBootstrapStore();

const video = ref<MusicVideo | null>(null);
const ai = ref<AiAccount | null>(null);
const minutesLeft = ref(0);
const rendering = ref(false);
const editing = ref<number | null>(null);
const draft = ref('');
const savingShot = ref(false);
const retrying = ref(false);
let poll: ReturnType<typeof setInterval> | undefined;

const statusText: Record<MusicVideoStatus, string> = {
  planning: 'Planning',
  storyboard: 'Storyboard',
  rendering: 'Making the video',
  ready: 'Ready',
  failed: 'Failed',
};

const busy = computed(() => !!video.value && videoBusy(video.value));
const aspect = computed(() => (video.value?.ratio ?? '16:9').replace(':', ' / '));
const ratioLabel = computed(() => {
  const ratio = VIDEO_RATIOS.find((r) => r.value === video.value?.ratio);
  return ratio ? `${ratio.label} ${ratio.value}` : video.value?.ratio;
});
const gridClass = computed(() =>
  video.value?.ratio === '9:16' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
);

const paysWithMinutes = computed(() => !!video.value && minutesLeft.value >= video.value.minutes);
const renderCost = computed(() => (ai.value?.costs.video ?? 0) * Math.max(1, video.value?.minutes ?? 1));
const short = computed(() => !paysWithMinutes.value && !!ai.value && ai.value.balance.total < renderCost.value);

const missingStills = computed(() => video.value?.shots?.filter((shot) => !shot.keyframeUrl).length ?? 0);
const retryCost = computed(() => {
  const full = (ai.value?.costs.videoStoryboard ?? 0) * Math.max(1, video.value?.minutes ?? 1);
  const total = video.value?.shots?.length ?? 0;
  return total ? Math.max(1, Math.ceil((full * missingStills.value) / total)) : full;
});
const retryShort = computed(() => !!ai.value && ai.value.balance.total < retryCost.value);

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

const load = async () => {
  try {
    const res = await loadMusicVideoRequest(String(route.params.video_id)).send();
    video.value = res.data;
    minutesLeft.value = res.minutesLeft ?? 0;
  } catch (e) {
    notifyError(e, "The music video couldn't be loaded.");
  }
};

const edit = (shot: MusicVideoShot) => {
  editing.value = shot.id;
  draft.value = shot.prompt;
};

const saveShot = async (shot: MusicVideoShot) => {
  if (!video.value || draft.value.trim().length < 3) return;
  savingShot.value = true;
  try {
    const res = await updateMusicVideoShotRequest(video.value.id, shot.id, draft.value.trim()).send();
    Object.assign(shot, res.data);
    editing.value = null;
  } catch (e) {
    notifyError(e, "The shot couldn't be changed.");
  } finally {
    savingShot.value = false;
  }
};

const render = async () => {
  if (!video.value) return;
  rendering.value = true;
  try {
    const res = await renderMusicVideoRequest(video.value.id).send();
    video.value = res.data;
    notify(res.message, 'success');
    void loadAccount();
  } catch (e) {
    notifyError(e, "The video couldn't be started.");
  } finally {
    rendering.value = false;
  }
};

const retry = async () => {
  if (!video.value) return;
  retrying.value = true;
  try {
    const res = await retryStoryboardRequest(video.value.id).send();
    video.value = res.data;
    notify(res.message, 'success');
    void loadAccount();
  } catch (e) {
    notifyError(e, "The storyboard couldn't be started again.");
  } finally {
    retrying.value = false;
  }
};

const loadAccount = () =>
  loadAiAccountRequest()
    .send()
    .then((res) => (ai.value = res))
    .catch(() => (ai.value = null));

onMounted(() => {
  void load();
  void loadAccount();
  poll = setInterval(() => {
    if (busy.value) void load();
  }, 8000);
});

/** Shots can be dragged into a new order until the video is rendered */
const board = ref<HTMLElement | null>(null);
const sortable = computed(() => video.value?.status === 'storyboard' && editing.value === null);
let sorter: Sortable | null = null;

/** Puts the dragged shot in its new place, in the time slot of that place */
const reorder = async (from: number, to: number) => {
  if (!video.value?.shots || from === to) return;
  const before = video.value.shots;
  const slots = before.map((shot) => [shot.start, shot.end] as const);
  const moved = [...before];
  moved.splice(to, 0, ...moved.splice(from, 1));
  video.value.shots = moved.map((shot, i) => {
    const [start, end] = slots[i]!;
    return { ...shot, position: i + 1, start, end, rendered: shot.rendered && shot.start === start };
  });
  try {
    const res = await reorderMusicVideoShotsRequest(video.value.id, moved.map((shot) => shot.id)).send();
    video.value = res.data;
  } catch (e) {
    if (video.value) video.value.shots = before;
    notifyError(e, "The shots couldn't be reordered.");
  }
};

const onSorted = (e: SortableEvent) => {
  const { item, from, oldIndex, newIndex } = e;
  if (oldIndex === undefined || newIndex === undefined) return;
  // Hand the DOM back to Vue, which redraws the list in its new order.
  item.remove();
  from.insertBefore(item, from.children[oldIndex] ?? null);
  void reorder(oldIndex, newIndex);
};

watch(
  board,
  (el) => {
    sorter?.destroy();
    sorter = el
      ? Sortable.create(el, {
          animation: 150,
          delay: 150,
          delayOnTouchOnly: true,
          ghostClass: 'shot--ghost',
          disabled: !sortable.value,
          onUpdate: onSorted,
        })
      : null;
  },
  { flush: 'post' },
);
watch(sortable, (on) => sorter?.option('disabled', !on));

onBeforeUnmount(() => {
  clearInterval(poll);
  sorter?.destroy();
});

useMeta(() => ({
  title: video.value?.track?.title ? `${video.value.track.title} music video` : 'Music video',
  titleTemplate: (title) => `${title} - ${boot.configuration.app_name}`,
}));
</script>

<style lang="scss" scoped>
.status-badge {
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 999px;
  color: var(--tf-primary);
  background: var(--tf-primary-soft);

  &--ready {
    color: #4ade80;
    background: rgba(74, 222, 128, 0.12);
  }

  &--failed {
    color: #f87171;
    background: rgba(248, 113, 113, 0.12);
  }
}

.notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  font-size: 14px;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);

  &--error {
    color: #fca5a5;
    border-color: rgba(248, 113, 113, 0.3);
  }
}

.player {
  display: block;
  width: 100%;
  max-height: 70vh;
  border-radius: var(--tf-radius-lg);
  background: #000;
}

.render-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--tf-border-strong);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-2);
}

.storyboard--sortable .shot {
  cursor: grab;
}

.shot--ghost {
  opacity: 0.35;
}

.shot {
  overflow: hidden;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);

  &__still {
    position: relative;
    display: grid;
    place-items: center;
    background: var(--tf-surface-2);

    img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__kind,
  &__time {
    position: absolute;
    top: 8px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    font-size: 11px;
    border-radius: 999px;
    color: #fff;
    background: rgba(0, 0, 0, 0.6);
  }

  &__kind {
    left: 8px;
  }

  &__time {
    right: 8px;
    font-variant-numeric: tabular-nums;
  }

  &__prompt {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }
}
</style>
