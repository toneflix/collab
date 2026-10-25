<template>
  <div ref="host" class="lyrics-editor" :class="{ 'lyrics-editor--colours': rhymeColours }" />
</template>

<script setup lang="ts">
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState, RangeSetBuilder, StateEffect } from '@codemirror/state';
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  gutter,
  keymap,
  placeholder,
  ViewPlugin,
  type ViewUpdate,
} from '@codemirror/view';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { isSectionLine, RHYME_FAMILIES, rhymeFamilies, tokensOf, type WordSounds } from 'src/utils/composer';

const props = withDefaults(
  defineProps<{
    sounds: WordSounds;
    rhymeColours?: boolean;
    placeholderText?: string;
    /** Words that start with what is being typed, for completion */
    complete?: (prefix: string) => Promise<string[]>;
  }>(),
  { rhymeColours: true, placeholderText: 'Start writing. Use [Verse], [Hook] or [Bridge] on their own line to start a section.' },
);

const emit = defineEmits<{
  /** The line the cursor is on, its number from 1 and the word under the cursor */
  cursor: [info: { line: string; number: number; word: string }];
  /** A word the writer clicked */
  word: [word: string];
}>();

const text = defineModel<string>({ default: '' });

const host = ref<HTMLElement | null>(null);
let view: EditorView | null = null;

/** Tells the gutter and colours to redraw, for example when syllable counts arrive */
const redraw = StateEffect.define<null>();

const redrawn = (update: ViewUpdate) =>
  update.docChanged || update.transactions.some((t) => t.effects.some((e) => e.is(redraw)));

class CountMarker extends GutterMarker {
  constructor(readonly count: number) {
    super();
  }

  override eq(other: CountMarker) {
    return other.count === this.count;
  }

  override toDOM() {
    const el = document.createElement('span');
    el.textContent = String(this.count);
    return el;
  }
}

const syllableGutter = gutter({
  class: 'cm-syllables',
  lineMarker(v, block) {
    const line = v.state.doc.lineAt(block.from).text;
    if (!line.trim() || isSectionLine(line)) return null;
    return new CountMarker(props.sounds.lineSyllables(line));
  },
  lineMarkerChange: redrawn,
  initialSpacer: () => new CountMarker(88),
});

const sectionLine = Decoration.line({ class: 'cm-section-line' });
const rhymeMarks = Array.from({ length: RHYME_FAMILIES }, (_, i) => Decoration.mark({ class: `cm-rhyme cm-rhyme-${i}` }));

const decorate = (v: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = v.state.doc;
  const lines = doc.toString().split('\n');
  const families = props.rhymeColours ? rhymeFamilies(lines, props.sounds) : new Map<string, number>();

  lines.forEach((line, i) => {
    const start = doc.line(i + 1).from;
    if (isSectionLine(line)) {
      builder.add(start, start, sectionLine);
      return;
    }
    tokensOf(line).forEach((token, w) => {
      const family = families.get(`${i}:${w}`);
      const mark = family === undefined ? null : rhymeMarks[family];
      if (mark) builder.add(start + token.from, start + token.to, mark);
    });
  });

  return builder.finish();
};

const decorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(v: EditorView) {
      this.decorations = decorate(v);
    }

    update(update: ViewUpdate) {
      if (redrawn(update)) this.decorations = decorate(update.view);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const wordAt = (state: EditorState, pos: number) => {
  const line = state.doc.lineAt(pos);
  const offset = pos - line.from;
  return tokensOf(line.text).find((t) => offset >= t.from && offset <= t.to)?.word ?? '';
};

const completeWords = async (context: CompletionContext): Promise<CompletionResult | null> => {
  const typed = context.matchBefore(/[\p{L}']{2,}/u);
  if (!props.complete || !typed || (typed.from === typed.to && !context.explicit)) return null;

  const words = await props.complete(typed.text.toLowerCase());
  if (context.aborted || !words.length) return null;

  return {
    from: typed.from,
    options: words.map((label) => ({ label, type: 'text' })),
    validFor: /^[\p{L}']*$/u,
  };
};

const theme = EditorView.theme(
  {
    '&': { height: '100%', fontSize: '16px', backgroundColor: 'transparent' },
    '.cm-scroller': { fontFamily: 'inherit', lineHeight: '1.75' },
    '.cm-content': { padding: '12px 0', caretColor: 'var(--q-toneflix, #f4c95d)' },
    '.cm-line': { padding: '0 16px' },
    '.cm-gutters': { backgroundColor: 'transparent', border: 'none', borderRight: '1px solid rgba(255,255,255,0.08)' },
    '.cm-syllables .cm-gutterElement': { color: 'rgba(255,255,255,0.45)', fontSize: '12px', padding: '0 10px 0 12px', textAlign: 'right', lineHeight: '28px' },
    '.cm-section-line': { color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: '0.02em' },
    '&.cm-focused': { outline: 'none' },
    '.cm-placeholder': { color: 'rgba(255,255,255,0.35)' },
  },
  { dark: true },
);

onMounted(() => {
  view = new EditorView({
    parent: host.value!,
    state: EditorState.create({
      doc: text.value,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        placeholder(props.placeholderText),
        syllableGutter,
        decorations,
        autocompletion({ override: [completeWords], activateOnTypingDelay: 250, icons: false }),
        theme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const value = update.state.doc.toString();
            text.value = value;
            props.sounds.want(value);
          }
          if (update.docChanged || update.selectionSet) {
            const head = update.state.selection.main.head;
            const line = update.state.doc.lineAt(head);
            emit('cursor', { line: line.text, number: line.number, word: wordAt(update.state, head) });
          }
        }),
        EditorView.domEventHandlers({
          click(event, v) {
            const pos = v.posAtCoords({ x: event.clientX, y: event.clientY });
            const word = pos === null ? '' : wordAt(v.state, pos);
            if (word) emit('word', word);
          },
        }),
      ],
    }),
  });

  props.sounds.want(text.value);
});

const stopSounds = props.sounds.onChange(() => view?.dispatch({ effects: redraw.of(null) }));

watch(text, (value) => {
  if (view && value !== view.state.doc.toString()) {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } });
  }
});

watch(
  () => props.rhymeColours,
  () => view?.dispatch({ effects: redraw.of(null) }),
);

onBeforeUnmount(() => {
  stopSounds();
  view?.destroy();
  view = null;
});

/** Puts a word at the cursor, with a space before it when it would touch the previous word */
const insertWord = (word: string) => {
  if (!view) return;
  const { from, to } = view.state.selection.main;
  const before = view.state.sliceDoc(Math.max(0, from - 1), from);
  const insert = (before && !/\s/.test(before) ? ' ' : '') + word;
  view.dispatch({ changes: { from, to, insert }, selection: { anchor: from + insert.length } });
  view.focus();
};

/** Puts lines after the cursor's line */
const insertLines = (lines: string) => {
  if (!view) return;
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  const insert = (line.text.trim() ? '\n' : '') + lines;
  const at = line.text.trim() ? line.to : line.from;
  view.dispatch({ changes: { from: at, to: line.text.trim() ? at : line.to, insert }, selection: { anchor: at + insert.length } });
  view.focus();
};

const focus = () => view?.focus();

defineExpose({ insertWord, insertLines, focus });
</script>

<style lang="scss" scoped>
.lyrics-editor {
  height: 100%;
  min-height: 0;

  :deep(.cm-editor) {
    height: 100%;
  }
}

.lyrics-editor--colours {
  :deep(.cm-rhyme) {
    border-radius: 3px;
    font-weight: 600;
  }

  :deep(.cm-rhyme-0) { color: #f4c95d; }
  :deep(.cm-rhyme-1) { color: #7cc6fe; }
  :deep(.cm-rhyme-2) { color: #f49097; }
  :deep(.cm-rhyme-3) { color: #9be08f; }
  :deep(.cm-rhyme-4) { color: #c9a7ff; }
  :deep(.cm-rhyme-5) { color: #ffb26b; }
  :deep(.cm-rhyme-6) { color: #6be4d9; }
  :deep(.cm-rhyme-7) { color: #ff8fd0; }
}
</style>
