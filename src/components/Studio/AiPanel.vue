<template>
  <slot :toggle="toggle" :open="open" />
  <StudioSheet :dock="dock" v-model="open" @show="refresh">
    <q-card dark class="ai" :class="{ 'ai--mobile': $q.screen.lt.sm }">
      <header class="ai__head">
        <div class="min-w-0">
          <div class="text-lg font-bold">AI tools</div>
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
        <q-btn
          flat
          round
          dense
          icon="close"
          aria-label="Close AI tools"
          class="!flex-none"
          @click="open = false"
        />
      </header>

      <div class="ai__body">
        <q-inner-loading dark :showing="!account" />

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
              class="mt-3 !flex-none"
              label="See plans"
              :to="{ name: 'premium' }"
            />
          </div>
        </template>

        <template v-else-if="account">
          <q-form class="ai__section" @submit="generate">
            <div class="ai__label">Generate music</div>
            <q-input
              dark
              filled
              autogrow
              counter
              maxlength="2000"
              input-class="ai__prompt"
              placeholder='Describe it: genre, mood, instruments, tempo. Like "Mellow afrobeats groove, 100 BPM, guitars and log drums"'
              :disable="disabled"
              v-model="form.prompt"
            />
            <div class="ai__ideas">
              <button
                type="button"
                class="ai__idea"
                :key="idea"
                v-for="idea in ideas"
                @click="form.prompt = idea"
              >
                {{ idea }}
              </button>
            </div>

            <div class="mt-3 text-sm">
              Length <b>{{ clock(form.seconds) }}</b>
            </div>
            <q-slider
              dark
              color="toneflix"
              :min="5"
              :max="account.musicMaxSeconds"
              :step="5"
              v-model="form.seconds"
            />

            <q-toggle
              dark
              dense
              color="toneflix"
              label="Instrumental, no vocals"
              v-model="form.instrumental"
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
                Adds vocals, drums, bass and other as separate stems you can
                mix.
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
                class="!flex-none"
                label="Generate"
                :icon="ionSparkles"
                :loading="starting === 'music'"
                :disable="
                  disabled ||
                  form.prompt.trim().length < 3 ||
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

          <div class="ai__section">
            <div class="ai__label">Split a stem</div>
            <div class="mb-2 text-xs text-grey-6">
              Pull vocals, drums, bass and other out of a full mix. Uses
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
                class="!flex-none"
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

          <div class="ai__section">
            <div class="flex items-center justify-between">
              <div class="ai__label">On this track</div>
              <router-link
                class="text-xs !flex-none"
                :to="{ name: 'studio.credits' }"
                >Credits and history</router-link
              >
            </div>
            <div class="text-sm text-grey-6" v-if="!jobs.length">
              Nothing yet. What you generate shows up here and on the track.
            </div>
            <div
              class="job"
              :class="`job--${job.status}`"
              :key="job.id"
              v-for="job in jobs"
            >
              <div class="job__icon">
                <q-spinner-audio
                  size="18px"
                  color="toneflix"
                  v-if="job.status === 'queued' || job.status === 'running'"
                />
                <q-icon
                  :name="
                    job.status === 'failed'
                      ? ionAlertCircle
                      : ionCheckmarkCircle
                  "
                  size="18px"
                  v-else
                />
              </div>
              <div class="min-w-0">
                <div class="text-sm truncate">
                  {{ job.kind === 'music' ? job.prompt : 'Split into stems' }}
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
              </div>
            </div>
          </div>
        </template>
      </div>
    </q-card>
  </StudioSheet>
</template>

<script setup lang="ts">
import {
  ionAlertCircle,
  ionCheckmarkCircle,
  ionSparkles,
} from '@quasar/extras/ionicons-v8';
import { date, useQuasar } from 'quasar';
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import StudioSheet from 'src/components/Studio/StudioSheet.vue';
import { notify } from 'src/utils/helpers';
import { stemTitle, type Stem } from 'src/utils/daw';
import type { ResponseBody } from 'src/utils/models';
import {
  generateMusicRequest,
  loadAiAccountRequest,
  loadAiJobsRequest,
  musicCost,
  splitStemRequest,
  type AiAccount,
  type AiJob,
} from 'src/utils/requests/ai';

const props = defineProps<{
  projectId: string | number;
  trackId: string | number;
  stems: Stem[];
  disabled?: boolean;
  /** CSS selector of the column the panel docks into on desktop. */
  dock?: string;
}>();

const emit = defineEmits<{ finished: [job: AiJob] }>();

const $q = useQuasar();

const open = ref(false);
const account = ref<AiAccount>();
const jobs = ref<AiJob[]>([]);
const starting = ref<'music' | 'stems' | null>(null);
const splitId = ref<string | number | null>(null);
const form = reactive({
  prompt: '',
  seconds: 30,
  instrumental: false,
  split: false,
});

const ideas = [
  'Mellow afrobeats groove, 100 BPM, guitars and log drums',
  'Lofi hip hop beat with vinyl crackle and soft keys',
  'Amapiano loop with shakers and a deep log drum bass',
  'Uplifting gospel choir with organ and claps',
];

const cost = computed(() =>
  account.value ? musicCost(account.value, form.seconds, form.split) : 0,
);
const stemOptions = computed(() =>
  props.stems.map((s) => ({ label: stemTitle(s), value: s.id })),
);
const unfinished = computed(() =>
  jobs.value.some((j) => j.status === 'queued' || j.status === 'running'),
);

const toggle = () => (open.value = !open.value);

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
const day = (value: string) => date.formatDate(value, 'MMM D');

const statusText = (job: AiJob) =>
  ({
    queued: 'Waiting to start',
    running: job.kind === 'music' ? 'Composing, about a minute' : 'Splitting',
    succeeded: `Added ${job.stems.length} ${job.stems.length === 1 ? 'stem' : 'stems'}`,
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
    form.seconds = Math.min(form.seconds, account.value.musicMaxSeconds);
  } catch {
    // The panel shows its loading state until the next try.
  }
};

/** Done jobs already handed to the page, so their stems are added once. */
const handed = new Set<number>();

/**
 * Take a job's latest state, from the list, a realtime event or a start.
 */
const onJob = (job: AiJob) => {
  if (String(job.trackId) !== String(props.trackId)) return;

  const at = jobs.value.findIndex((j) => j.id === job.id);
  if (at >= 0) jobs.value.splice(at, 1, job);
  else jobs.value.unshift(job);

  if (
    (job.status === 'succeeded' || job.status === 'failed') &&
    !handed.has(job.id)
  ) {
    handed.add(job.id);
    if (job.status === 'succeeded') {
      emit('finished', job);
      if (job.notice) notify(job.notice, 'warning');
    } else
      notify(
        job.error || 'The AI job failed. Your credits were refunded.',
        'error',
      );
    void loadAccount();
  }

  schedulePoll();
};

const loadJobs = async () => {
  try {
    const list = await loadAiJobsRequest(props.projectId, props.trackId).send();
    // Jobs that finished before this page opened don't need handing over.
    if (!jobs.value.length)
      list
        .filter((j) => j.status === 'succeeded' || j.status === 'failed')
        .forEach((j) => handed.add(j.id));
    [...list].reverse().forEach(onJob);
  } catch {
    // Try again with the next poll.
  }
};

let timer: ReturnType<typeof setTimeout> | undefined;

/** Check on unfinished jobs, in case realtime updates don't arrive. */
const schedulePoll = () => {
  clearTimeout(timer);
  if (unfinished.value) timer = setTimeout(() => void loadJobs(), 5000);
};

const refresh = () => {
  void loadAccount();
  void loadJobs();
};

const generate = async () => {
  starting.value = 'music';
  try {
    const { data, message } = await generateMusicRequest(
      props.projectId,
      props.trackId,
      { ...form, prompt: form.prompt.trim() },
    ).send();
    notify(message, 'success');
    onJob(data);
    void loadAccount();
  } catch (e) {
    notify(errorText(e, "The music couldn't be started."), 'error');
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

onMounted(() => void loadJobs());
onBeforeUnmount(() => clearTimeout(timer));

defineExpose({ toggle, onJob });
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
