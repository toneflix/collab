<template>
  <slot :toggle="toggle" :open="open" :busy="!!job" />
  <StudioSheet :dock="dock" v-model="open" @show="onShow" @hide="stopFollowing">
    <q-card dark class="sheet" :class="{ 'sheet--mobile': $q.screen.lt.sm }">
      <header class="sheet__head">
        <div class="min-w-0">
          <div class="text-lg font-bold">Lyrics</div>
          <div class="text-xs text-grey-5">
            <template v-if="lines.length">
              {{ lines.length }} {{ lines.length === 1 ? 'line' : 'lines' }}
              · {{ syncedCount }} synced
            </template>
            <template v-else>The words of this track, timed to the music</template>
          </div>
        </div>
        <IconBtn
          icon="lucide-x"
          aria-label="Close lyrics"
          class="flex-none!"
          @click="open = false"
        />
      </header>

      <div class="sheet__body">
        <q-inner-loading dark :showing="loading" />

        <!-- Write the lyrics out from a stem with AI -->
        <div class="sheet__section" v-if="!readonly && ai?.enabled">
          <div class="sheet__label">Write out from a stem</div>
          <template v-if="ai.access">
            <div class="mb-2 text-xs text-grey-6">
              AI listens to a stem and writes out the words, timed to the
              track. A vocals stem works best. Uses {{ ai.costs.lyrics }}
              credits<template v-if="lines.length">, and replaces the lines below</template>.
              <template v-if="lines.length">
                Sync times keeps your words and only times them to the stem.
              </template>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <q-select
                dark
                filled
                dense
                emit-value
                map-options
                class="w-full min-w-0"
                label="Stem"
                :options="stemOptions"
                :disable="disabled || !stems.length || !!job"
                v-model="stemId"
              />
              <q-btn
                unelevated
                rounded
                no-caps
                color="toneflix"
                class="flex-none!"
                label="Transcribe"
                icon="lucide-sparkles"
                :loading="starting === 'replace'"
                :disable="
                  disabled ||
                  !stemId ||
                  !!job ||
                  !!starting ||
                  ai.costs.lyrics > ai.balance.total
                "
                @click="transcribe('replace')"
              />
              <q-btn
                unelevated
                rounded
                no-caps
                color="grey-9"
                class="flex-none!"
                label="Sync times"
                icon="lucide-timer"
                :loading="starting === 'sync'"
                :disable="
                  disabled ||
                  !stemId ||
                  !!job ||
                  !!starting ||
                  dirty ||
                  ai.costs.lyrics > ai.balance.total
                "
                @click="transcribe('sync')"
                v-if="lines.length"
              >
                <q-tooltip v-if="dirty">Save the sheet first</q-tooltip>
              </q-btn>
            </div>
            <div class="sheet__status" v-if="job">
              <q-spinner-audio size="16px" color="toneflix" />
              {{ mode === 'sync' ? 'Timing the sheet to' : 'Listening to' }}
              "{{ job.title }}". This takes about a minute.
            </div>
            <div class="sheet__short" v-else-if="ai.costs.lyrics > ai.balance.total">
              You need {{ ai.costs.lyrics - ai.balance.total }} more credits.
              <router-link :to="{ name: 'studio.credits' }">Get credits</router-link>
            </div>
          </template>
          <div class="text-xs text-grey-6" v-else>
            With Premium, AI can write out the lyrics from a vocals stem.
            <router-link :to="{ name: 'premium' }">See plans</router-link>
          </div>
        </div>

        <!-- The sheet -->
        <div class="sheet__section">
          <div class="flex items-center justify-between mb-2 no-wrap">
            <div class="sheet__label mb-0!">Lyric sheet</div>
            <q-btn
              flat
              dense
              rounded
              no-caps
              size="sm"
              class="flex-none!"
              :icon="textMode ? 'lucide-list' : 'lucide-square-pen'"
              :label="textMode ? 'Done' : 'Edit as text'"
              @click="toggleTextMode"
              v-if="!readonly"
            />
          </div>

          <q-input
            dark
            filled
            autogrow
            type="textarea"
            input-class="sheet__text"
            placeholder="Paste or type the lyrics, one line per line."
            v-model="text"
            v-if="textMode"
          />

          <template v-else>
            <SimpleInfo
              icon="lucide-type"
              title="No lyrics yet."
              v-if="!lines.length && !loading"
            >
              <template v-if="!readonly">
                Type them in, paste them with "Edit as text", or write them
                out from a vocals stem.
              </template>
            </SimpleInfo>

            <div
              class="line"
              :class="{ 'line--active': i === active }"
              :key="i"
              :ref="(el) => (lineEls[i] = el as HTMLElement)"
              v-for="(line, i) in lines"
            >
              <button
                type="button"
                class="line__time"
                :class="{ 'line__time--unset': line.start === null }"
                :disabled="line.start === null"
                :title="line.start === null ? 'Not synced yet' : 'Play from here'"
                @click="line.start !== null && seek(line.start)"
              >
                {{ line.start === null ? '–:––' : stamp(line.start) }}
              </button>
              <q-input
                dark
                dense
                borderless
                class="line__text"
                placeholder="Line"
                :readonly="readonly"
                :model-value="line.text"
                @update:model-value="(v) => update(i, { text: String(v ?? '') })"
                @keydown.enter.prevent="insertAfter(i)"
              />
              <div class="line__actions" v-if="!readonly">
                <IconBtn size="sm"
                  class="flex-none!"
                  aria-label="Sync to the playhead"
                  icon="lucide-locate-fixed"
                  @click="syncToPlayhead(i)"
                >
                  <q-tooltip>Start this line at the playhead</q-tooltip>
                </IconBtn>
                <IconBtn size="sm"
                  class="flex-none!"
                  aria-label="Remove line"
                  icon="lucide-trash-2"
                  @click="remove(i)"
                />
              </div>
            </div>

            <q-btn
              flat
              dense
              rounded
              no-caps
              size="sm"
              class="mt-2 flex-none!"
              label="Add line"
              icon="lucide-plus"
              @click="insertAfter(lines.length - 1)"
              v-if="!readonly"
            />
          </template>
        </div>
      </div>

      <footer class="sheet__foot" v-if="!readonly">
        <span class="text-xs text-grey-6">
          <template v-if="dirty">Unsaved changes</template>
          <template v-else-if="updatedBy">Last saved by {{ updatedBy }}</template>
        </span>
        <q-btn
          unelevated
          rounded
          no-caps
          color="primary"
          class="flex-none!"
          label="Save lyrics"
          icon="lucide-save"
          :loading="saving"
          :disable="!dirty"
          @click="save"
        />
      </footer>
    </q-card>
  </StudioSheet>
</template>

<script setup lang="ts">
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { useQuasar } from 'quasar';
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import StudioSheet from 'src/components/Studio/StudioSheet.vue';
import { useFallbackPoll } from 'src/composables/useFallbackPoll';
import { notify } from 'src/utils/helpers';
import { stemTitle, type Stem } from 'src/utils/daw';
import type { ResponseBody } from 'src/utils/models';
import {
  loadAiAccountRequest,
  loadAiJobRequest,
  type AiAccount,
  type AiJob,
} from 'src/utils/requests/ai';
import {
  activeLine,
  loadLyricSheetRequest,
  saveLyricSheetRequest,
  transcribeStemRequest,
  type LyricLine,
  type Lyrics,
} from 'src/utils/requests/lyrics';

const props = defineProps<{
  projectId: string | number;
  trackId: string | number;
  stems: Stem[];
  readonly?: boolean;
  disabled?: boolean;
  /** Where the editor's playhead is, in seconds */
  playhead: () => number;
  /** Move the editor's playhead */
  seek: (seconds: number) => void;
  /** CSS selector of the column the panel docks into on desktop. */
  dock?: string;
  /** Whether job updates arrive over realtime; polling stands in when not. */
  live?: boolean;
}>();

const $q = useQuasar();

const open = ref(false);
const loading = ref(false);
const saving = ref(false);
const starting = ref<'replace' | 'sync' | null>(null);
const mode = ref<'replace' | 'sync'>('replace');
const ai = ref<AiAccount>();
const job = ref<AiJob | null>(null);
const stemId = ref<string | number | null>(null);
const lines = ref<LyricLine[]>([]);
const saved = ref('[]');
const textMode = ref(false);
const text = ref('');
const updatedBy = ref<string | null>(null);
const time = ref(0);
const lineEls = ref<HTMLElement[]>([]);

const dirty = computed(() => JSON.stringify(currentLines()) !== saved.value);
const syncedCount = computed(() => lines.value.filter((l) => l.start !== null).length);
const active = computed(() => activeLine(lines.value, time.value));
const stemOptions = computed(() =>
  props.stems.map((s) => ({ label: stemTitle(s), value: s.id })),
);

const toggle = () => (open.value = !open.value);

const stamp = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

/** The lines as they'd be saved, taking the text box into account. */
const currentLines = (): LyricLine[] =>
  (textMode.value ? fromText(text.value) : lines.value)
    .map((l) => ({ ...l, text: l.text.trim() }))
    .filter((l) => l.text);

/** Lines from plain text, keeping the times of lines that kept their place. */
const fromText = (value: string): LyricLine[] =>
  value
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t, i) => {
      const before = lines.value[i];
      return before && before.text.trim() === t
        ? { ...before }
        : { start: before?.start ?? null, end: before?.end ?? null, text: t };
    });

const apply = (lyrics: Lyrics | null) => {
  lines.value = (lyrics?.lines ?? []).map((l) => ({ ...l }));
  saved.value = JSON.stringify(currentLines());
  text.value = lines.value.map((l) => l.text).join('\n');
};

const load = async () => {
  loading.value = true;
  try {
    apply(await loadLyricSheetRequest(props.projectId, props.trackId).send());
  } catch {
    // The empty sheet stays until the next try.
  } finally {
    loading.value = false;
  }
};

const loadAi = async () => {
  if (props.readonly) return;
  try {
    ai.value = await loadAiAccountRequest().send();
  } catch {
    ai.value = undefined;
  }
};

const update = (i: number, change: Partial<LyricLine>) => {
  const line = lines.value[i];
  if (line) lines.value.splice(i, 1, { ...line, ...change });
};

const insertAfter = async (i: number) => {
  lines.value.splice(i + 1, 0, { start: null, end: null, text: '' });
  await nextTick();
  lineEls.value[i + 1]?.querySelector('input')?.focus();
};

const remove = (i: number) => lines.value.splice(i, 1);

/** Start a line where the playhead is, and end the line before it there. */
const syncToPlayhead = (i: number) => {
  const at = Math.round(props.playhead() * 100) / 100;
  update(i, { start: at });
  const before = lines.value[i - 1];
  if (before?.start !== null && before?.start !== undefined && before.start < at)
    update(i - 1, { end: at });
};

const toggleTextMode = () => {
  if (textMode.value) lines.value = fromText(text.value);
  else text.value = lines.value.map((l) => l.text).join('\n');
  textMode.value = !textMode.value;
};

const save = async () => {
  saving.value = true;
  try {
    const { data, message } = await saveLyricSheetRequest(
      props.projectId,
      props.trackId,
      currentLines(),
    ).send();
    textMode.value = false;
    apply(data);
    updatedBy.value = 'you';
    notify(message, 'success');
  } catch (e) {
    notify(errorText(e, "The lyrics couldn't be saved."), 'error');
  } finally {
    saving.value = false;
  }
};

/** Fetch the running transcription's state. */
const checkJob = async () => {
  if (!job.value) return;

  try {
    onJob(await loadAiJobRequest(job.value.id).send());
  } catch {
    // Checked again on the next round.
  }
};

/** Take a job's latest state from a start, a poll or a realtime event. */
const onJob = (update: AiJob) => {
  if (update.kind !== 'lyrics' || String(update.trackId) !== String(props.trackId)) return;

  if (update.status === 'queued' || update.status === 'running') {
    job.value = update;
    return;
  }

  if (job.value?.id !== update.id) return;
  job.value = null;
  void loadAi();

  if (update.status === 'failed') {
    notify(update.error || 'Could not write out the lyrics. Credits refunded.', 'error');
    return;
  }

  const count = update.lines ?? 0;
  if (update.notice) notify(update.notice, 'warning');
  else if (mode.value === 'sync')
    notify(`Timed ${count} ${count === 1 ? 'line' : 'lines'} to the stem.`, 'success');
  else notify(`Wrote out ${count} lines of lyrics.`, 'success');
  void load();
};

/** Someone else saved the sheet. */
const onRemote = (lyrics: Lyrics | null, by?: string | null) => {
  if (dirty.value) {
    notify(`${by || 'A collaborator'} changed the lyrics. Saving yours will replace theirs.`, 'warning');
    return;
  }
  apply(lyrics);
  updatedBy.value = by || null;
};

const transcribe = async (how: 'replace' | 'sync') => {
  if (!stemId.value) return;
  starting.value = how;
  mode.value = how;
  try {
    const { data, message } = await transcribeStemRequest(
      props.projectId,
      props.trackId,
      stemId.value,
      how,
    ).send();
    notify(message, 'success');
    job.value = data;
    onJob(data);
    void loadAi();
  } catch (e) {
    notify(errorText(e, "The lyrics couldn't be started."), 'error');
  } finally {
    starting.value = null;
  }
};

let follow: ReturnType<typeof setInterval> | undefined;

/** Follow the playhead so the line being sung is lit up. */
const startFollowing = () => {
  clearInterval(follow);
  follow = setInterval(() => (time.value = props.playhead()), 200);
};

const stopFollowing = () => clearInterval(follow);

const onShow = () => {
  if (!dirty.value) void load();
  void loadAi();
  startFollowing();
  stemId.value ??=
    props.stems.find((s) => /vocal|vox|lead/i.test(stemTitle(s)))?.id ?? null;
};

watch(active, async (i) => {
  if (i < 0 || !open.value || textMode.value) return;
  await nextTick();
  lineEls.value[i]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
});

useFallbackPoll({ live: () => !!props.live, active: () => !!job.value, check: checkJob });

onBeforeUnmount(() => {
  stopFollowing();
});

defineExpose({ toggle, onJob, onRemote, dirty });
</script>

<style lang="scss" scoped>
.sheet {
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

  > .sheet__body {
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

  &__status {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    color: #c9ccd2;
    font-size: 0.8rem;
  }

  &__short {
    margin-top: 6px;
    color: #f5a623;
    font-size: 0.8rem;
  }

  :deep(.sheet__text) {
    min-height: 220px;
    line-height: 1.6;
  }

  &__foot {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  a {
    color: #03bfff;
    text-decoration: none;
  }
}

.line {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  border-radius: 8px;

  &--active {
    background: rgba(3, 191, 255, 0.12);

    .line__time {
      color: #03bfff;
    }
  }

  &__time {
    flex: 0 0 52px !important;
    padding: 2px 0;
    color: #8b919c;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    text-align: left;
    border: 0;
    background: transparent;
    cursor: pointer;

    &--unset {
      color: #5b6069;
      cursor: default;
    }
  }

  &__text {
    flex: 1 1 auto;
    min-width: 0;
  }

  &__actions {
    display: flex;
    flex: 0 0 auto !important;
    flex-wrap: nowrap;
    opacity: 0.5;
  }

  &:hover &__actions,
  &:focus-within &__actions {
    opacity: 1;
  }
}
</style>
