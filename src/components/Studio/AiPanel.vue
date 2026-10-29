<template>
  <slot :toggle="toggle" :open="open" :busy="busy" />
  <StudioSheet :dock="dock" v-model="open" @show="refresh" @hide="tool = null">
    <q-card dark class="ai" :class="{ 'ai--mobile': $q.screen.lt.sm }">
      <header class="ai__head">
        <IconBtn
          icon="lucide-arrow-left"
          aria-label="Back to AI tools"
          class="flex-none!"
          v-if="current"
          @click="tool = null"
        />
        <div class="ai__title min-w-0">
          <div class="text-lg font-bold">
            {{ current?.title ?? 'AI tools' }}
          </div>
          <div class="text-xs text-grey-5" v-if="account?.access">
            <b class="text-white">{{
              account.balance.total.toLocaleString()
            }}</b>
            credits left
            <template v-if="account.balance.allowance">
              · {{ account.balance.planLeft }} of
              {{ account.balance.allowance }} from your plan, back on
              {{ day(account.balance.resetsAt) }}
            </template>
          </div>
        </div>
        <IconBtn
          icon="lucide-x"
          aria-label="Close AI tools"
          class="flex-none!"
          @click="open = false"
        />
      </header>

      <div class="ai__body">
        <BlockSkeleton variant="stats" :count="4" v-if="!account" />

        <template v-if="account && !account.enabled">
          <div class="ai__notice">
            AI tools are switched off right now. Check back soon.
          </div>
        </template>

        <template v-else-if="account && !account.access">
          <div class="ai__notice">
            <div class="mb-1 font-bold">Make music with AI</div>
            Generate loops and full tracks from a prompt, and split any stem
            into vocals, drums, bass and the rest. AI tools come with Premium.
            <q-btn
              unelevated
              rounded
              no-caps
              color="toneflix"
              class="mt-4 flex-none!"
              label="See plans"
              :to="{ name: 'premium' }"
            />
          </div>
        </template>

        <template v-else-if="account">
          <div class="ai__grid" v-if="!current">
            <button
              type="button"
              class="tool"
              :key="item.key"
              v-for="item in tools"
              @click="tool = item.key"
            >
              <q-icon :name="item.icon" size="22px" class="tool__icon" />
              <div class="tool__title">{{ item.title }}</div>
              <div class="tool__text">{{ item.text }}</div>
              <div class="tool__cost">{{ item.cost }}</div>
            </button>
          </div>

          <q-form
            class="ai__section"
            v-else-if="tool === 'music'"
            @submit="generate"
          >
            <div class="ai__model">
              <q-icon name="lucide-sparkles" size="14px" class="flex-none!" />
              <span>{{ musicPrice(account.music) }}</span>
            </div>
            <q-input
              dark
              filled
              autogrow
              counter
              :maxlength="account.music.promptLength[1]"
              input-class="ai__prompt"
              :placeholder="
                account.music.lyricsLength && account.music.lyricsRequired
                  ? 'Describe the style: genre, mood, instruments, voice. Like &quot;Mellow afrobeats, warm male vocals, guitars and log drums&quot;'
                  : 'Describe it: genre, mood, instruments, tempo. Like &quot;Mellow afrobeats groove, 100 BPM, guitars and log drums&quot;'
              "
              :disable="disabled"
              v-model="form.prompt"
            />
            <div class="ai__ideas">
              <button
                type="button"
                class="ai__idea"
                :key="idea"
                v-for="idea in ideas"
                @click="useIdea(idea)"
              >
                {{ idea }}
              </button>
            </div>

            <template v-if="account.music.lyricsLength">
              <div class="mt-4 ai__label">
                Lyrics
                <span class="normal-case" v-if="!account.music.lyricsRequired">(optional)</span>
              </div>
              <q-input
                dark
                filled
                autogrow
                counter
                type="textarea"
                :maxlength="account.music.lyricsLength[1]"
                input-class="ai__lyrics"
                placeholder="[verse]&#10;Write the words to sing&#10;[chorus]&#10;..."
                :hint="
                  account.music.lyricsRequired
                    ? 'Mark parts with [verse], [chorus], [bridge] and [outro].'
                    : `Mark parts with [verse], [chorus] and [bridge]. Leave it empty and AI writes the lyrics.`
                "
                :disable="disabled"
                v-model="form.lyrics"
              />
            </template>

            <template v-if="account.music.maxSeconds">
              <div class="mt-4 text-sm">
                Length <b>{{ clock(form.seconds) }}</b>
              </div>
              <q-slider
                dark
                color="toneflix"
                :min="minSeconds"
                :max="account.music.maxSeconds"
                :step="5"
                v-model="form.seconds"
              />
              <div class="text-xs text-grey-6" v-if="lengthIgnored">
                The length is followed when you write lyrics or ask for an
                instrumental. Otherwise AI picks one.
              </div>
            </template>
            <div class="mt-4 text-xs text-grey-6" v-else>
              The length comes from the lyrics.
            </div>

            <div class="mt-4" v-if="account.music.references.length">
              <div class="ai__label">Reference audio <span class="normal-case">(optional)</span></div>
              <q-btn-toggle
                dense
                no-caps
                unelevated
                spread
                toggle-color="toneflix"
                color="grey-10"
                class="ai__kinds"
                :options="referenceKinds"
                v-model="form.reference_kind"
                v-if="referenceKinds.length > 1"
              />
              <div class="ai__reference" v-if="form.reference || form.reference_stem_id">
                <q-icon :name="form.reference ? 'lucide-paperclip' : 'lucide-music-2'" size="18px" class="flex-none!" />
                <div class="min-w-0 truncate text-sm">{{ referenceName }}</div>
                <IconBtn size="sm"
                  icon="lucide-x"
                  aria-label="Remove the reference"
                  class="flex-none!"
                  @click="clearReference"
                />
              </div>
              <div class="flex items-center gap-2 no-wrap mt-2" v-else>
                <q-select
                  dark
                  filled
                  dense
                  emit-value
                  map-options
                  clearable
                  class="min-w-0"
                  label="A stem on this track"
                  :options="stemOptions"
                  :disable="disabled || !stems.length"
                  v-model="form.reference_stem_id"
                />
                <q-btn
                  flat
                  no-caps
                  rounded
                  color="grey-4"
                  class="flex-none!"
                  label="Upload"
                  icon="lucide-cloud-upload"
                  :disable="disabled"
                  @click="referenceInput?.click()"
                />
                <input
                  ref="referenceInput"
                  type="file"
                  class="hidden"
                  :accept="acceptFor(['.mp3', '.wav'])"
                  @change="pickReference"
                />
              </div>
              <div class="mt-1 text-xs text-grey-6">
                MP3 or WAV longer than {{ account.music.referenceMinSeconds }} seconds. The new song
                follows its {{ referenceHint }}<template v-if="!account.music.lyricsRequired"
                  >, and AI writes the lyrics</template
                >.
              </div>
            </div>

            <div class="mt-4 text-xs text-grey-6" v-if="account.music.instrumentalOnly">
              Music is made as instrumentals, with no vocals.
            </div>
            <q-toggle
              dark
              dense
              color="toneflix"
              class="mt-2"
              label="Instrumental, no vocals"
              v-model="form.instrumental"
              v-if="account.music.instrumentalOption"
            />
            <div class="mt-2">
              <q-toggle
                dark
                dense
                color="toneflix"
                label="Split into stems"
                v-model="form.split"
              />
              <div class="ml-10 text-xs text-grey-6">
                Adds {{ partsText }} as separate stems you can mix.
              </div>
            </div>

            <div class="ai__cost">
              <span
                >Uses <b>{{ cost }}</b> credits</span
              >
              <q-btn
                unelevated
                rounded
                no-caps
                type="submit"
                color="toneflix"
                class="flex-none!"
                label="Generate"
                icon="lucide-sparkles"
                :loading="starting === 'music'"
                :disable="
                  disabled ||
                  !formReady ||
                  cost > account.balance.total ||
                  !!starting
                "
              />
            </div>
            <div class="ai__short" v-if="cost > account.balance.total">
              You need {{ cost - account.balance.total }} more credits.
              <router-link :to="{ name: 'studio.credits' }"
                >Get credits</router-link
              >
            </div>
          </q-form>

          <div class="ai__section" v-else-if="tool === 'stems'">
            <div class="mb-2 text-xs text-grey-6">
              Pull {{ partsText }} out of a full mix. Uses
              {{ account.costs.stems }} credits.
            </div>
            <div class="flex items-center gap-2 no-wrap">
              <q-select
                dark
                filled
                dense
                emit-value
                map-options
                class="min-w-0"
                label="Stem"
                :options="stemOptions"
                :disable="disabled || !stems.length"
                v-model="splitId"
              />
              <q-btn
                unelevated
                rounded
                no-caps
                color="grey-9"
                class="flex-none!"
                label="Split"
                :loading="starting === 'stems'"
                :disable="
                  disabled ||
                  !splitId ||
                  account.costs.stems > account.balance.total ||
                  !!starting
                "
                @click="split"
              />
            </div>
          </div>

          <q-form
            class="ai__section"
            v-else-if="tool === 'edit'"
            @submit="startEdit"
          >
            <div class="ai__model">
              <q-icon name="lucide-wand-sparkles" size="14px" class="flex-none!" />
              <span>{{ account.costs.edit }} credits per edit</span>
            </div>
            <div class="ai__notice mb-3" v-if="!editEngineReady">
              Section edits aren't available right now.
            </div>
            <div class="ai__part" v-if="section">
              <q-icon name="lucide-audio-lines" size="18px" class="flex-none! text-toneflix" />
              <div class="min-w-0">
                <div class="text-sm truncate">{{ stemTitle(section.stem) }}</div>
                <div class="text-xs text-grey-6">
                  {{ formatClock(section.at) }} to {{ formatClock(section.until) }} ·
                  {{ (section.until - section.at).toFixed(1) }} s
                </div>
              </div>
            </div>
            <div class="text-sm text-grey-6" v-else>
              Drag across a stem on the timeline to select the part to change,
              then press the wand button above the tracks.
            </div>

            <q-input
              dark
              filled
              autogrow
              counter
              class="mt-4"
              maxlength="500"
              input-class="ai__prompt"
              placeholder="Describe the change, like &quot;Busier hi-hats with a snare roll at the end&quot;"
              :disable="disabled"
              v-model="editForm.prompt"
            />
            <div class="mt-2 ai__label">
              Lyrics <span class="normal-case">(optional)</span>
            </div>
            <q-input
              dark
              filled
              autogrow
              maxlength="3000"
              placeholder="What's sung in this part. Leave it empty for no vocals."
              :disable="disabled"
              v-model="editForm.lyrics"
            />
            <div class="mt-3 text-xs text-grey-6">
              The edit goes on a new stem in the same place, and the original
              is muted.
            </div>
            <q-btn
              unelevated
              rounded
              no-caps
              color="toneflix"
              type="submit"
              class="mt-4 full-width"
              label="Edit section"
              :loading="starting === 'edit'"
              :disable="
                disabled ||
                !section ||
                !editEngineReady ||
                editForm.prompt.trim().length < 3 ||
                (account.costs.edit ?? 0) > account.balance.total ||
                !!starting
              "
            />
          </q-form>

          <div class="ai__section">
            <div class="flex items-center justify-between">
              <div class="ai__label">On this track</div>
              <router-link
                class="text-xs flex-none!"
                :to="{ name: 'studio.credits' }"
                >Credits and history</router-link
              >
            </div>
            <SimpleInfo
              dense
              icon="lucide-sparkles"
              text="Nothing yet. What you generate shows up here and on the track."
              v-if="!shownJobs.length"
            />
            <div
              class="job"
              :class="`job--${job.status}`"
              :key="job.id"
              v-for="job in shownJobs"
            >
              <div class="job__icon">
                <q-spinner-audio
                  size="18px"
                  color="toneflix"
                  v-if="job.status === 'queued' || job.status === 'running'"
                />
                <q-spinner-audio
                  size="18px"
                  color="toneflix"
                  v-else-if="job.choosing != null"
                />
                <q-icon
                  name="lucide-library"
                  size="18px"
                  class="text-toneflix"
                  v-else-if="awaitingPick(job)"
                />
                <q-icon
                  :name="
                    job.status === 'failed'
                      ? 'lucide-circle-alert'
                      : 'lucide-circle-check'
                  "
                  size="18px"
                  v-else
                />
              </div>
              <div class="min-w-0">
                <div class="text-sm truncate">
                  {{ jobTitle(job) }}
                </div>
                <div class="text-xs text-grey-6">
                  {{ statusText(job) }} · {{ job.credits }} credits<template
                    v-if="job.seconds"
                  >
                    · {{ clock(job.seconds) }}</template
                  >
                </div>
                <div
                  class="text-xs text-red-4"
                  v-if="job.status === 'failed' && job.error"
                >
                  {{ job.error }}
                </div>
                <div
                  class="text-xs text-amber-5"
                  v-else-if="job.status === 'succeeded' && job.notice"
                >
                  {{ job.notice }}
                </div>
                <div class="versions" v-if="awaitingPick(job) && job.choosing == null">
                  <div class="text-xs text-grey-5">
                    Pick the version that goes on the track. The other one is deleted.
                  </div>
                  <div class="version" :key="version.index" v-for="version in job.versions">
                    <IconBtn size="sm"
                      class="flex-none!"
                      :icon="playing === versionKey(job, version) ? 'lucide-pause:fill' : 'lucide-play:fill'"
                      :aria-label="`Play version ${version.index + 1}`"
                      :disable="!version.url"
                      @click="play(job, version)"
                    />
                    <div class="min-w-0">
                      <div class="text-sm truncate">
                        Version {{ version.index + 1 }}<template v-if="version.title">
                          · {{ version.title }}</template
                        >
                      </div>
                      <div class="text-xs text-grey-6" v-if="version.duration">
                        {{ clock(Math.round(version.duration)) }}
                      </div>
                    </div>
                    <q-btn
                      unelevated
                      rounded
                      dense
                      no-caps
                      color="toneflix"
                      class="flex-none! px-4"
                      label="Use this"
                      :loading="picking === versionKey(job, version)"
                      :disable="disabled || !version.url || !!picking"
                      @click="choose(job, version)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </q-card>
  </StudioSheet>
</template>

<script setup lang="ts">
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { acceptFor } from 'src/utils/presets';
import { date, useQuasar } from 'quasar';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import StudioSheet from 'src/components/Studio/StudioSheet.vue';
import { useFallbackPoll } from 'src/composables/useFallbackPoll';
import { pickStyles } from 'src/utils/ai/music-styles';
import { notify } from 'src/utils/helpers';
import { formatClock, stemTitle, type SectionSelection, type Stem } from 'src/utils/daw';
import type { ResponseBody } from 'src/utils/models';
import {
  awaitingPick,
  chooseVersionRequest,
  editSectionRequest,
  generateMusicRequest,
  jobDone,
  loadAiAccountRequest,
  loadAiJobsRequest,
  musicCost,
  musicPrice,
  splitStemRequest,
  type AiAccount,
  type AiJob,
  type MusicForm,
  type ReferenceKind,
  type SongVersion,
} from 'src/utils/requests/ai';
import BlockSkeleton from 'src/components/Skeletons/BlockSkeleton.vue';

const props = defineProps<{
  projectId: string | number;
  trackId: string | number;
  stems: Stem[];
  /** Lyrics of the Composer song the track came from, to start from when it has no stems */
  songLyrics?: string | null;
  /** What is known about the track's sound, to start the description from */
  details?: { genre?: string | null; mood?: string | null; bpm?: number | null; key?: string | null };
  disabled?: boolean;
  /** CSS selector of the column the panel docks into on desktop. */
  dock?: string;
  /** Whether job updates arrive over realtime; polling stands in when not. */
  live?: boolean;
}>();

const emit = defineEmits<{
  finished: [job: AiJob];
  /** Every job update for this track, lyric jobs included. */
  job: [job: AiJob];
}>();

const $q = useQuasar();

const open = ref(false);
const account = ref<AiAccount>();
const jobs = ref<AiJob[]>([]);
const starting = ref<'music' | 'stems' | 'edit' | null>(null);
const splitId = ref<string | number | null>(null);
const form = reactive({
  prompt: '',
  lyrics: '',
  seconds: 30,
  instrumental: false,
  split: false,
  reference: null as File | null,
  reference_stem_id: null as string | number | null,
  reference_kind: 'song' as ReferenceKind,
});
const referenceInput = ref<HTMLInputElement>();

const kindLabels: Record<ReferenceKind, { label: string; hint: string }> = {
  song: { label: 'Song', hint: 'style, arrangement and vocals' },
  voice: { label: 'Voice', hint: 'singing voice' },
  instrumental: { label: 'Instrumental', hint: 'instrumental' },
};

const referenceKinds = computed(() =>
  (account.value?.music.references ?? []).map((kind) => ({ label: kindLabels[kind].label, value: kind })),
);
const referenceHint = computed(() => kindLabels[form.reference_kind].hint);
const referenceName = computed(() => {
  if (form.reference) return form.reference.name;
  const stem = props.stems.find((s) => String(s.id) === String(form.reference_stem_id));
  return stem ? stemTitle(stem) : '';
});

const pickReference = (e: Event) => {
  const input = e.target as HTMLInputElement;
  form.reference = input.files?.[0] ?? null;
  form.reference_stem_id = null;
  input.value = '';
};

const clearReference = () => {
  form.reference = null;
  form.reference_stem_id = null;
};

/** Whether the music form has what the model needs. */
const formReady = computed(() => {
  const music = account.value?.music;
  if (!music) return false;
  if (form.prompt.trim().length < music.promptLength[0]) return false;
  return !music.lyricsLength || !music.lyricsRequired || form.lyrics.trim().length >= music.lyricsLength[0];
});

const minSeconds = computed(() => Math.ceil(Math.max(5, account.value?.music.minSeconds ?? 5) / 5) * 5);

/** Whether the model will pick its own length for this form. */
const lengthIgnored = computed(() => {
  const music = account.value?.music;
  if (!music?.lyricsLength || music.lyricsRequired) return false;
  const referenced = !!form.reference || !!form.reference_stem_id;
  return referenced || (!form.instrumental && !form.lyrics.trim());
});

const partsText = computed(() =>
  account.value?.stemsEngine === 'suno'
    ? 'vocals, drums, bass and the other instruments'
    : 'vocals, drums, bass and other',
);

const tool = ref<'music' | 'stems' | 'edit' | null>(null);

const tools = computed(() => {
  const acc = account.value;

  return [
    {
      key: 'music' as const,
      title: 'Generate music',
      text: acc?.music.lyricsLength && !acc.music.lyricsRequired
        ? 'Turn a style, and your lyrics if you have them, into a full song.'
        : acc?.music.lyricsLength
        ? 'Turn your lyrics and a style into a full song.'
        : acc?.music.instrumentalOnly
          ? 'Turn a prompt into a loop or an instrumental.'
          : 'Turn a prompt into a loop or a full track, with or without vocals.',
      icon: 'lucide-music',
      cost: !acc
        ? ''
        : acc.music.pricing === 'per10s'
          ? `From ${musicCost(acc, 5, false)} credits`
          : `${musicCost(acc, 0, false)} credits a song`,
    },
    {
      key: 'stems' as const,
      title: 'Split a stem',
      text: `Pull ${partsText.value} out of a full mix.`,
      icon: 'lucide-git-branch',
      cost: acc ? `${acc.costs.stems} credits` : '',
    },
    ...(acc?.costs.edit
      ? [
          {
            key: 'edit' as const,
            title: 'Edit a section',
            text: 'Select part of a stem and describe how it should change.',
            icon: 'lucide-wand-sparkles',
            cost: `${acc.costs.edit} credits`,
          },
        ]
      : []),
  ];
});

const current = computed(() => tools.value.find((t) => t.key === tool.value));

/** Every job on the grid, only the open tool's jobs inside a tool. */
const shownJobs = computed(() =>
  tool.value ? jobs.value.filter((j) => j.kind === tool.value) : jobs.value,
);

/** Picked after mount so the server and browser render the same page */
const ideas = ref<string[]>([]);

/** What the track already says about its sound, like "Afrobeats, hopeful mood, 92 BPM, in A minor" */
const detailsText = (withGenre: boolean) =>
  [
    withGenre ? props.details?.genre : null,
    props.details?.mood ? `${props.details.mood} mood` : null,
    props.details?.bpm ? `${Math.round(props.details.bpm)} BPM` : null,
    props.details?.key ? `in ${props.details.key}` : null,
  ]
    .filter(Boolean)
    .join(', ');

/** An idea keeps the track's tempo, key and mood */
const useIdea = (idea: string) => {
  const extra = detailsText(false);
  form.prompt = extra ? `${idea}, ${extra}` : idea;
};

const cost = computed(() =>
  account.value ? musicCost(account.value, form.seconds, form.split) : 0,
);
const stemOptions = computed(() =>
  props.stems.map((s) => ({ label: stemTitle(s), value: s.id })),
);
/** Whether a job other than a lyric job is queued or running. */
const busy = computed(() =>
  jobs.value.some(
    (j) => j.kind !== 'lyrics' && (j.status === 'queued' || j.status === 'running'),
  ),
);
const unfinished = computed(() =>
  jobs.value.some((j) => j.status === 'queued' || j.status === 'running' || j.choosing != null),
);

/** A track made from a song starts its first generation from the song's lyrics */
const prefillLyrics = () => {
  if (!form.lyrics.trim() && !props.stems.length && props.songLyrics?.trim()) form.lyrics = props.songLyrics.trim();
};

/** An empty description starts from the track's genre, mood, tempo and key */
const prefillPrompt = () => {
  if (!form.prompt.trim()) form.prompt = detailsText(true);
};

const toggle = () => (open.value = !open.value);

watch(
  () => [open.value, props.songLyrics, props.stems.length, props.details] as const,
  ([isOpen]) => {
    if (!isOpen) return;
    prefillLyrics();
    prefillPrompt();
  },
  { immediate: true },
);

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const day = (value: string) => date.formatDate(value, 'MMM D');

const jobTitle = (job: AiJob) =>
  ({
    music: job.prompt,
    stems: 'Split into stems',
    lyrics: `Lyrics from ${job.title || 'a stem'}`,
    edit: `${job.title || 'Stem'}: ${job.prompt}`,
    artwork: job.prompt,
  })[job.kind];

const statusText = (job: AiJob) =>
  ({
    queued: 'Waiting to start',
    running: {
      music: 'Composing, about a minute',
      stems: 'Splitting',
      lyrics: 'Listening',
      edit: 'Rewriting the section',
      artwork: 'Drawing',
    }[job.kind],
    succeeded:
      job.kind === 'lyrics'
        ? `Wrote ${job.lines ?? 0} ${job.lines === 1 ? 'line' : 'lines'}`
        : job.choosing != null
          ? `Adding version ${job.choosing + 1}`
          : awaitingPick(job)
            ? `${job.versions!.length} versions ready`
            : job.versions?.length && job.chosen == null
              ? 'Versions expired'
              : `Added ${job.stems.length} ${job.stems.length === 1 ? 'stem' : 'stems'}`,
    failed: 'Failed',
  })[job.status];

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

const loadAccount = async () => {
  try {
    account.value = await loadAiAccountRequest().send();
    const music = account.value.music;
    if (music.maxSeconds) form.seconds = Math.max(minSeconds.value, Math.min(form.seconds, music.maxSeconds));
    if (!music.references.includes(form.reference_kind)) form.reference_kind = music.references[0] ?? 'song';
  } catch {
    // The panel shows its loading state until the next try.
  }
};

/** Done jobs already handed to the page, so their stems are added once. */
const handed = new Set<number>();
/** Jobs whose versions people were already told to pick from. */
const prompted = new Set<number>();

/**
 * Take a job's latest state, from the list, a realtime event or a start.
 */
const onJob = (job: AiJob) => {
  if (String(job.trackId) !== String(props.trackId)) return;

  emit('job', job);

  const at = jobs.value.findIndex((j) => j.id === job.id);
  if (at >= 0) jobs.value.splice(at, 1, job);
  else jobs.value.unshift(job);

  if (awaitingPick(job) && !prompted.has(job.id) && !handed.has(job.id)) {
    prompted.add(job.id);
    notify('Your song is ready in two versions.', 'success');
    void loadAccount();
  }

  // The lyric sheet tells people about its own jobs.
  if (jobDone(job) && !handed.has(job.id) && job.kind !== 'lyrics') {
    handed.add(job.id);
    if (job.status === 'succeeded') {
      emit('finished', job);
      if (job.notice) notify(job.notice, 'warning');
    } else
      notify(
        job.error || 'The AI job failed. Credits refunded.',
        'error',
      );
    void loadAccount();
  }
};

const loadJobs = async () => {
  try {
    const list = await loadAiJobsRequest(props.projectId, props.trackId).send();
    // Jobs that finished before this page opened don't need handing over.
    if (!jobs.value.length) {
      list.filter(jobDone).forEach((j) => handed.add(j.id));
      list.filter(awaitingPick).forEach((j) => prompted.add(j.id));
    }
    [...list].reverse().forEach(onJob);
  } catch {
    // Realtime or the next check brings the jobs in.
  }
};

useFallbackPoll({ live: () => !!props.live, active: unfinished, check: loadJobs });

const refresh = () => {
  void loadAccount();
  void loadJobs();
};

/** The music form, with only what the current model takes. */
const musicForm = (): MusicForm => {
  const music = account.value!.music;
  const referenced = music.references.length > 0 && (!!form.reference || !!form.reference_stem_id);

  return {
    prompt: form.prompt.trim(),
    split: form.split,
    ...(music.maxSeconds ? { seconds: form.seconds } : {}),
    ...(music.lyricsLength ? { lyrics: form.lyrics.trim() } : {}),
    ...(music.instrumentalOption ? { instrumental: form.instrumental } : {}),
    ...(referenced
      ? {
          reference: form.reference,
          reference_stem_id: form.reference ? null : form.reference_stem_id,
          reference_kind: form.reference_kind,
        }
      : {}),
  };
};

const generate = async () => {
  starting.value = 'music';
  try {
    const { data, message } = await generateMusicRequest(
      props.projectId,
      props.trackId,
      musicForm(),
    ).send();
    notify(message, 'success');
    onJob(data);
    clearReference();
    void loadAccount();
  } catch (e) {
    notify(errorText(e, "The music couldn't be started."), 'error');
  } finally {
    starting.value = null;
  }
};

/** The part of a stem picked in the DAW for a section edit */
const section = ref<SectionSelection | null>(null);
const editForm = reactive({ prompt: '', lyrics: '' });

const editEngineReady = computed(() => {
  const engine = account.value?.edit?.engine;
  return !!engine && !!account.value?.engines[engine];
});

/** Open the section edit tool on a part of a stem selected in the DAW. */
const editSection = (region: SectionSelection) => {
  section.value = region;
  tool.value = 'edit';
  open.value = true;
};

const startEdit = async () => {
  if (!section.value) return;
  starting.value = 'edit';
  try {
    const { data, message } = await editSectionRequest(
      props.projectId,
      props.trackId,
      section.value.stem.id,
      {
        prompt: editForm.prompt.trim(),
        lyrics: editForm.lyrics.trim() || undefined,
        start: section.value.start,
        end: section.value.end,
      },
    ).send();
    notify(message, 'success');
    onJob(data);
    section.value = null;
    editForm.prompt = '';
    editForm.lyrics = '';
    void loadAccount();
  } catch (e) {
    notify(errorText(e, "The edit couldn't be started."), 'error');
  } finally {
    starting.value = null;
  }
};

const split = async () => {
  if (!splitId.value) return;
  starting.value = 'stems';
  try {
    const { data, message } = await splitStemRequest(
      props.projectId,
      props.trackId,
      splitId.value,
    ).send();
    notify(message, 'success');
    onJob(data);
    splitId.value = null;
    void loadAccount();
  } catch (e) {
    notify(errorText(e, "The split couldn't be started."), 'error');
  } finally {
    starting.value = null;
  }
};

let player: HTMLAudioElement | null = null;
const playing = ref<string | null>(null);
const picking = ref<string | null>(null);

const versionKey = (job: AiJob, version: SongVersion) => `${job.id}:${version.index}`;

/** The one audio element versions play in, made on first use. */
const audio = () => {
  if (!player) {
    player = new Audio();
    player.addEventListener('ended', () => (playing.value = null));
    player.addEventListener('pause', () => (playing.value = null));
  }
  return player;
};

/** Play a version, or stop it when it's the one playing. */
const play = (job: AiJob, version: SongVersion) => {
  const key = versionKey(job, version);
  if (playing.value === key) {
    audio().pause();
    return;
  }
  if (!version.url) return;
  audio().src = version.url;
  void audio().play().then(
    () => (playing.value = key),
    () => notify("That version couldn't be played.", 'error'),
  );
};

const choose = async (job: AiJob, version: SongVersion) => {
  picking.value = versionKey(job, version);
  player?.pause();
  try {
    const { data, message } = await chooseVersionRequest(job.id, version.index).send();
    notify(message, 'success');
    onJob(data);
  } catch (e) {
    notify(errorText(e, "That version couldn't be added."), 'error');
  } finally {
    picking.value = null;
  }
};

onMounted(() => {
  ideas.value = pickStyles();
  void loadJobs();
});
onBeforeUnmount(() => {
  player?.pause();
  player?.removeAttribute('src');
});

defineExpose({ toggle, onJob, editSection });
</script>

<style lang="scss" scoped>
.ai {
  display: flex;
  flex-direction: column;
  width: 400px;
  height: calc(100vh - 32px);
  max-height: none !important;
  margin: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);

  > * {
    flex: 0 0 auto;
  }

  &--mobile {
    width: 100vw;
    height: 100dvh;
    margin: 0;
    border: 0;
    border-radius: 0;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 14px 12px 10px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  > .ai__body {
    position: relative;
    flex: 1 1 auto;
    min-height: 0;
    padding: 4px 16px 16px;
    overflow-y: auto;
  }

  &__title {
    flex: 1 1 auto;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
    padding: 14px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__section {
    padding: 14px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);

    &:last-child {
      border-bottom: 0;
    }
  }

  &__label {
    margin-bottom: 8px;
    color: #8b919c;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  &__notice {
    margin-top: 16px;
    padding: 14px;
    color: #c9ccd2;
    font-size: 0.9rem;
    line-height: 1.45;
    border-radius: 12px;
    background: rgba(3, 191, 255, 0.08);
  }

  :deep(.ai__prompt) {
    min-height: 64px;
    line-height: 1.4;
  }

  :deep(.ai__lyrics) {
    min-height: 120px;
    line-height: 1.45;
  }

  &__part {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.04);
  }

  &__model {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 6px;
    margin-bottom: 10px;
    color: #c9ccd2;
    font-size: 12px;

    .q-icon {
      color: #03bfff;
    }
  }

  &__kinds {
    margin-top: 2px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    overflow: hidden;
  }

  &__reference {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 6px 6px 6px 10px;
    border: 1px solid rgba(3, 191, 255, 0.35);
    border-radius: 10px;
    background: rgba(3, 191, 255, 0.06);

    > .min-w-0 {
      flex: 1 1 auto;
    }
  }

  &__ideas {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  &__idea {
    flex: 0 1 auto !important;
    max-width: 100%;
    padding: 3px 10px;
    overflow: hidden;
    color: #b8bcc4;
    font-size: 11px;
    white-space: nowrap;
    text-overflow: ellipsis;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 999px;
    background: transparent;
    cursor: pointer;

    &:hover {
      color: #fff;
      border-color: rgba(3, 191, 255, 0.5);
    }
  }

  &__cost {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 14px;
    font-size: 0.9rem;
  }

  &__short {
    margin-top: 6px;
    color: #f5a623;
    font-size: 0.8rem;

    a {
      color: #03bfff;
    }
  }

  a {
    color: #03bfff;
    text-decoration: none;
  }
}

.tool {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px;
  color: inherit;
  font: inherit;
  text-align: left;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;

  &:hover,
  &:focus-visible {
    border-color: rgba(3, 191, 255, 0.5);
    background: rgba(3, 191, 255, 0.06);
    outline: none;
  }

  &__icon {
    margin-bottom: 6px;
    padding: 8px;
    color: #03bfff;
    border-radius: 10px;
    background: rgba(3, 191, 255, 0.12);
  }

  &__title {
    font-weight: 700;
  }

  &__text {
    flex: 1 1 auto;
    color: #9aa0aa;
    font-size: 12px;
    line-height: 1.4;
  }

  &__cost {
    margin-top: 6px;
    color: #c9ccd2;
    font-size: 11px;
  }
}

.versions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 6px;
}

.version {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);

  > .min-w-0 {
    flex: 1 1 auto;
  }
}

.job {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 0;

  &__icon {
    flex: 0 0 22px !important;
    padding-top: 1px;
    color: #7ee2a8;
  }

  &--failed &__icon {
    color: #ff8f8f;
  }

  > .min-w-0 {
    flex: 1 1 auto;
  }
}
</style>
