<template>
  <q-page class="p-3 md:p-4">
    <div class="flex items-center gap-3 mb-3 no-wrap">
      <q-btn
        flat
        round
        dense
        class="!flex-none"
        aria-label="Back to your songs"
        :icon="ionArrowBack"
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
          <span :class="{ 'text-orange': status === 'error' }">{{ statusText }}</span>
        </div>
      </div>

      <div class="flex items-center gap-2 ml-auto !flex-none no-wrap" v-if="song">
        <ActionButton
          :label="beatPlaying ? 'Pause beat' : 'Play beat'"
          :icon="beatPlaying ? ionPause : ionPlay"
          :expanded="expanded"
          :active="beatPlaying"
          @click="toggleBeat"
          v-if="song.beat"
        />
        <ActionButton
          label="Rhyme colours"
          :icon="ionColorPalette"
          :expanded="expanded"
          :active="song.settings.rhymeColours"
          @click="toggleColours"
        />
        <ActionButton
          label="Write with AI"
          :icon="ionSparkles"
          :expanded="expanded"
          :active="panels.write"
          @click="panels.write = !panels.write"
        />
        <ActionButton label="Lookup" :icon="ionSearch" :expanded="expanded" :active="panels.lookup" @click="toggleLookup" />
        <ActionButton label="Notes" :icon="ionDocumentText" :expanded="expanded" :active="panels.notes" @click="panels.notes = !panels.notes" />
        <ActionButton label="Versions" :icon="ionTime" :expanded="expanded" :active="panels.versions" @click="panels.versions = !panels.versions" />
        <q-btn
          flat
          round
          dense
          class="!flex-none expand-toggle"
          :class="{ 'expand-toggle--open': expanded }"
          :icon="ionChevronForward"
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
      <VersionsPanel dock="#composer-dock" :song-id="song.id" :flush="flush" v-model="panels.versions" @restored="onRestored" />
      <audio ref="beat" loop preload="none" :src="song.beat?.url" @play="beatPlaying = true" @pause="beatPlaying = false" />
    </template>
  </q-page>
</template>

<script setup lang="ts">
import {
  ionArrowBack,
  ionChevronForward,
  ionColorPalette,
  ionDocumentText,
  ionPause,
  ionPlay,
  ionSearch,
  ionSparkles,
  ionTime,
} from '@quasar/extras/ionicons-v8';
import { LocalStorage, useQuasar } from 'quasar';
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import LookupPanel from 'src/components/Composer/LookupPanel.vue';
import LyricsEditor from 'src/components/Composer/LyricsEditor.vue';
import NotesPanel from 'src/components/Composer/NotesPanel.vue';
import VersionsPanel from 'src/components/Composer/VersionsPanel.vue';
import WritePanel from 'src/components/Composer/WritePanel.vue';
import ActionButton from 'src/components/Studio/ActionButton.vue';
import { useFitToScreen } from 'src/composables/useFitToScreen';
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

const song = ref<Song | null>(null);
const body = ref('');
const editor = ref<InstanceType<typeof LyricsEditor>>();
const beat = ref<HTMLAudioElement | null>(null);
const beatPlaying = ref(false);
const sounds = new WordSounds();
const panels = reactive({ write: false, lookup: false, notes: false, versions: false });
const lookupWord = ref('');

const bodyEl = ref<HTMLElement>();
const { style: fit, measure: fitBody } = useFitToScreen(bodyEl);

/* ---------- Autosave ---------- */

type Status = 'idle' | 'pending' | 'saving' | 'saved' | 'error';
const status = ref<Status>('idle');
const pending = ref<SongInput>({});
let timer: ReturnType<typeof setTimeout> | null = null;
let saving: Promise<void> | null = null;

const statusText = computed(
  () =>
    ({
      idle: 'All changes saved',
      pending: 'Editing…',
      saving: 'Saving…',
      saved: 'All changes saved',
      error: "Couldn't save. Retrying when you type again.",
    })[status.value],
);

const queue = (input: SongInput) => {
  pending.value = {
    ...pending.value,
    ...input,
    settings: input.settings ? { ...pending.value.settings, ...input.settings } : pending.value.settings,
  };
  if (!pending.value.settings) delete pending.value.settings;
  status.value = 'pending';
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), 1500);
};

const errorText = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

/** Saves whatever is waiting now; resolves once the server has it */
const flush = async (): Promise<void> => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (saving) await saving;
  if (!song.value || !Object.keys(pending.value).length) return;

  const sending = pending.value;
  pending.value = {};
  status.value = 'saving';

  saving = (async () => {
    try {
      const res = await saveSongRequest(song.value!.id, song.value!.revision, sending).send();
      const saved = res.data;
      song.value = { ...song.value!, revision: saved.revision, lineCount: saved.lineCount, wordCount: saved.wordCount, updatedAt: saved.updatedAt, beat: saved.beat ?? null };
      status.value = Object.keys(pending.value).length ? 'pending' : 'saved';
    } catch (e) {
      pending.value = { ...sending, ...pending.value };
      if (requestStatus(e) === 409) {
        status.value = 'error';
        conflict();
      } else {
        status.value = 'error';
        notifyError(e, "Your changes couldn't be saved.");
      }
    } finally {
      saving = null;
    }
  })();

  await saving;
  if (Object.keys(pending.value).length && (status.value as Status) === 'pending') timer = setTimeout(() => void flush(), 1500);
};

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
    .onCancel(() => void load());
};

const keepMine = async () => {
  if (!song.value) return;
  const latest = (await loadSongRequest(song.value.id).send()).data;
  await nameSongVersionRequest(song.value.id, 'Saved from another window').send();
  song.value = { ...song.value, revision: latest.revision };
  queue({ title: song.value.title, body: body.value });
  await flush();
};

/* ---------- Loading ---------- */

const load = async () => {
  pending.value = {};
  try {
    const res = await loadSongRequest(String(route.params.song_id)).send();
    song.value = res.data;
    body.value = res.data.body ?? '';
    status.value = 'idle';
    fitBody();
  } catch (e) {
    notifyError(e, "This song couldn't be opened.");
    void router.replace({ name: 'studio.composer' });
  }
};

watch(body, (value, old) => {
  if (song.value && old !== undefined && value !== (song.value.body ?? '') && value !== old) {
    song.value.body = value;
    queue({ body: value });
  }
});

const setTitle = (title: string) => {
  if (!song.value) return;
  song.value.title = title;
  if (title.trim()) queue({ title: title.trim() });
};

const toggleColours = () => {
  if (!song.value) return;
  song.value.settings.rhymeColours = !song.value.settings.rhymeColours;
  queue({ settings: { rhyme_colours: song.value.settings.rhymeColours } });
};

const onNotesChange = (input: SongInput, patch: Partial<Song>) => {
  if (!song.value) return;
  Object.assign(song.value, patch);
  queue(input);
};

const onRestored = (restored: Song) => {
  pending.value = {};
  song.value = restored;
  body.value = restored.body ?? '';
  status.value = 'saved';
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
  if (word) stripTimer = setTimeout(() => void loadStrip(word), 300);
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
    await flush();
    const res = await suggestLyricsRequest(song.value.id, {
      kind,
      line: cursor.number,
      body: body.value,
      instruction: instruction || undefined,
    }).send();
    const result = res.data;
    if (ai.value) ai.value.balance.total = result.balance;

    const shown = kind === 'line' && editor.value?.showGhost(result.line, result.options.map((o) => o.lines.join(' ')));
    if (!shown && !auto) {
      suggestion.value = result;
      panels.write = true;
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
  queue({ settings: { auto_suggest: on } });
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

/* ---------- Layout ---------- */

const expanded = ref(false);
const toggleExpanded = () => {
  expanded.value = !expanded.value;
  try {
    LocalStorage.set('composer.actions.expanded', expanded.value);
  } catch {
    // Storage can be unavailable, e.g. in private browsing.
  }
};

const beforeUnload = (event: BeforeUnloadEvent) => {
  if (Object.keys(pending.value).length || saving) {
    void flush();
    event.preventDefault();
  }
};

onMounted(() => {
  try {
    expanded.value = !!LocalStorage.getItem('composer.actions.expanded');
  } catch {
    expanded.value = false;
  }
  window.addEventListener('beforeunload', beforeUnload);
  void load();
  void loadAi();
});

onBeforeRouteLeave(async () => {
  await flush();
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload);
  if (autoTimer) clearTimeout(autoTimer);
  beat.value?.pause();
});
</script>

<style lang="scss" scoped>
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
