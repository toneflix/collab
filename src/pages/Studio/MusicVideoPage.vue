<template>
  <q-page class="p-4">
    <div class="max-w-full mx-auto md:max-w-4xl lg:max-w-5xl">
      <router-link
        :to="{ name: 'studio.videos' }"
        class="inline-flex items-center gap-1 mb-3 text-sm text-grey-5"
      >
        <q-icon name="lucide-arrow-left" size="16px" /> Music videos
      </router-link>

      <ListSkeleton avatar="square" :rows="3" v-if="!video" />

      <template v-else>
        <div class="flex items-center gap-3 mb-1 no-wrap">
          <h4
            class="text-xl font-semibold md:text-2xl flex-initial! min-w-0 truncate"
          >
            {{ video.track?.title ?? 'Music video' }}
          </h4>
          <span
            class="status-badge flex-none!"
            :class="`status-badge--${video.status}`"
            >{{ statusText[video.status] }}</span
          >
        </div>
        <p class="mb-6 text-sm text-grey-5">
          <template v-if="lyricVideo">Lyric video · </template>{{ ratioLabel
          }}<template v-if="video.quality === 'advanced'"> · Advanced</template
          ><template v-if="video.shots?.length && !lyricVideo">
            · {{ video.shots.length }} shots</template
          >
          <template v-if="video.duration">
            · {{ clock(video.duration) }}</template
          >
          <template v-if="video.brief"> · “{{ video.brief }}”</template>
        </p>

        <div class="notice notice--error mb-6" v-if="video.error">
          <q-icon name="lucide-circle-alert" size="18px" class="flex-none!" />
          <span>{{ video.error }}</span>
        </div>

        <!-- The finished video -->
        <div
          class="mb-8"
          v-if="video.status === 'ready' && video.videoUrl && !editingShots"
        >
          <video
            controls
            playsinline
            preload="metadata"
            class="player"
            :src="video.videoUrl"
            :poster="video.shots?.[0]?.keyframeUrl ?? undefined"
            :style="{ aspectRatio: aspect }"
          />
          <div class="flex flex-wrap justify-end gap-2 mt-3">
            <VideoLyricsMenu
              :video="video"
              :disable="rendering"
              @saved="onLyrics"
            />
            <q-btn
              flat
              rounded
              no-caps
              icon="lucide-refresh-cw"
              label="Resync"
              class="flex-none!"
              :loading="rendering"
              @click="render"
              v-if="!video.edited"
            >
              <q-tooltip
                >Cut the shots over the song again, free. Fixes a video that
                drifts out of sync.</q-tooltip
              >
            </q-btn>
            <q-btn
              outline
              rounded
              no-caps
              icon="lucide-scissors"
              label="Edit shots"
              class="flex-none!"
              @click="editingShots = true"
              v-if="video.shots?.length"
            />
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

        <VideoShorts
          class="mb-8"
          :video="video"
          v-if="video.status === 'ready' && video.videoUrl && !editingShots"
        />

        <!-- Working on it -->
        <div class="notice mb-6" v-if="busy">
          <q-spinner-dots size="20px" color="toneflix" class="flex-none!" />
          <span v-if="lyricVideo">
            Making the lyric video. This takes a minute or two.
          </span>
          <span v-else-if="video.status === 'planning'">
            Planning the shots on the beat and drawing a still for each one.
            This takes a few minutes.
          </span>
          <span v-else>
            Making the video. A song of a few minutes takes around half an hour.
            You can leave this page and come back.
          </span>
        </div>

        <!-- Retry a failed storyboard -->
        <div class="render-bar mb-6" v-if="video.status === 'failed'">
          <div class="min-w-0">
            <div class="font-semibold">
              {{
                missingStills
                  ? 'Draw the missing scenes'
                  : 'Draw the storyboard again'
              }}
            </div>
            <div class="text-xs text-grey-5">
              <template v-if="missingStills">
                Scenes already drawn are kept; only the
                {{ missingStills }} missing
                {{ missingStills === 1 ? 'one is' : 'ones are' }} drawn again.
              </template>
              {{ retryCost.toLocaleString() }} credits<template v-if="ai">
                · {{ ai.balance.total.toLocaleString() }} left</template
              >
              <template v-if="retryShort">
                ·
                <router-link :to="{ name: 'studio.credits' }"
                  >Get credits</router-link
                >
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

        <!-- Save bar -->
        <div class="render-bar mb-6" v-if="canEdit">
          <div class="min-w-0">
            <div class="font-semibold">
              {{
                video.status === 'storyboard'
                  ? 'Happy with the storyboard?'
                  : 'Save your changes'
              }}
            </div>
            <div class="text-xs text-grey-5">
              <template v-if="cost.seconds === 0"
                >Free. Your shots are cut together again; nothing is
                redrawn.</template
              >
              <template v-else-if="paysWithMinutes">
                Makes {{ cost.shots }}
                {{ cost.shots === 1 ? 'shot' : 'shots' }} · uses
                {{ planTime(planSeconds) }} of your
                {{ planTime(secondsLeft) }} video time.
              </template>
              <template v-else>
                Makes {{ cost.shots }}
                {{ cost.shots === 1 ? 'shot' : 'shots' }} ·
                {{ cost.credits.toLocaleString() }} credits<template v-if="ai">
                  · {{ ai.balance.total.toLocaleString() }} left</template
                >
                <template v-if="short">
                  ·
                  <router-link :to="{ name: 'studio.credits' }"
                    >Get credits</router-link
                  >
                </template>
              </template>
            </div>
          </div>
          <div class="flex gap-2 flex-none!">
            <VideoLyricsMenu
              :video="video"
              :disable="rendering || pending"
              @saved="onLyrics"
              v-if="video.status === 'storyboard'"
            />
            <q-btn
              flat
              rounded
              no-caps
              label="Discard changes"
              class="flex-none!"
              :loading="discarding"
              :disable="rendering"
              @click="discard"
              v-if="video.status === 'ready' && video.edited"
            />
            <q-btn
              flat
              rounded
              no-caps
              label="Done"
              class="flex-none!"
              @click="editingShots = false"
              v-else-if="video.status === 'ready'"
            />
            <q-btn
              unelevated
              rounded
              no-caps
              color="toneflix"
              text-color="dark"
              :icon="
                video.status === 'storyboard'
                  ? 'lucide-clapperboard'
                  : 'lucide-save'
              "
              :label="
                video.status === 'storyboard' ? 'Make the video' : 'Save video'
              "
              class="flex-none!"
              :loading="rendering"
              :disable="
                short || pending || (video.status === 'ready' && !video.edited)
              "
              @click="render"
            />
          </div>
        </div>

        <ShotEditor
          ref="editor"
          class="mb-8"
          :video="video"
          :still-credits="ai?.costs.videoStoryboard ?? 0"
          :own-photos="ownPhotos"
          :stream-url="streamUrl"
          @saved="onSaved"
          @pending="pending = $event"
          v-if="canEdit && video.shots?.length"
        />

        <!-- Cast -->
        <template v-if="video.characters?.length">
          <h5 class="mb-1 text-base font-semibold">Cast</h5>
          <p class="mb-3 text-xs text-grey-5">
            Every still of a character is drawn from their sheet, so they look
            the same in each shot.
          </p>
          <div class="grid gap-3 mb-8 grid-cols-2 lg:grid-cols-3">
            <div
              class="cast"
              :key="character.id"
              v-for="character in video.characters"
            >
              <a
                class="cast__sheet"
                target="_blank"
                rel="noopener"
                :href="character.sheetUrl"
                v-if="character.sheetUrl"
              >
                <img
                  :src="character.sheetUrl"
                  :alt="`${character.name} character sheet`"
                  loading="lazy"
                />
              </a>
              <div class="cast__sheet" v-else>
                <q-spinner-dots size="20px" color="toneflix" v-if="busy" />
                <q-icon
                  name="lucide-image-off"
                  size="24px"
                  class="text-grey-7"
                  v-else
                />
              </div>
              <div class="p-3">
                <div
                  class="flex items-center gap-2 text-sm font-semibold no-wrap"
                >
                  <q-icon
                    name="lucide-mic-vocal"
                    size="14px"
                    class="flex-none! text-toneflix"
                    v-if="character.singer"
                  />
                  <span class="truncate">{{ character.name }}</span>
                  <IconBtn
                    size="sm"
                    class="flex-none! ml-auto"
                    :icon="
                      character.savedId
                        ? 'lucide-bookmark-check'
                        : 'lucide-bookmark-plus'
                    "
                    :color="character.savedId ? 'toneflix' : undefined"
                    :tooltip="
                      character.savedId
                        ? 'In My characters'
                        : 'Save to My characters'
                    "
                    :aria-label="
                      character.savedId
                        ? 'In My characters'
                        : 'Save to My characters'
                    "
                    :loading="keeping === character.id"
                    @click="keep(character)"
                    v-if="character.sheetUrl"
                  />
                </div>
                <div
                  class="mt-1 text-xs text-grey-5 line-clamp-2 sm:line-clamp-3"
                >
                  {{ character.description }}
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- Storyboard -->
        <template v-if="video.shots?.length && !canEdit && !lyricVideo">
          <h5 class="mb-3 text-base font-semibold">Storyboard</h5>
          <div class="grid gap-3" :class="gridClass">
            <div class="shot" :key="shot.id" v-for="shot in video.shots">
              <div class="shot__still" :style="{ aspectRatio: aspect }">
                <img
                  :src="shot.keyframeUrl"
                  alt=""
                  loading="lazy"
                  v-if="shot.keyframeUrl"
                />
                <q-icon
                  name="lucide-image-off"
                  size="24px"
                  class="text-grey-7"
                  v-else
                />
                <span class="shot__kind">
                  <q-icon
                    :name="
                      shot.kind === 'performance'
                        ? 'lucide-mic-vocal'
                        : 'lucide-film'
                    "
                    size="12px"
                  />
                  {{ shot.kind === 'performance' ? 'Singing' : 'Scene' }}
                </span>
                <span class="shot__time"
                  >{{ clock(shot.start) }}–{{ clock(shot.end) }}</span
                >
                <span class="shot__cast" v-if="castOf(shot)">
                  <q-icon name="lucide-users" size="12px" />
                  {{ castOf(shot) }}
                </span>
              </div>
              <div class="p-3">
                <div
                  class="mb-1 flex items-center gap-1 text-xs text-grey-6"
                  v-if="placeOf(shot)"
                >
                  <q-icon name="lucide-map-pin" size="12px" />
                  {{ placeOf(shot) }}
                </div>
                <p class="text-sm text-grey-4 shot__prompt">
                  {{ shot.prompt }}
                </p>
              </div>
            </div>
          </div>
        </template>

        <div
          class="grid gap-3"
          :class="gridClass"
          v-else-if="video.status === 'planning'"
        >
          <q-skeleton
            dark
            square
            class="rounded-lg"
            :style="{ aspectRatio: aspect }"
            :key="n"
            v-for="n in 6"
          />
        </div>
      </template>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useMeta } from 'quasar';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import ShotEditor from 'src/components/Studio/ShotEditor.vue';
import VideoLyricsMenu from 'src/components/Studio/VideoLyricsMenu.vue';
import VideoShorts from 'src/components/Studio/VideoShorts.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notifyError } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';
import { loadAiAccountRequest, type AiAccount } from 'src/utils/requests/ai';
import { loadTrackRequest } from 'src/utils/requests/requests';
import {
  discardMusicVideoEditsRequest,
  keepVideoCharacterRequest,
  loadMusicVideoRequest,
  minuteRate,
  renderMusicVideoRequest,
  renderRate,
  retryStoryboardRequest,
  storyboardRate,
  VIDEO_RATIOS,
  videoBusy,
  type MusicVideo,
  type MusicVideoCharacter,
  type MusicVideoShot,
  type MusicVideoStatus,
} from 'src/utils/requests/videos';
import { saveCost } from 'src/utils/video-strip';

defineOptions({ name: 'MusicVideoPage' });

const route = useRoute();
const router = useRouter();
const boot = useBootstrapStore();

const video = ref<MusicVideo | null>(null);
const ai = ref<AiAccount | null>(null);
const secondsLeft = ref(0);
const streamUrl = ref<string | null>(null);
const rendering = ref(false);
const retrying = ref(false);
const discarding = ref(false);
const editingShots = ref(false);
const pending = ref(false);
const editor = ref<InstanceType<typeof ShotEditor> | null>(null);
let poll: ReturnType<typeof setInterval> | undefined;
let drawPoll: ReturnType<typeof setInterval> | undefined;

const statusText: Record<MusicVideoStatus, string> = {
  planning: 'Planning',
  storyboard: 'Storyboard',
  rendering: 'Making the video',
  ready: 'Ready',
  failed: 'Failed',
};

const busy = computed(() => !!video.value && videoBusy(video.value));
const lyricVideo = computed(() => video.value?.mode === 'lyrics');
const ownPhotos = ref(false);
const drawing = computed(
  () => !!video.value?.shots?.some((shot) => shot.drawing),
);
const aspect = computed(() =>
  (video.value?.ratio ?? '16:9').replace(':', ' / '),
);
const ratioLabel = computed(() => {
  const ratio = VIDEO_RATIOS.find((r) => r.value === video.value?.ratio);
  return ratio ? `${ratio.label} ${ratio.value}` : video.value?.ratio;
});
const gridClass = computed(() =>
  video.value?.ratio === '9:16'
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
);

/** The storyboard is always open to changes; a finished video opens them with Edit shots */
const canEdit = computed(
  () =>
    !!video.value &&
    (video.value.status === 'storyboard' ||
      (video.value.status === 'ready' && editingShots.value)),
);

/** What saving costs: free when it only cuts the shots together again */
const cost = computed(() =>
  video.value && ai.value
    ? saveCost(
        video.value,
        video.value.shots ?? [],
        renderRate(ai.value.costs, video.value.quality),
      )
    : { shots: 0, seconds: 0, credits: 0 },
);
/** Plan video time the save uses, at the video's quality */
const planSeconds = computed(() =>
  ai.value && video.value
    ? cost.value.seconds * minuteRate(ai.value.costs, video.value.quality)
    : cost.value.seconds,
);
const paysWithMinutes = computed(
  () => cost.value.seconds > 0 && secondsLeft.value >= planSeconds.value,
);
const short = computed(
  () =>
    cost.value.credits > 0 &&
    !paysWithMinutes.value &&
    !!ai.value &&
    ai.value.balance.total < cost.value.credits,
);

/** Each still to draw, with whether it is drawn; shots of one frame share a still */
const stills = computed(() => {
  const drawn = new Map<string, boolean>();
  (video.value?.shots ?? []).forEach((shot) => {
    const key = shot.frame || `shot-${shot.id}`;
    drawn.set(key, (drawn.get(key) ?? false) || !!shot.keyframeUrl);
  });
  return [...drawn.values()];
});
const missingStills = computed(
  () => stills.value.filter((drawn) => !drawn).length,
);
const retryCost = computed(() => {
  const rate =
    video.value && ai.value
      ? storyboardRate(ai.value.costs, video.value.mode)
      : 0;
  const full = rate * Math.max(1, video.value?.minutes ?? 1);
  const total = stills.value.length;
  return total
    ? Math.max(1, Math.ceil((full * missingStills.value) / total))
    : full;
});
const retryShort = computed(
  () => !!ai.value && ai.value.balance.total < retryCost.value,
);

/** Name of the location a shot is in */
const placeOf = (shot: MusicVideoShot) =>
  video.value?.locations?.find((l) => l.key === shot.location)?.name ?? '';

const keeping = ref<number | null>(null);

/** Saves a cast member to the creator's characters, or opens them when saved */
const keep = async (character: MusicVideoCharacter) => {
  if (character.savedId) {
    void router.push({ name: 'studio.videos.characters' });
    return;
  }
  keeping.value = character.id;
  try {
    const res = await keepVideoCharacterRequest(
      video.value!.id,
      character.id,
    ).send();
    character.savedId = res.data.id;
    notify(res.message, 'success');
  } catch (e) {
    notifyError(e, "The character couldn't be saved.");
  } finally {
    keeping.value = null;
  }
};

/** Names of the characters seen in a shot */
const castOf = (shot: MusicVideoShot) =>
  (shot.characters ?? [])
    .map(
      (key) =>
        video.value?.characters?.find((character) => character.key === key)
          ?.name,
    )
    .filter(Boolean)
    .join(', ');

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** Plan video time, like "1 min 20 s" */
const planTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return [minutes ? `${minutes} min` : '', rest || !minutes ? `${rest} s` : '']
    .filter(Boolean)
    .join(' ');
};

const load = async () => {
  try {
    const res = await loadMusicVideoRequest(
      String(route.params.video_id),
    ).send();
    video.value = res.data;
    secondsLeft.value = res.secondsLeft ?? (res.minutesLeft ?? 0) * 60;
    ownPhotos.value = !!res.ownPhotos;
    if (res.data.status === 'ready' && res.data.edited)
      editingShots.value = true;
  } catch (e) {
    notifyError(e, "The music video couldn't be loaded.");
  }
};

/** The song, so the editor's preview plays with sound */
const loadSong = async (track: number) => {
  try {
    const res = await loadTrackRequest(String(track), {
      with: 'streamUrl',
    }).send();
    streamUrl.value = res.streamUrl || null;
  } catch {
    streamUrl.value = null;
  }
};

const onSaved = (saved: MusicVideo) => {
  const drew = saved.shots?.some((shot) => shot.drawing) && !drawing.value;

  video.value = saved;
  if (drew) void loadAccount();
};

const onLyrics = (saved: MusicVideo) => {
  video.value = saved;
  if (saved.status === 'ready' && saved.edited) editingShots.value = true;
};

const render = async () => {
  if (!video.value) return;
  rendering.value = true;
  try {
    await editor.value?.flush();
    const res = await renderMusicVideoRequest(video.value.id).send();
    video.value = res.data;
    editingShots.value = false;
    notify(res.message, 'success');
    void loadAccount();
  } catch (e) {
    notifyError(e, "The video couldn't be started.");
  } finally {
    rendering.value = false;
  }
};

const discard = async () => {
  if (!video.value) return;
  discarding.value = true;
  try {
    await editor.value?.flush();
    const res = await discardMusicVideoEditsRequest(video.value.id).send();
    video.value = res.data;
    editingShots.value = false;
    notify(res.message, 'success');
  } catch (e) {
    notifyError(e, "The changes couldn't be discarded.");
  } finally {
    discarding.value = false;
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

watch(
  () => video.value?.trackId,
  (track) => {
    if (track && !streamUrl.value) void loadSong(track);
  },
);

onMounted(() => {
  void load();
  void loadAccount();
  poll = setInterval(() => {
    if (busy.value) void load();
  }, 8000);
  drawPoll = setInterval(() => {
    if (drawing.value) void load();
  }, 4000);
});

onBeforeUnmount(() => {
  clearInterval(poll);
  clearInterval(drawPoll);
});

useMeta(() => ({
  title: video.value?.track?.title
    ? `${video.value.track.title} ${lyricVideo.value ? 'lyric' : 'music'} video`
    : 'Music video',
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

.cast {
  overflow: hidden;
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);

  &__sheet {
    display: grid;
    place-items: center;
    aspect-ratio: 16 / 9;
    background: var(--tf-surface-2);

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
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
  &__time,
  &__cast {
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

  &__cast {
    top: auto;
    bottom: 8px;
    left: 8px;
    max-width: calc(100% - 16px);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__prompt {
    display: -webkit-box;
    overflow: hidden;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
  }
}
</style>
