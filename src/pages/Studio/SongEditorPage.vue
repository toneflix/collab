<template>
  <q-page class="p-3 md:p-4">
    <div class="flex items-center gap-x-3 gap-y-2 mb-4" :class="narrow ? 'flex-wrap' : 'no-wrap'">
      <q-btn
        flat
        round
        dense
        class="!flex-none"
        aria-label="Back to your songs"
        icon="lucide-arrow-left"
        :to="{ name: 'studio.composer' }"
      />
      <div class="min-w-0 flex-1">
        <input
          class="song-title"
          aria-label="Song title"
          maxlength="150"
          placeholder="Untitled song"
          :value="song?.title"
          :disabled="!song"
          @input="setTitle(($event.target as HTMLInputElement).value)"
        />
        <div class="text-xs text-grey-5">
          <template v-if="song">
            {{ song.lineCount }} {{ song.lineCount === 1 ? 'line' : 'lines' }} · {{ song.wordCount }} words
            <template v-if="length"> · about {{ length }} at {{ song.bpm }} BPM</template>
            ·
          </template>
          <span :class="{ 'text-orange': status === 'error' || status === 'pending' }">{{ statusText }}</span>
          <template v-if="song?.project">
            ·
            <router-link
              class="text-toneflix"
              :to="{ name: 'studio.project.track', params: { project_id: song.project.slug, track_id: song.project.trackId } }"
            >
              Project: {{ song.project.title }}
            </router-link>
          </template>
        </div>
      </div>

      <div class="flex items-center gap-2 no-wrap" :class="narrow ? 'song-actions--narrow' : 'ml-auto !flex-none'" v-if="song">
        <q-btn
          unelevated
          rounded
          no-caps
          dense
          :color="dirty ? 'toneflix' : 'grey-8'"
          :text-color="dirty ? 'dark' : 'grey-5'"
          label="Save"
          class="!flex-none px-4"
          title="Save (Ctrl+S)"
          icon="lucide-save"
          :loading="status === 'saving'"
          :disable="!dirty"
          @click="save"
        />
        <ActionButton
          :label="beatPlaying ? 'Pause beat' : 'Play beat'"
          :icon="beatPlaying ? 'lucide-pause:fill' : 'lucide-play:fill'"
          :expanded="showLabels"
          :active="beatPlaying"
          @click="toggleBeat"
          v-if="song.beat"
        />
        <ActionButton
          label="Rhyme colours"
          icon="lucide-palette"
          :expanded="showLabels"
          :active="song.settings.rhymeColours"
          @click="toggleColours"
        />
        <ActionButton
          label="Write with AI"
          icon="lucide-sparkles"
          :expanded="showLabels"
          :active="panels.write"
          @click="panels.write = !panels.write"
        />
        <ActionButton
          :label="song.project ? 'Open the project' : 'Add to a project'"
          icon="lucide-library"
          :expanded="showLabels"
          @click="song.project ? openProject() : (projectDialog = true)"
        />
        <ActionButton label="Lookup" icon="lucide-search" :expanded="showLabels" :active="panels.lookup" @click="toggleLookup" />
        <ActionButton label="Notes" icon="lucide-file-text" :expanded="showLabels" :active="panels.notes" @click="panels.notes = !panels.notes" />
        <ActionButton label="Versions" icon="lucide-clock" :expanded="showLabels" :active="panels.versions" @click="panels.versions = !panels.versions" />
        <ActionButton
          label="How it works"
          icon="lucide-info"
          :expanded="showLabels"
          :active="panels.help"
          @click="panels.help = !panels.help"
        />
        <q-btn
          flat
          round
          dense
          class="!flex-none expand-toggle"
          v-if="!narrow"
          :class="{ 'expand-toggle--open': expanded }"
          icon="lucide-chevron-right"
          :aria-label="expanded ? 'Hide labels' : 'Show labels'"
          :aria-expanded="expanded"
          @click="toggleExpanded"
        />
      </div>
    </div>

    <q-no-ssr>
      <div class="composer-body" :style="fit" ref="bodyEl">
        <div class="composer-main">
          <div class="rhyme-strip" v-if="song">
            <template v-if="stripWord">
              <span class="rhyme-strip__word">"{{ stripWord }}":</span>
              <button
                type="button"
                class="rhyme-strip__hit"
                :key="hit.word"
                @click="editor?.insertWord(hit.word)"
                v-for="hit in stripHits"
              >
                {{ hit.word }}
              </button>
              <span class="mr-2 text-grey-6" v-if="stripLoaded && !stripHits.length">no perfect rhymes</span>
              <button type="button" class="rhyme-strip__more" @click="openLookup(stripWord)">All rhymes</button>
            </template>
            <span class="text-grey-6" v-else>Rhymes for the last word of the line you're on show here.</span>
          </div>

          <div class="editor-card">
            <LyricsEditor
              ref="editor"
              :sounds="sounds"
              :rhyme-colours="song.settings.rhymeColours"
              :complete="complete"
              @cursor="onCursor"
              @word="onWordClick"
              @accepted="ghostAsked = null"
              v-model="body"
              v-if="song"
            />
            <q-inner-loading dark :showing="!song" />
          </div>
        </div>
        <div id="composer-dock" class="composer-dock" />
      </div>
    </q-no-ssr>

    <template v-if="song">
      <SongProjectDialog :song="song" :ai="ai" :flush="flush" v-model="projectDialog" @created="onProjectCreated" />
      <WritePanel
        dock="#composer-dock"
        :account="ai"
        :result="suggestion"
        :asking="asking"
        :auto-suggest="song.settings.autoSuggest"
        :cursor-text="cursorText"
        @ask="(kind, instruction) => ask(kind, { instruction })"
        @insert="insertSuggestion"
        @auto="setAutoSuggest"
        v-model="panels.write"
      />
      <LookupPanel dock="#composer-dock" v-model="panels.lookup" v-model:word="lookupWord" @insert="editor?.insertWord($event)" />
      <NotesPanel dock="#composer-dock" :song="song" v-model="panels.notes" @change="onNotesChange" />
      <HelpPanel dock="#composer-dock" v-model="panels.help" @section="insertSection" />
      <VersionsPanel dock="#composer-dock" :song-id="song.id" :flush="flush" v-model="panels.versions" @restored="onRestored" />
      <q-dialog persistent v-model="leaving">
        <q-card dark class="!flex-none leave-card">
          <q-card-section>
            <div class="text-base font-semibold">Save your changes?</div>
            <div class="mt-1 text-sm text-grey-5">
              This song has changes that aren't saved yet. If you leave without saving, they stay on this device and
              you can restore them next time.
            </div>
          </q-card-section>
          <q-card-actions align="right">
            <q-btn flat rounded no-caps label="Stay" @click="chooseLeave('stay')" />
            <q-btn flat rounded no-caps label="Leave without saving" @click="chooseLeave('leave')" />
            <q-btn unelevated rounded no-caps color="toneflix" text-color="dark" label="Save and leave" @click="chooseLeave('save')" />
          </q-card-actions>
        </q-card>
      </q-dialog>
      <audio ref="beat" loop preload="none" :src="song.beat?.url" @play="beatPlaying = true" @pause="beatPlaying = false" />
    </template>
  </q-page>
</template>

<script setup lang="ts">
import { date, LocalStorage, useQuasar } from 'quasar';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import HelpPanel from 'src/components/Composer/HelpPanel.vue';
import LookupPanel from 'src/components/Composer/LookupPanel.vue';
import LyricsEditor from 'src/components/Composer/LyricsEditor.vue';
import NotesPanel from 'src/components/Composer/NotesPanel.vue';
import SongProjectDialog from 'src/components/Composer/SongProjectDialog.vue';
import VersionsPanel from 'src/components/Composer/VersionsPanel.vue';
import WritePanel from 'src/components/Composer/WritePanel.vue';
import ActionButton from 'src/components/Studio/ActionButton.vue';
import { useFitToScreen } from 'src/composables/useFitToScreen';
import { useComposerStore } from 'src/stores/composer-store';
import { errorShown, isSectionLine, lastWordOf, notifyError, requestStatus, WordSounds } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';
import { loadAiAccountRequest, type AiAccount } from 'src/utils/requests/ai';
import {
  completeWordRequest,
  loadSongRequest,
  nameSongVersionRequest,
  rhymesRequest,
  saveSongRequest,
  suggestLyricsRequest,
  type LyricSuggestion,
  type Song,
  type SongInput,
  type SuggestionKind,
  type WordHit,
} from 'src/utils/requests/composer';

defineOptions({ name: 'SongEditorPage' });

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const composer = useComposerStore();

const song = ref<Song | null>(null);
const body = ref('');
const editor = ref<InstanceType<typeof LyricsEditor>>();
const beat = ref<HTMLAudioElement | null>(null);
const beatPlaying = ref(false);
const sounds = new WordSounds();
const panels = reactive({ write: false, lookup: false, notes: false, versions: false, help: false });
const lookupWord = ref('');

const bodyEl = ref<HTMLElement>();
const { style: fit, measure: fitBody } = useFitToScreen(bodyEl);

/* ---------- Drafts and saving ---------- */

type Status = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
const status = ref<Status>('idle');
const pending = ref<SongInput>({});
/** The unsaved changes in the shape the page shows, for restoring a draft */
const patch = ref<Partial<Song>>({});
/** Milliseconds of quiet before the draft is written to the browser */
const DRAFT_DELAY = 400;
let timer: ReturnType<typeof setTimeout> | null = null;
let saving: Promise<void> | null = null;

const dirty = computed(() => Object.keys(pending.value).length > 0);

const statusText = computed(
  () =>
    ({
      idle: 'All changes saved',
      pending: 'Unsaved changes',
      saving: 'Saving…',
      saved: 'All changes saved',
      error: "Couldn't save. Try again.",
    })[status.value],
);

/** Writes the unsaved changes to the browser's draft for this song */
const keepDraft = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (!song.value) return;
  if (dirty.value) {
    composer.keep(song.value.id, { input: pending.value, patch: patch.value, revision: song.value.revision });
  } else {
    composer.discard(song.value.id);
  }
};

const queue = (input: SongInput, shown: Partial<Song>) => {
  pending.value = {
    ...pending.value,
    ...input,
    settings: input.settings ? { ...pending.value.settings, ...input.settings } : pending.value.settings,
  };
  if (!pending.value.settings) delete pending.value.settings;
  patch.value = { ...patch.value, ...shown };
  status.value = 'pending';
  if (timer) clearTimeout(timer);
  timer = setTimeout(keepDraft, DRAFT_DELAY);
};

const errorText = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

/** Saves the unsaved changes to the server; resolves once it has them */
const flush = async (): Promise<void> => {
  keepDraft();
  if (saving) await saving;
  if (!song.value || !dirty.value) return;

  const sending = pending.value;
  const sendingPatch = patch.value;
  pending.value = {};
  patch.value = {};
  status.value = 'saving';

  saving = (async () => {
    try {
      const res = await saveSongRequest(song.value!.id, song.value!.revision, sending).send();
      const saved = res.data;
      song.value = { ...song.value!, revision: saved.revision, lineCount: saved.lineCount, wordCount: saved.wordCount, updatedAt: saved.updatedAt, beat: saved.beat ?? null };
      status.value = dirty.value ? 'pending' : 'saved';
    } catch (e) {
      pending.value = { ...sending, ...pending.value };
      patch.value = { ...sendingPatch, ...patch.value };
      status.value = 'error';
      if (requestStatus(e) === 409) conflict();
      else notifyError(e, "Your changes couldn't be saved.");
    } finally {
      saving = null;
      keepDraft();
    }
  })();

  await saving;
};

const save = () => void flush();

/** Another window saved first: load theirs, or keep theirs as a version and save ours over it */
const conflict = () => {
  $q.dialog({
    dark: true,
    title: 'This song changed in another window',
    message: 'Load the newer copy, or keep what you have here. Keeping yours saves the other copy as a version first.',
    persistent: true,
    ok: { label: 'Keep mine', color: 'toneflix', textColor: 'dark', noCaps: true, unelevated: true, rounded: true },
    cancel: { label: 'Load the newer copy', flat: true, noCaps: true, rounded: true },
  })
    .onOk(() => void keepMine())
    .onCancel(() => {
      if (song.value) composer.discard(song.value.id);
      void load({ offerDraft: false });
    });
};

const keepMine = async () => {
  if (!song.value) return;
  const latest = (await loadSongRequest(song.value.id).send()).data;
  await nameSongVersionRequest(song.value.id, 'Saved from another window').send();
  song.value = { ...song.value, revision: latest.revision };
  queue({ title: song.value.title, body: body.value }, { title: song.value.title, body: body.value });
  await flush();
};

/* ---------- Loading ---------- */

const load = async ({ offerDraft = true } = {}) => {
  pending.value = {};
  patch.value = {};
  try {
    const res = await loadSongRequest(String(route.params.song_id)).send();
    song.value = res.data;
    body.value = res.data.body ?? '';
    status.value = 'idle';
    fitBody();
    if (offerDraft) offerRestore();
  } catch (e) {
    notifyError(e, "This song couldn't be opened.");
    void router.replace({ name: 'studio.composer' });
  }
};

/** A draft left from an earlier visit: offer to put it back */
const offerRestore = () => {
  const draft = song.value ? composer.draft(song.value.id) : null;
  if (!song.value || !draft || !Object.keys(draft.input).length) return;
  const id = song.value.id;
  const at = date.formatDate(draft.updatedAt, 'D MMM YYYY [at] h:mm A');

  $q.dialog({
    dark: true,
    title: 'Restore your unsaved changes?',
    message: `This song has changes from ${at} that weren't saved. Restore them to keep working on them, or discard them.`,
    persistent: true,
    ok: { label: 'Restore', color: 'toneflix', textColor: 'dark', noCaps: true, unelevated: true, rounded: true },
    cancel: { label: 'Discard', flat: true, noCaps: true, rounded: true },
  })
    .onOk(() => {
      if (song.value?.id !== id) return;
      const { settings, ...rest } = draft.patch;
      song.value = { ...song.value, ...rest, settings: { ...song.value.settings, ...settings } };
      body.value = song.value.body ?? '';
      pending.value = draft.input;
      patch.value = draft.patch;
      status.value = 'pending';
    })
    .onCancel(() => composer.discard(id));
};

watch(body, (value, old) => {
  if (song.value && old !== undefined && value !== (song.value.body ?? '') && value !== old) {
    song.value.body = value;
    queue({ body: value }, { body: value });
  }
});

const setTitle = (title: string) => {
  if (!song.value) return;
  song.value.title = title;
  if (title.trim()) queue({ title: title.trim() }, { title: title.trim() });
};

const toggleColours = () => {
  if (!song.value) return;
  song.value.settings.rhymeColours = !song.value.settings.rhymeColours;
  queue({ settings: { rhyme_colours: song.value.settings.rhymeColours } }, { settings: { ...song.value.settings } });
};

const onNotesChange = (input: SongInput, shown: Partial<Song>) => {
  if (!song.value) return;
  Object.assign(song.value, shown);
  queue(input, shown);
};

const onRestored = (restored: Song) => {
  pending.value = {};
  patch.value = {};
  song.value = restored;
  body.value = restored.body ?? '';
  status.value = 'saved';
  keepDraft();
};

const toggleBeat = () => {
  if (!beat.value) return;
  if (beat.value.paused) void beat.value.play();
  else beat.value.pause();
};

/* ---------- Words ---------- */

const complete = async (prefix: string) => {
  try {
    return (await completeWordRequest(prefix).send()).data.map((hit) => hit.word);
  } catch {
    return [];
  }
};

/** Estimated length: four sung lines to a bar of four beats, at the song's BPM */
const length = computed(() => {
  if (!song.value?.bpm || !song.value.lineCount) return '';
  const seconds = Math.round(((song.value.lineCount * 4) / song.value.bpm) * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
});

const stripWord = ref('');
const stripHits = ref<WordHit[]>([]);
const stripLoaded = ref(false);
let stripTicket = 0;

const loadStrip = async (word: string) => {
  const mine = ++stripTicket;
  stripLoaded.value = false;
  try {
    const res = await rhymesRequest(word, 'perfect').send();
    if (mine === stripTicket) stripHits.value = res.data.slice(0, 24);
  } catch {
    if (mine === stripTicket) stripHits.value = [];
  } finally {
    if (mine === stripTicket) stripLoaded.value = true;
  }
};

let stripTimer: ReturnType<typeof setTimeout> | null = null;

const onCursor = ({ line, number }: { line: string; number: number }) => {
  cursorText.value = line;
  cursorNumber.value = number;
  maybeAutoSuggest();
  const lines = body.value.split('\n');
  // On an empty line, rhyme with the line above.
  const source = line.trim() || isSectionLine(line) ? line : lines[number - 2] ?? '';
  const word = lastWordOf(source);
  if (word === stripWord.value) return;
  stripWord.value = word;
  stripHits.value = [];
  if (stripTimer) clearTimeout(stripTimer);
  if (word) stripTimer = setTimeout(() => void loadStrip(word), 800);
};

/** Starts a section under the line the cursor is on, with a blank line before it when needed */
const insertSection = (tag: string) => {
  editor.value?.insertLines(`${cursorText.value.trim() ? '\n' : ''}${tag}\n`);
};

const onWordClick = (word: string) => {
  if (panels.lookup) lookupWord.value = word;
};

const toggleLookup = () => {
  panels.lookup = !panels.lookup;
  if (panels.lookup && !lookupWord.value) lookupWord.value = stripWord.value;
};

const openLookup = (word: string) => {
  lookupWord.value = word;
  panels.lookup = true;
};

/* ---------- AI suggestions ---------- */

const ai = ref<AiAccount | null>(null);
const suggestion = ref<LyricSuggestion | null>(null);
const asking = ref<SuggestionKind | null>(null);
const cursorText = ref('');
const cursorNumber = ref(1);
/** The line an automatic suggestion was last asked for, so each new line asks once */
const ghostAsked = ref<number | null>(null);
let autoTimer: ReturnType<typeof setTimeout> | null = null;

const loadAi = async () => {
  try {
    ai.value = await loadAiAccountRequest().send();
  } catch {
    ai.value = null;
  }
};

/**
 * Asks the AI for a kind of suggestion at the cursor. Next-line ideas show in
 * grey in the editor; the rest, and lines the cursor has moved away from, go
 * to the Write panel.
 */
const ask = async (kind: SuggestionKind, { instruction = '', auto = false } = {}) => {
  if (!song.value || !editor.value || asking.value) return;
  const cursor = editor.value.cursorLine();
  asking.value = kind;
  try {
    const res = await suggestLyricsRequest(song.value.id, {
      kind,
      line: cursor.number,
      body: body.value,
      instruction: instruction || undefined,
    }).send();
    const result = res.data;
    if (ai.value) ai.value.balance.total = result.balance;

    const shown = kind === 'line' && editor.value?.showGhost(result.line, result.options.map((o) => o.lines.join(' ')));
    // Asks from the panel always list their options there too.
    if (!auto || !shown) {
      suggestion.value = result;
      if (!auto) panels.write = true;
    }
  } catch (e) {
    if (auto) {
      setAutoSuggest(false);
      notify(
        errorShown(e) ? 'Automatic suggestions are off for now.' : `${errorText(e, 'Suggestions stopped.')} Automatic suggestions are off for now.`,
        'error',
      );
    } else {
      notifyError(e, 'No suggestion this time.');
    }
  } finally {
    asking.value = null;
  }
};

const insertSuggestion = (result: LyricSuggestion, lines: string[]) => {
  if (!editor.value) return;
  if (result.kind === 'rewrite') editor.value.replaceLine(result.line, lines[0] ?? '');
  else {
    // A new section starts after a blank line.
    const gap = isSectionLine(lines[0] ?? '') ? '\n' : '';
    editor.value.insertLines(gap + lines.join('\n'), result.line);
  }
};

const setAutoSuggest = (on: boolean) => {
  if (!song.value) return;
  song.value.settings.autoSuggest = on;
  queue({ settings: { auto_suggest: on } }, { settings: { ...song.value.settings } });
};

/** With auto-suggest on, a fresh empty line under a written one asks for the next line once */
const maybeAutoSuggest = () => {
  if (autoTimer) clearTimeout(autoTimer);
  if (!song.value?.settings.autoSuggest || !ai.value?.access || cursorText.value.trim()) return;
  const number = cursorNumber.value;
  const above = body.value.split('\n')[number - 2] ?? '';
  if (!above.trim() || isSectionLine(above) || ghostAsked.value === number) return;
  autoTimer = setTimeout(() => {
    if (cursorNumber.value !== number || cursorText.value.trim()) return;
    ghostAsked.value = number;
    void ask('line', { auto: true });
  }, 700);
};

/* ---------- Project ---------- */

const projectDialog = ref(false);

const onProjectCreated = (made: Song) => {
  if (!song.value || !made.project) return;
  song.value.project = made.project;
  void router.push({
    name: 'studio.project.track',
    params: { project_id: made.project.slug, track_id: made.project.trackId },
  });
};

/** Saved changes to the lyrics also update the project's lyric sheet, so the project opens up to date */
const openProject = () => {
  if (!song.value?.project) return;
  void router.push({
    name: 'studio.project.track',
    params: { project_id: song.value.project.slug, track_id: song.value.project.trackId },
  });
};

/* ---------- Layout ---------- */

const expanded = ref(false);
/** Phones and small tablets: actions go on their own scrolling row, icons only */
const narrow = computed(() => $q.screen.lt.md);
const showLabels = computed(() => expanded.value && !narrow.value);
const toggleExpanded = () => {
  expanded.value = !expanded.value;
  try {
    LocalStorage.set('composer.actions.expanded', expanded.value);
  } catch {
    // Storage can be unavailable, e.g. in private browsing.
  }
};

/** Closing the tab keeps the draft and lets the browser ask to stay */
const beforeUnload = (event: BeforeUnloadEvent) => {
  if (dirty.value || saving) {
    keepDraft();
    event.preventDefault();
  }
};

const onKeydown = (event: KeyboardEvent) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault();
    save();
  }
};

/* ---------- Leaving with unsaved changes ---------- */

type LeaveChoice = 'save' | 'leave' | 'stay';
const leaving = ref(false);
let answerLeave: ((choice: LeaveChoice) => void) | null = null;

const askToLeave = () =>
  new Promise<LeaveChoice>((resolve) => {
    answerLeave = resolve;
    leaving.value = true;
  });

const chooseLeave = (choice: LeaveChoice) => {
  leaving.value = false;
  answerLeave?.(choice);
  answerLeave = null;
};

onMounted(() => {
  try {
    expanded.value = !!LocalStorage.getItem('composer.actions.expanded');
  } catch {
    expanded.value = false;
  }
  window.addEventListener('beforeunload', beforeUnload);
  window.addEventListener('keydown', onKeydown);
  void load();
  void loadAi();
});

onBeforeRouteLeave(async () => {
  if (saving) await saving;
  if (!dirty.value) return true;

  const choice = await askToLeave();
  if (choice === 'stay') return false;
  if (choice === 'leave') {
    keepDraft();
    return true;
  }
  await flush();
  return !dirty.value;
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
  window.removeEventListener('keydown', onKeydown);
  keepDraft();
  if (autoTimer) clearTimeout(autoTimer);
  beat.value?.pause();
});
</script>

<style lang="scss" scoped>
.leave-card {
  width: 440px;
  max-width: calc(100vw - 32px);
}

.song-title {
  width: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: inherit;
  font-size: 1.25rem;
  font-weight: 700;

  &::placeholder {
    color: rgba(255, 255, 255, 0.35);
  }
}

.song-actions--narrow {
  flex: 0 0 100% !important;
  overflow-x: auto;
  scrollbar-width: none;

  > * {
    flex: none !important;
  }
}

.composer-body {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 16px;
}

.composer-main {
  display: flex;
  flex: 1 1 auto !important;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.composer-dock {
  flex: 0 0 380px !important;
  min-width: 0;

  &:empty {
    display: none;
  }
}

.rhyme-strip {
  flex: 0 0 auto !important;
  padding: 8px 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  font-size: 13px;
  line-height: 1.7;

  &__word {
    margin-right: 6px;
    color: var(--q-toneflix);
    font-weight: 700;
  }

  &__hit {
    margin-right: 8px;
    color: #d8dae0;
    cursor: pointer;

    &:hover {
      color: var(--q-toneflix);
      text-decoration: underline;
    }
  }

  &__more {
    color: var(--q-toneflix);
    font-weight: 600;
    cursor: pointer;
  }
}

.editor-card {
  position: relative;
  flex: 1 1 auto !important;
  min-height: 320px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: #15171c;
}

.expand-toggle :deep(.q-icon) {
  transition: transform 0.3s ease;
}

.expand-toggle--open :deep(.q-icon) {
  transform: rotate(180deg);
}
</style>
