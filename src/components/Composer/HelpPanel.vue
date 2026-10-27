<template>
  <ComposerSheet title="How Composer works" caption="Tips for writing, marking sections and using AI." :dock="dock" v-model="open">
    <!-- The toolbar buttons, so the icons are easy to learn (phones show icons only) -->
    <section class="help__section">
      <div class="help__label">Toolbar</div>
      <div class="help__tools">
        <template :key="tool.name" v-for="tool in tools">
          <span class="help__icon"><q-icon :name="tool.icon" size="16px" /></span>
          <span><b>{{ tool.name }}</b> {{ tool.what }}</span>
        </template>
      </div>
    </section>

    <section class="help__section">
      <div class="help__label">Sections</div>
      <p>
        Put a tag in square brackets on a line of its own to start a section, like <code>[Verse 1]</code>,
        <code>[Hook]</code> or <code>[Bridge]</code>. Tags show in grey and are never counted or sung.
      </p>
      <ul>
        <li>Rhyme colours start over in each section, so only rhymes in the same verse or hook match.</li>
        <li>AI reads the tags to know where it is in the composition and can start new sections with them.</li>
        <li>Tags and blank lines are left off a project's lyric sheet. AI singing gets them, to shape the song it sings.</li>
      </ul>
      <div class="flex flex-wrap gap-2 mt-2">
        <button type="button" class="help__chip flex-none!" :key="tag" @click="emit('section', tag)" v-for="tag in tags">
          {{ tag }}
        </button>
      </div>
      <div class="mt-1 text-xs text-grey-6">Adds the tag on a new line under the line you're on.</div>
    </section>

    <section class="help__section">
      <div class="help__label">Syllables and rhymes</div>
      <ul>
        <li>The number beside each line is its syllable count. Keep paired lines close to flow on the same beat.</li>
        <li>
          Rhyme colours (<q-icon name="lucide-palette" size="14px" />) colour words that share an end sound. Little words like "the" stay plain
          unless they end a line.
        </li>
        <li>The strip above the lyrics lists rhymes for the last word of your line, or the line above when yours is empty. Click one to add it.</li>
        <li>Word ideas pop up as you type. Use the arrow keys and Enter to pick one.</li>
      </ul>
    </section>

    <section class="help__section">
      <div class="help__label"><q-icon name="lucide-search" size="13px" /> Lookup</div>
      <p>
        Find rhymes (perfect, near, sounds like and multi-syllable), related words and meanings. With Lookup open, click
        any word in your lyrics to look it up.
      </p>
    </section>

    <section class="help__section">
      <div class="help__label"><q-icon name="lucide-sparkles" size="13px" /> Write with AI</div>
      <ul>
        <li>Ask for the next line, the next four lines, a verse or another take on the line your cursor is on. Each ask costs credits.</li>
        <li>Steer it with a few words, like "about leaving home".</li>
        <li>Next-line ideas show in grey in your lyrics: <kbd>Tab</kbd> adds one, <kbd>Alt</kbd>+<kbd>]</kbd> shows the next, <kbd>Esc</kbd> hides them.</li>
        <li>Turn on automatic suggestions to get an idea each time you start a new line.</li>
        <li>Before a block or verse goes in, the composition is kept as a version so you can go back.</li>
      </ul>
    </section>

    <section class="help__section">
      <div class="help__label"><q-icon name="lucide-clock" size="13px" /> Saving and versions</div>
      <ul>
        <li>Changes stay on this device until you press Save or <kbd>{{ mod }}</kbd>+<kbd>S</kbd>.</li>
        <li>Leaving with unsaved changes asks you to save first. If you don't, you can restore them the next time you open the composition here.</li>
        <li>Versions keeps earlier copies. Name one before a big rewrite, and restore any of them later.</li>
      </ul>
    </section>

    <section class="help__section">
      <div class="help__label"><q-icon name="lucide-file-text" size="13px" /> Notes, beat and projects</div>
      <ul>
        <li>Notes holds the BPM, key, a beat to write to and a scratchpad. With a BPM set, the top line shows how long the composition runs.</li>
        <li>Add to a project turns the composition into a track with its lyric sheet, on a new project or one you own or collaborate on, and AI can sing it. After that, every save that changes the lyrics updates the sheet too.</li>
      </ul>
    </section>

    <section class="help__section">
      <div class="help__label">Shortcuts</div>
      <div class="help__keys">
        <template :key="keys" v-for="[keys, what] in shortcuts">
          <kbd>{{ keys }}</kbd>
          <span>{{ what }}</span>
        </template>
      </div>
    </section>
  </ComposerSheet>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ComposerSheet from 'src/components/Composer/ComposerSheet.vue';

defineProps<{ dock?: string }>();

const emit = defineEmits<{ section: [tag: string] }>();

const open = defineModel<boolean>({ default: false });

/** Same icons, in the same order, as the toolbar on the page. */
const tools = [
  { icon: 'lucide-save', name: 'Save', what: 'keeps your changes. They stay on this device until you do.' },
  { icon: 'lucide-play:fill', name: 'Play beat', what: 'plays the beat from Notes while you write. It shows once a beat is added.' },
  { icon: 'lucide-palette', name: 'Rhyme colours', what: 'colours words that rhyme.' },
  { icon: 'lucide-sparkles', name: 'Write with AI', what: 'gives ideas for your next lines.' },
  { icon: 'lucide-globe', name: 'Artwork and publishing', what: 'adds a cover and shares the composition.' },
  { icon: 'lucide-library', name: 'Add to a project', what: 'turns it into a track, or opens its project.' },
  { icon: 'lucide-search', name: 'Lookup', what: 'finds rhymes, related words and meanings.' },
  { icon: 'lucide-file-text', name: 'Notes', what: 'holds the BPM, key, beat and a scratchpad.' },
  { icon: 'lucide-clock', name: 'Versions', what: 'keeps earlier copies you can go back to.' },
  { icon: 'lucide-info', name: 'How it works', what: 'opens this guide.' },
];

const tags = ['[Intro]', '[Verse]', '[Pre-Hook]', '[Hook]', '[Bridge]', '[Outro]'];

const mod = computed(() => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl'));

const shortcuts = computed(() => [
  [`${mod.value}+S`, 'Save'],
  [`${mod.value}+Z`, 'Undo'],
  [`${mod.value}+Shift+Z`, 'Redo'],
  ['Ctrl+Space', 'Show word ideas'],
  ['Tab', 'Add the grey suggestion'],
  ['Alt+]', 'Next suggestion'],
  ['Esc', 'Hide the suggestion'],
]);
</script>

<style lang="scss" scoped>
.help__section {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13px;
  line-height: 1.6;
  color: #c9ccd3;

  p {
    margin: 0 0 6px;
  }

  ul {
    margin: 0;
    padding-left: 18px;
    list-style: disc;
  }

  li + li {
    margin-top: 4px;
  }

  code {
    padding: 1px 5px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    color: #e6e8ec;
  }
}

.help__label {
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.help__chip {
  padding: 3px 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: 12px;
  cursor: pointer;

  &:hover {
    border-color: rgba(244, 201, 93, 0.6);
  }
}

.help__tools {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 8px 10px;
  align-items: start;

  b {
    color: #e6e8ec;
    font-weight: 600;
  }
}

.help__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  color: #e6e8ec;
}

.help__label .q-icon {
  margin-top: -2px;
  margin-right: 2px;
}

.help__keys {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 6px 12px;
  align-items: center;
}

kbd {
  padding: 1px 6px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  color: #e6e8ec;
  font-family: inherit;
  font-size: 11px;
  white-space: nowrap;
}

.help__keys kbd {
  justify-self: start;
}
</style>
