<template>
  <ComposerSheet title="Lookup" :caption="caption" :dock="dock" v-model="open">
    <template #top>
      <div class="px-8 pt-4">
        <q-input
          dark
          filled
          dense
          clearable
          debounce="400"
          placeholder="Look up a word"
          v-model="word"
        >
          <template #prepend><q-icon :name="ionSearch" size="18px" /></template>
        </q-input>
      </div>
      <q-tabs dense no-caps align="left" class="px-2 mt-2 text-grey-5" active-color="toneflix" indicator-color="toneflix" v-model="tab">
        <q-tab name="rhymes" label="Rhymes" />
        <q-tab name="related" label="Related" />
        <q-tab name="definitions" label="Definitions" />
      </q-tabs>
      <div class="flex gap-1 px-8 pt-2 no-wrap" v-if="tab !== 'definitions'">
        <q-btn
          unelevated
          dense
          no-caps
          size="sm"
          class="!flex-none px-2"
          :key="option.value"
          :label="option.label"
          :color="mode === option.value ? 'toneflix' : 'grey-9'"
          :text-color="mode === option.value ? 'dark' : 'grey-4'"
          @click="mode = option.value"
          v-for="option in modes"
        />
      </div>
    </template>

    <q-inner-loading dark :showing="loading" />

    <div class="py-8 text-sm text-center text-grey-5" v-if="!word">
      Click a word in your lyrics, or type one above.
    </div>

    <template v-else-if="tab === 'definitions'">
      <div class="py-8 text-sm text-center text-grey-5" v-if="loaded && !definitions.length">
        No definitions for "{{ word }}".
      </div>
      <div class="definition" :key="i" v-for="(d, i) in definitions">
        <div class="text-xs font-bold uppercase text-grey-5" v-if="d.partOfSpeech">{{ d.partOfSpeech }}</div>
        <div class="text-sm">{{ d.text }}</div>
      </div>
    </template>

    <template v-else>
      <div class="py-8 text-sm text-center text-grey-5" v-if="loaded && !hits.length">
        Nothing found for "{{ word }}".
      </div>
      <div class="mb-4" :key="group.label" v-for="group in groups">
        <div class="mb-1 text-xs font-bold text-grey-5" v-if="group.label">{{ group.label }}</div>
        <div class="flex flex-wrap gap-x-1 gap-y-0.5">
          <button
            type="button"
            class="hit"
            :key="hit.word"
            :title="`Insert ${hit.word}`"
            @click="emit('insert', hit.word)"
            v-for="hit in group.hits"
          >
            {{ hit.word }}
          </button>
        </div>
      </div>
    </template>

    <div class="pt-2 text-xs text-grey-6" v-if="source === 'datamuse' && word">
      Results from <a href="https://www.datamuse.com/api/" target="_blank" rel="noopener" class="text-toneflix">Datamuse</a>
    </div>
  </ComposerSheet>
</template>

<script setup lang="ts">
import { ionSearch } from '@quasar/extras/ionicons-v8';
import { computed, ref, watch } from 'vue';
import ComposerSheet from 'src/components/Composer/ComposerSheet.vue';
import {
  definitionsRequest,
  relatedWordsRequest,
  rhymesRequest,
  type Definition,
  type RelatedType,
  type RhymeType,
  type WordHit,
} from 'src/utils/requests/composer';

defineProps<{ dock?: string }>();

const emit = defineEmits<{ insert: [word: string] }>();

const open = defineModel<boolean>({ default: false });
const word = defineModel<string>('word', { default: '' });

type Tab = 'rhymes' | 'related' | 'definitions';

const tab = ref<Tab>('rhymes');
const rhymeMode = ref<RhymeType>('perfect');
const relatedMode = ref<RelatedType>('means');
const hits = ref<WordHit[]>([]);
const definitions = ref<Definition[]>([]);
const source = ref<'datamuse' | 'local'>('local');
const loading = ref(false);
const loaded = ref(false);

const modes = computed(() =>
  tab.value === 'rhymes'
    ? [
        { value: 'perfect', label: 'Perfect' },
        { value: 'near', label: 'Near' },
        { value: 'multi', label: 'Multi' },
        { value: 'sounds', label: 'Sounds like' },
      ]
    : [
        { value: 'means', label: 'Similar meaning' },
        { value: 'follows', label: 'Often follows' },
        { value: 'triggers', label: 'Goes with' },
      ],
);

const mode = computed({
  get: () => (tab.value === 'rhymes' ? rhymeMode.value : relatedMode.value),
  set: (value: string) => {
    if (tab.value === 'rhymes') rhymeMode.value = value as RhymeType;
    else relatedMode.value = value as RelatedType;
  },
});

const caption = computed(() => (word.value ? `Words for "${word.value}"` : 'Rhymes, related words and meanings'));

/** Rhymes are grouped by syllables; related words stay in score order */
const groups = computed(() => {
  if (tab.value !== 'rhymes') return [{ label: '', hits: hits.value }];
  const bySyllables = new Map<number, WordHit[]>();
  hits.value.forEach((hit) => {
    const n = hit.syllables ?? 0;
    bySyllables.set(n, [...(bySyllables.get(n) ?? []), hit]);
  });
  return [...bySyllables.entries()]
    .sort(([a], [b]) => (a || 99) - (b || 99))
    .map(([n, list]) => ({ label: n ? `${n} ${n === 1 ? 'syllable' : 'syllables'}` : 'Other', hits: list }));
});

let ticket = 0;

const load = async () => {
  const w = (word.value || '').trim();
  loaded.value = false;
  hits.value = [];
  definitions.value = [];
  if (!w || !open.value) return;

  const mine = ++ticket;
  loading.value = true;
  try {
    if (tab.value === 'definitions') {
      const res = await definitionsRequest(w).send();
      if (mine !== ticket) return;
      definitions.value = res.data;
      source.value = res.source;
    } else {
      const res = await (tab.value === 'rhymes' ? rhymesRequest(w, rhymeMode.value) : relatedWordsRequest(w, relatedMode.value)).send();
      if (mine !== ticket) return;
      hits.value = res.data;
      source.value = res.source;
    }
    loaded.value = true;
  } catch {
    if (mine === ticket) loaded.value = true;
  } finally {
    if (mine === ticket) loading.value = false;
  }
};

watch([word, tab, rhymeMode, relatedMode, open], () => void load());
</script>

<style lang="scss" scoped>
.hit {
  padding: 2px 6px;
  border-radius: 6px;
  color: #e9e9ef;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--q-toneflix);
  }
}

.definition {
  padding: 10px 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}
</style>
