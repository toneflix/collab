<template>
  <q-dialog
    position="right"
    :maximized="$q.screen.lt.sm"
    :model-value="!!runId"
    @update:model-value="(open) => !open && emit('close')"
  >
    <q-card class="run bg-dark">
      <q-card-section class="flex items-center gap-2 run__head">
        <div class="text-lg font-bold">Run #{{ runId }}</div>
        <q-badge
          rounded
          class="flex-none!"
          :color="runStatusLabels[run.status].color"
          :label="runStatusLabels[run.status].label"
          v-if="run"
        />
        <q-space />
        <IconBtn size="sm" icon="lucide-x" aria-label="Close" class="flex-none!" @click="emit('close')" />
      </q-card-section>

      <q-card-section class="grid content-start gap-5" v-if="run">
        <div>
          <div class="whitespace-pre-line">{{ run.prompt }}</div>
          <div class="mt-2 text-sm text-grey-5">
            <template v-if="run.owner">For <span class="text-white">@{{ run.owner.username }}</span> · </template>
            <template v-if="run.queuedBy">queued by {{ run.queuedBy.name }} · </template>
            {{ run.credits }} credits used
            · {{ run.options.publish ? 'publishes albums' : 'albums stay drafts' }}
            <template v-if="run.options.artwork"> · draws artwork</template>
          </div>
          <q-linear-progress
            rounded
            size="6px"
            color="toneflix"
            track-color="grey-9"
            class="mt-3"
            :value="run.progress.total ? run.progress.done / run.progress.total : 0"
            v-if="run.progress?.total"
          />
        </div>

        <q-banner rounded dense class="text-white bg-red-10" v-if="run.error">
          {{ run.error }}
          <div class="mt-1 text-xs opacity-70" v-if="run.failure && run.failure !== run.error">{{ run.failure }}</div>
        </q-banner>

        <div class="text-grey-5" v-if="run.status === 'queued'">Waiting for the runs before it.</div>
        <div class="flex items-center gap-2 text-grey-5" v-else-if="run.status === 'planning'">
          <q-spinner-dots class="flex-none!" color="toneflix" /> Planning artists, albums and tracks.
        </div>

        <div class="grid gap-2" v-if="artists.length">
          <div class="text-sm font-bold text-grey-5">Artists</div>
          <div class="flex flex-wrap gap-2">
            <q-chip
              dark
              clickable
              class="flex-none!"
              icon="lucide-mic-vocal"
              :key="artist.key"
              :label="artist.name"
              :to="artist.id ? { name: 'artist', params: { artist_id: artist.id } } : undefined"
              v-for="artist in artists"
            >
              <q-tooltip v-if="artist.voice">{{ artist.voice }}</q-tooltip>
            </q-chip>
          </div>
        </div>

        <div class="album" :key="album.key" v-for="album in albums">
          <div class="flex no-wrap items-start gap-2 album__head">
            <q-icon name="lucide-disc-3" size="20px" class="flex-none! mt-1" />
            <div class="min-w-0">
              <div class="font-bold">{{ album.title }}</div>
              <div class="text-sm text-grey-5">{{ album.artist }} · {{ countStr(album.tracks.length, 'track') }}</div>
              <div class="text-xs" :class="album.cover.color" :title="album.cover.title" v-if="album.cover">
                {{ album.cover.label }}
              </div>
            </div>
            <q-space />
            <StepState class="flex-none!" :step="album.release" v-if="album.releases" />
            <span class="text-sm text-grey-5 flex-none!" v-else>Project only</span>
            <IconBtn
              size="sm"
              icon="lucide-trash-2"
              class="flex-none!"
              label="Remove from the run"
              @click="removePart(`album:${album.key}`, album.title)"
              v-if="canRetry"
            />
          </div>

          <q-list dense>
            <q-item :key="track.key" v-for="(track, i) in album.tracks">
              <q-item-section avatar class="text-grey-6">{{ i + 1 }}</q-item-section>
              <q-item-section>
                <q-item-label>
                  {{ track.title }}<span class="text-grey-5" v-if="track.featured"> (feat. {{ track.featured }})</span>
                </q-item-label>
                <q-item-label caption>{{ track.instrumental ? 'Instrumental' : 'Vocals' }} · {{ track.style }}</q-item-label>
                <q-item-label caption class="text-red-4 whitespace-pre-line" v-if="track.error">{{ track.error }}</q-item-label>
                <q-item-label caption class="text-orange-4 whitespace-pre-line" v-else-if="track.lyrics">{{ track.lyrics }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <span class="text-sm" :class="track.color">{{ track.state }}</span>
              </q-item-section>
              <q-item-section side class="pl-1" v-if="canRetry && track.state !== 'Ready'">
                <IconBtn
              size="sm"
              icon="lucide-trash-2"
              class="flex-none!"
              label="Remove from the run"
              @click="removePart(`track:${track.key}`, track.title)"
             
            />
              </q-item-section>
            </q-item>
          </q-list>

          <div class="flex flex-wrap gap-2 mt-2" v-if="album.links.length">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              class="flex-none!"
              :key="link.label"
              :icon="link.icon"
              :label="link.label"
              :to="link.to"
              v-for="link in album.links"
            />
          </div>
        </div>

        <div class="album" :key="item.key" v-for="item in releases">
          <div class="flex no-wrap items-start gap-2 album__head">
            <q-icon name="lucide-folder-open" size="20px" class="flex-none! mt-1" />
            <div class="min-w-0">
              <div class="font-bold">
                {{ item.title }}<span class="font-normal text-grey-5" v-if="item.version"> ({{ item.version }})</span>
              </div>
              <div class="text-sm text-grey-5">
                Release of “{{ item.project }}” · {{ item.artist }} · {{ countStr(item.tracks.length, 'track') }}
                <template v-if="item.retire"> · replaces earlier versions</template>
              </div>
              <div class="text-xs" :class="item.cover.color" :title="item.cover.title" v-if="item.cover">
                {{ item.cover.label }}
              </div>
            </div>
            <q-space />
            <StepState class="flex-none!" :step="item.release" />
            <IconBtn
              size="sm"
              icon="lucide-trash-2"
              class="flex-none!"
              label="Remove from the run"
              @click="removePart(`release:${item.key}`, item.title)"
              v-if="canRetry && item.release?.status !== 'done'"
            />
          </div>

          <q-list dense>
            <q-item :key="track.id" v-for="(track, i) in item.tracks">
              <q-item-section avatar class="text-grey-6">{{ i + 1 }}</q-item-section>
              <q-item-section>
                <q-item-label>{{ track.title }}</q-item-label>
                <q-item-label caption class="text-red-4 whitespace-pre-line" v-if="track.error">{{ track.error }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <span class="text-sm" :class="track.color">{{ track.state }}</span>
              </q-item-section>
            </q-item>
          </q-list>

          <div class="flex flex-wrap gap-2 mt-2" v-if="item.links.length">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              class="flex-none!"
              :key="link.label"
              :icon="link.icon"
              :label="link.label"
              :to="link.to"
              v-for="link in item.links"
            />
          </div>
        </div>

        <div class="album" :key="item.key" v-for="item in updates">
          <div class="flex no-wrap items-start gap-2 album__head">
            <q-icon name="lucide-wand-sparkles" size="20px" class="flex-none! mt-1" />
            <div class="min-w-0">
              <div class="font-bold">{{ item.title }}</div>
              <div class="text-sm text-grey-5">
                {{ item.project_id ? `Touch-up of “${item.project}”` : 'Album without a project' }}
                <template v-if="item.artist"> · {{ item.artist }}</template>
                <template v-if="item.tracks.length"> · {{ countStr(item.tracks.length, 'lyric sheet') }} to sync</template>
              </div>
              <div class="text-xs" :class="item.cover.color" :title="item.cover.title" v-if="item.cover">
                {{ item.cover.label }}
              </div>
            </div>
            <q-space />
            <IconBtn
              size="sm"
              icon="lucide-trash-2"
              class="flex-none!"
              label="Remove from the run"
              @click="removePart(`update:${item.key}`, item.title)"
              v-if="canRetry"
            />
          </div>

          <q-list dense v-if="item.tracks.length">
            <q-item :key="track.id" v-for="track in item.tracks">
              <q-item-section avatar><q-icon name="lucide-file-text" size="18px" class="text-grey-6" /></q-item-section>
              <q-item-section>
                <q-item-label>{{ track.title }}</q-item-label>
                <q-item-label caption class="text-orange-4 whitespace-pre-line" v-if="track.error">{{ track.error }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <span class="text-sm" :class="track.color">{{ track.state }}</span>
              </q-item-section>
            </q-item>
          </q-list>

          <div class="flex flex-wrap gap-2 mt-2" v-if="item.links.length">
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              class="flex-none!"
              :key="link.label"
              :icon="link.icon"
              :label="link.label"
              :to="link.to"
              v-for="link in item.links"
            />
          </div>
        </div>

        <div class="grid gap-1" v-if="songs.length">
          <div class="text-sm font-bold text-grey-5">Compositions</div>
          <q-list dense>
            <q-item
              :clickable="!!song.to"
              :to="song.to"
              :key="song.key"
              v-for="song in songs"
            >
              <q-item-section avatar><q-icon name="lucide-notebook-pen" size="18px" /></q-item-section>
              <q-item-section>{{ song.title }}</q-item-section>
              <q-item-section side><StepState :step="song.step" /></q-item-section>
              <q-item-section side class="pl-1" v-if="canRetry && song.step?.status !== 'done'">
                <IconBtn
              size="sm"
              icon="lucide-trash-2"
              class="flex-none!"
              label="Remove from the run"
              @click="removePart(`song:${song.key}`, song.title)"
             
            />
              </q-item-section>
            </q-item>
          </q-list>
        </div>
      </q-card-section>

      <q-card-section v-else-if="loading">
        <q-skeleton type="text" :key="i" v-for="i in 6" />
      </q-card-section>

      <q-card-actions align="right" class="px-4 py-3 run__foot" v-if="run && (active || canRetry)">
        <q-btn
          flat
          no-caps
          class="flex-none!"
          color="red-4"
          icon="lucide-square"
          label="Stop run"
          :loading="stopping === run.id"
          @click="stopRun"
          v-if="active"
        />
        <q-btn
          unelevated
          rounded
          no-caps
          class="flex-none!"
          color="toneflix"
          icon="lucide-rotate-ccw"
          label="Retry"
          :loading="busy"
          @click="retry"
          v-if="canRetry"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { debounce, useQuasar } from 'quasar';
import type { RouteLocationRaw } from 'vue-router';
import StepState from './AgentStepState.vue';
import { countStr, notify } from 'src/utils/helpers';
import { joinNames } from 'src/utils/credits';
import { notifyError } from 'src/utils/composer';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { useFallbackPoll } from 'src/composables/useFallbackPoll';
import { useStopAgentRun } from 'src/composables/useStopAgentRun';
import { useRealtimeChannel } from 'src/utils/realtime';
import {
  agentRunChannel,
  isActiveRun,
  loadAgentRunRequest,
  removeAgentRunPartRequest,
  retryAgentRunRequest,
  runStatusLabels,
  type AgentRun,
  type AgentRunEvent,
  type AgentScope,
  type AgentStep,
} from 'src/utils/requests/agent';

const props = defineProps<{ scope: AgentScope; runId?: number | null }>();
const emit = defineEmits<{ close: []; changed: [run: AgentRun] }>();

const $q = useQuasar();
const boot = useBootstrapStore();

const run = ref<AgentRun | null>(null);
const loading = ref(false);
const busy = ref(false);
const { stop, stopping } = useStopAgentRun(() => props.scope);

const active = computed(() => !!run.value && isActiveRun(run.value));
const canRetry = computed(() => !!run.value && ['failed', 'cancelled'].includes(run.value.status));

/** Studio pages only open for the account that owns them */
const ownsWork = computed(() => !!run.value?.owner && run.value.owner.id === boot.user?.id);

const steps = computed(() => new Map((run.value?.steps || []).map((step) => [step.key, step])));

const artists = computed(() =>
  (run.value?.plan?.artists || []).map((artist) => ({
    ...artist,
    id: steps.value.get(`artist:${artist.key}`)?.made.artistId,
  })),
);

const trackState = (key: string, instrumental: boolean) => {
  const chain = [`${instrumental ? 'track' : 'song'}:${key}`, `music:${key}`, `mix:${key}`, `lyrics:${key}`]
    .map((k) => steps.value.get(k))
    .filter((step): step is AgentStep => !!step);
  const failed = chain.find((step) => step.status === 'failed');
  const skipped = chain.find((step) => step.status === 'skipped');
  const next = chain.find((step) => step.status !== 'done');

  if (failed) return { state: 'Failed', color: 'text-red-4', error: withFailure(failed, failed.error) };
  if (skipped) return { state: 'Stopped', color: 'text-grey-6', error: null };
  if (!next) return { state: 'Ready', color: 'text-green-4', error: null, lyrics: lyricsNote(steps.value.get(`lyrics:${key}`)) };
  if (next.status === 'pending' && next.kind !== 'music') return { state: 'Waiting', color: 'text-grey-6', error: null };

  const voice = next.kind === 'music' && next.status === 'pending'
    ? next.dependsOn.map((k) => steps.value.get(k)).find((step) => step?.kind === 'voice' && step.status !== 'done')
    : undefined;

  const labels: Record<string, string> = {
    song: 'Writing lyrics',
    track: 'Adding track',
    music: voice ? 'Making the voice sample' : next.status === 'pending' ? 'Waiting for a free AI slot' : 'Making music',
    mix: 'Mixing',
    lyrics: 'Syncing lyrics',
  };

  return { state: labels[next.kind] || 'Working', color: 'text-blue-4', error: null };
};

/** A step's message, with the full error under it when the API sends one (admins only) */
const withFailure = (step: AgentStep, message: string | null) =>
  step.failure && step.failure !== message ? [message, step.failure].filter(Boolean).join('\n') : message;

/** A finished lyrics step that couldn't time the sheet */
const lyricsNote = (step?: AgentStep) =>
  step?.status === 'done' && step.synced === false ? withFailure(step, step.notice || 'Lyrics not synced') : null;

/** How a lyric sync on an existing track is coming along */
const syncState = (step?: AgentStep) => {
  if (!step || step.status === 'pending') return { state: 'Waiting', color: 'text-grey-6', error: null };
  if (step.status === 'failed') return { state: 'Failed', color: 'text-red-4', error: withFailure(step, step.error) };
  if (step.status === 'skipped') return { state: 'Stopped', color: 'text-grey-6', error: null };
  if (step.status === 'waiting') return { state: 'Syncing lyrics', color: 'text-blue-4', error: null };
  if (step.synced === false) return { state: 'Not synced', color: 'text-orange-4', error: withFailure(step, step.notice) };

  return { state: 'Synced', color: 'text-green-4', error: null };
};

/** How an album's cover is coming along */
const coverState = (step?: AgentStep) => {
  if (!step) return null;
  if (step.status === 'done' && step.notice) return { label: 'Cover art skipped', color: 'text-orange-4', title: withFailure(step, step.notice) || undefined };
  if (step.status === 'done') return { label: 'Cover art ready', color: 'text-green-4', title: undefined };
  if (step.status === 'failed' || step.status === 'skipped') return { label: 'No cover art', color: 'text-grey-6', title: withFailure(step, step.error) || undefined };
  if (step.status === 'waiting') return { label: 'Drawing cover art', color: 'text-blue-4', title: undefined };

  return { label: 'Cover art waiting', color: 'text-grey-6', title: undefined };
};

/** Pages for a project and its release, once they exist */
const workLinks = (projectId?: number, release?: AgentStep) => {
  const artistId = release?.made.artistId;
  const links: { label: string; icon: string; to: RouteLocationRaw }[] = [];

  if (release?.made.releaseId && release.published && artistId) {
    links.push({
      label: 'Album page',
      icon: 'lucide-external-link',
      to: { name: 'artist.album', params: { artist_id: artistId, album_id: release.made.releaseId } },
    });
  }

  if (ownsWork.value && projectId) {
    links.push({ label: 'Project', icon: 'lucide-folder-open', to: { name: 'studio.project', params: { project_id: projectId } } });
  }

  if (ownsWork.value && release?.made.releaseId) {
    links.push({ label: 'Release', icon: 'lucide-pencil', to: { name: 'studio.release.create', params: { release_id: release.made.releaseId } } });
  }

  return links;
};

/** How an existing track's mix for a release is coming along */
const mixState = (step?: AgentStep) => {
  if (!step || step.status === 'pending') return { state: 'Waiting', color: 'text-grey-6', error: null };
  if (step.status === 'failed') return { state: 'Failed', color: 'text-red-4', error: withFailure(step, step.error) };
  if (step.status === 'skipped') return { state: 'Stopped', color: 'text-grey-6', error: null };
  if (step.status === 'waiting') return { state: 'Mixing', color: 'text-blue-4', error: null };

  return { state: 'Ready', color: 'text-green-4', error: null };
};

const artistName = (key: string) => run.value?.plan?.artists.find((a) => a.key === key)?.name || '';

const albums = computed(() =>
  (run.value?.plan?.albums || []).map((album) => {
    const release = steps.value.get(`release:${album.key}`);
    const project = steps.value.get(`project:${album.key}`);
    const links = workLinks(project?.made.projectId, release);

    return {
      key: album.key,
      title: album.title,
      artist: artistName(album.artist),
      release,
      releases: album.release !== false,
      cover: coverState(steps.value.get(`cover:${album.key}`)),
      links,
      tracks: album.tracks.map((track) => ({
        ...track,
        ...trackState(track.key, track.instrumental),
        featured: joinNames((track.featuring ?? []).map((key) => artistName(key)).filter(Boolean)),
      })),
    };
  }),
);

const releases = computed(() =>
  (run.value?.plan?.releases || []).map((item) => {
    const release = steps.value.get(`release:${item.key}`);

    return {
      ...item,
      artist: run.value?.plan?.artists.find((a) => a.key === item.artist)?.name || '',
      release,
      cover: coverState(steps.value.get(`cover:${item.key}`)),
      links: workLinks(item.project_id, release),
      tracks: item.tracks.map((track) => ({ ...track, ...mixState(steps.value.get(`mix:${item.key}-${track.id}`)) })),
    };
  }),
);

const updates = computed(() =>
  (run.value?.plan?.updates || []).map((item) => ({
    ...item,
    cover: item.artwork ? coverState(steps.value.get(`cover:${item.key}`)) : null,
    links: workLinks(item.project_id || undefined),
    tracks: item.lyrics.map((track) => ({ ...track, ...syncState(steps.value.get(`lyrics:${item.key}-${track.id}`)) })),
  })),
);

const songs = computed(() =>
  (run.value?.plan?.songs || []).map((song) => {
    const step = steps.value.get(`song:${song.key}`);

    return {
      ...song,
      step,
      to: ownsWork.value && step?.made.songId ? { name: 'studio.composer.song', params: { song_id: step.made.songId } } : undefined,
    };
  }),
);

const load = async () => {
  if (!props.runId) return;

  loading.value = !run.value;

  try {
    const body = await loadAgentRunRequest(props.scope, props.runId).send();
    const changed = run.value && (run.value.status !== body.data.status || run.value.progress?.done !== body.data.progress?.done);
    run.value = body.data;
    if (changed) emit('changed', body.data);
  } catch (e) {
    notifyError(e, 'The run couldn\'t be loaded.');
  } finally {
    loading.value = false;
  }
};

/** Steps can finish in quick runs, so their announcements load the run once. */
const loadSoon = debounce(() => void load(), 500);

const { live } = useRealtimeChannel(
  () => (props.runId ? agentRunChannel(props.scope, boot.user?.id) : null),
  {
    'agent.run': (e: AgentRunEvent) => {
      if (e.id === props.runId) loadSoon();
    },
  },
);

useFallbackPoll({ live, active, check: load });

const act = async (request: () => Promise<{ message: string; data: AgentRun }>) => {
  busy.value = true;

  try {
    const body = await request();
    notify(body.message, 'success');
    run.value = body.data;
    emit('changed', body.data);
    void load();
  } catch (e) {
    notifyError(e, 'That didn\'t work.');
  } finally {
    busy.value = false;
  }
};

const stopRun = async () => {
  const stopped = await stop(run.value!);

  if (stopped) {
    run.value = stopped;
    emit('changed', stopped);
    void load();
  }
};

const removePart = (part: string, title: string) => {
  $q.dialog({
    dark: true,
    title: `Remove “${title}” from this run?`,
    message: 'Retry carries on without it. Anything it already made stays where it is.',
    cancel: { flat: true, noCaps: true, label: 'Keep it' },
    ok: { unelevated: true, rounded: true, noCaps: true, color: 'red-8', label: 'Remove' },
  }).onOk(() => void act(() => removeAgentRunPartRequest(props.scope, run.value!.id, part).send()));
};

const retry = () => void act(() => retryAgentRunRequest(props.scope, run.value!.id).send());

watch(
  () => props.runId,
  () => {
    run.value = null;
    void load();
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.run {
  width: 560px;
  max-width: 100vw;
  height: 100%;
  display: flex;
  flex-direction: column;

  > :nth-child(2) {
    flex: 1 1 auto;
    overflow-y: auto;
  }
}

.run__head,
.run__foot {
  border-color: rgba(255, 255, 255, 0.08);
}

.run__head {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.run__foot {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.album {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  padding: 12px;
}
</style>
