<template>
  <div ref="host" class="lyrics-editor" :class="{ 'lyrics-editor--colours': rhymeColours }" />
</template>

<script setup lang="ts">
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { EditorState, Prec, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
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
  WidgetType,
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
  /** The writer took a suggested line */
  accepted: [line: string];
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

/* ---------- Ghost text: a suggested line shown in grey until Tab takes it ---------- */

type Ghost = { line: number; options: string[]; index: number; below: boolean };

const setGhost = StateEffect.define<Ghost | null>();

class GhostWidget extends WidgetType {
  constructor(
    readonly text: string,
    readonly hint: string,
    readonly below: boolean,
  ) {
    super();
  }

  override eq(other: GhostWidget) {
    return other.text === this.text && other.hint === this.hint && other.below === this.below;
  }

  override toDOM() {
    const el = document.createElement(this.below ? 'div' : 'span');
    el.className = this.below ? 'cm-ghost cm-ghost--below' : 'cm-ghost';
    const text = document.createElement('span');
    text.textContent = this.text;
    const hint = document.createElement('span');
    hint.className = 'cm-ghost__hint';
    hint.textContent = this.hint;
    el.append(text, hint);
    return el;
  }

  override ignoreEvent() {
    return false;
  }
}

const ghostField = StateField.define<Ghost | null>({
  create: () => null,
  update(ghost, tr) {
    for (const effect of tr.effects) if (effect.is(setGhost)) return effect.value;
    if (!ghost) return null;
    if (tr.docChanged) return null;
    if (tr.selection && tr.state.doc.lineAt(tr.state.selection.main.head).number !== ghost.line) return null;
    return ghost;
  },
  provide: (field) =>
    // Block widgets have to come straight from the state, not from a function of the view.
    EditorView.decorations.compute([field], (state) => {
      const ghost = state.field(field);
      if (!ghost || ghost.line > state.doc.lines) return Decoration.none;
      const line = state.doc.line(ghost.line);
      const more = ghost.options.length > 1 ? `${ghost.index + 1}/${ghost.options.length} · Alt+] next · ` : '';
      const widget = new GhostWidget(ghost.options[ghost.index] ?? '', `${more}Tab to add · Esc`, ghost.below);
      return Decoration.set([Decoration.widget({ widget, side: 1, block: ghost.below }).range(line.to)]);
    }),
});

const acceptGhost = (v: EditorView) => {
  const ghost = v.state.field(ghostField);
  if (!ghost) return false;
  const line = v.state.doc.line(ghost.line);
  const text = ghost.options[ghost.index] ?? '';
  const insert = (ghost.below ? '\n' : '') + text;
  v.dispatch({ changes: { from: line.to, insert }, selection: { anchor: line.to + insert.length }, effects: setGhost.of(null) });
  emit('accepted', text);
  return true;
};

const dismissGhost = (v: EditorView) => {
  if (!v.state.field(ghostField)) return false;
  v.dispatch({ effects: setGhost.of(null) });
  return true;
};

const nextGhost = (v: EditorView) => {
  const ghost = v.state.field(ghostField);
  if (!ghost || ghost.options.length < 2) return false;
  v.dispatch({ effects: setGhost.of({ ...ghost, index: (ghost.index + 1) % ghost.options.length }) });
  return true;
};

const ghostKeys = Prec.highest(
  keymap.of([
    { key: 'Tab', run: acceptGhost },
    { key: 'Escape', run: dismissGhost },
    { key: 'Alt-]', run: nextGhost },
  ]),
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
    '.cm-ghost': { color: 'rgba(255,255,255,0.4)', fontStyle: 'italic' },
    '.cm-ghost--below': { padding: '0 16px' },
    '.cm-ghost__hint': { marginLeft: '10px', fontSize: '11px', fontStyle: 'normal', color: 'rgba(255,255,255,0.3)' },
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
        ghostField,
        ghostKeys,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        EditorView.lineWrapping,
        placeholder(props.placeholderText),
        syllableGutter,
        decorations,
        autocompletion({ override: [completeWords], activateOnTypingDelay: 400, icons: false }),
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

/** Puts lines after a line (the cursor's by default), or in it when it is empty */
const insertLines = (lines: string, number?: number) => {
  if (!view) return;
  const line =
    number && number <= view.state.doc.lines ? view.state.doc.line(number) : view.state.doc.lineAt(view.state.selection.main.head);
  const insert = (line.text.trim() ? '\n' : '') + lines;
  const at = line.text.trim() ? line.to : line.from;
  view.dispatch({ changes: { from: at, to: line.text.trim() ? at : line.to, insert }, selection: { anchor: at + insert.length } });
  view.focus();
};

/** Replaces a line's text, keeping the cursor at its end */
const replaceLine = (number: number, text: string) => {
  if (!view || number > view.state.doc.lines) return;
  const line = view.state.doc.line(number);
  view.dispatch({ changes: { from: line.from, to: line.to, insert: text }, selection: { anchor: line.from + text.length } });
  view.focus();
};

/**
 * Shows suggested lines in grey at a line: filling it when it is empty, or
 * below it when it has words. Nothing shows when the cursor has left the line.
 */
const showGhost = (number: number, options: string[]) => {
  if (!view || !options.length || number > view.state.doc.lines) return false;
  if (view.state.doc.lineAt(view.state.selection.main.head).number !== number) return false;
  const line = view.state.doc.line(number);
  const below = line.text.trim() !== '';
  view.dispatch({
    effects: [setGhost.of({ line: number, options, index: 0, below }), EditorView.scrollIntoView(line.to, { y: 'nearest' })],
  });
  view.focus();
  return true;
};

const clearGhost = () => view && dismissGhost(view);

/** The cursor's line, counted from 1, and its text */
const cursorLine = () => {
  if (!view) return { number: 1, text: '' };
  const line = view.state.doc.lineAt(view.state.selection.main.head);
  return { number: line.number, text: line.text };
};

const focus = () => view?.focus();

defineExpose({ insertWord, insertLines, replaceLine, showGhost, clearGhost, cursorLine, focus });
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
