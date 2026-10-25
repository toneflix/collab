<template>
  <ComposerSheet title="Write with AI" caption="Ideas for your next lines. You pick what stays." :dock="dock" v-model="open">
    <div class="write__section" v-if="!account">
      <q-inner-loading dark showing />
    </div>

    <div class="write__section text-sm text-grey-5" v-else-if="!account.enabled">
      AI writing is switched off right now.
    </div>

    <div class="write__section text-sm" v-else-if="!account.access">
      <div class="mb-2 font-semibold">Get AI suggestions with Premium</div>
      <div class="mb-3 text-grey-5">
        AI can suggest your next line as you write, write the next few lines or a whole verse, and give other takes on a
        line, all in your style.
      </div>
      <q-btn unelevated rounded no-caps color="toneflix" text-color="dark" label="See plans" :to="{ name: 'premium' }" />
    </div>

    <template v-else>
      <div class="write__section">
        <div class="flex items-center justify-between gap-2 mb-1 no-wrap">
          <div class="text-xs text-grey-5 !flex-none">{{ account.balance.total }} {{ plural(account.balance.total) }} left</div>
          <router-link class="text-xs text-toneflix !flex-none" :to="{ name: 'studio.credits' }">Get credits</router-link>
        </div>
        <q-toggle
          dark
          dense
          color="toneflix"
          class="mt-2"
          :model-value="autoSuggest"
          :label="`Suggest the next line when I start a new one (${cost('line')} ${plural(cost('line'))} each)`"
          @update:model-value="emit('auto', $event)"
        />
      </div>

      <div class="write__section">
        <div class="write__label">Ask for</div>
        <q-input
          dark
          filled
          dense
          maxlength="200"
          class="mb-2"
          placeholder="Steer it, like &quot;about leaving home&quot; (optional)"
          v-model="instruction"
        />
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="write__ask"
            :key="kind.id"
            :disabled="!!asking || cost(kind.id) > account.balance.total || (kind.id === 'rewrite' && !cursorText.trim())"
            @click="emit('ask', kind.id, instruction.trim())"
            v-for="kind in kinds"
          >
            <q-spinner size="14px" class="mr-1" v-if="asking === kind.id" />
            <span class="font-semibold">{{ kind.label }}</span>
            <span class="text-[11px] text-grey-5">{{ cost(kind.id) }} {{ plural(cost(kind.id)) }}</span>
          </button>
        </div>
        <div class="mt-2 text-xs text-grey-6">
          Lines go after the line your cursor is on. Rewrite works on that line. Before a block or verse, the song is
          saved as a version.
        </div>
        <div class="mt-2 text-xs text-orange" v-if="short">
          You need more credits.
          <router-link :to="{ name: 'studio.credits' }">Get credits</router-link>
        </div>
      </div>

      <div class="write__section" v-if="result">
        <div class="write__label">{{ resultTitle }}</div>
        <div class="write__option" :key="i" v-for="(option, i) in result.options">
          <div class="text-sm write__lines">
            <div :class="{ 'text-grey-5': /^\[.*\]$/.test(line) }" :key="n" v-for="(line, n) in option.lines">
              {{ line }}
            </div>
          </div>
          <div class="flex justify-end gap-2 mt-2">
            <q-btn
              flat
              dense
              rounded
              no-caps
              size="sm"
              color="toneflix"
              :label="result.kind === 'rewrite' ? 'Use this' : 'Insert'"
              @click="emit('insert', result, option.lines)"
            />
          </div>
        </div>
      </div>
    </template>
  </ComposerSheet>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import ComposerSheet from 'src/components/Composer/ComposerSheet.vue';
import type { AiAccount } from 'src/utils/requests/ai';
import type { LyricSuggestion, SuggestionKind } from 'src/utils/requests/composer';

const props = defineProps<{
  dock?: string;
  account?: AiAccount | null;
  result: LyricSuggestion | null;
  /** The kind being asked for now */
  asking: SuggestionKind | null;
  autoSuggest: boolean;
  /** Text of the line the cursor is on */
  cursorText: string;
}>();

const emit = defineEmits<{
  ask: [kind: SuggestionKind, instruction: string];
  insert: [result: LyricSuggestion, lines: string[]];
  auto: [on: boolean];
}>();

const open = defineModel<boolean>({ default: false });

const instruction = ref('');

const kinds: { id: SuggestionKind; label: string }[] = [
  { id: 'line', label: 'Next line' },
  { id: 'block', label: 'Next 4 lines' },
  { id: 'verse', label: 'A verse' },
  { id: 'rewrite', label: 'Rewrite this line' },
];

const fallbackCosts: Record<SuggestionKind, number> = { line: 1, block: 1, verse: 2, rewrite: 1 };

const cost = (kind: SuggestionKind) => props.account?.costs.composer?.[kind] ?? fallbackCosts[kind];
const plural = (n: number) => (n === 1 ? 'credit' : 'credits');

const short = computed(() => !!props.account && props.account.balance.total < cost('line'));

const resultTitle = computed(
  () =>
    ({
      line: 'Next line ideas',
      block: 'Next lines',
      verse: 'A verse',
      rewrite: 'Other takes on the line',
    })[props.result?.kind ?? 'line'],
);
</script>

<style lang="scss" scoped>
.write__section {
  position: relative;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.write__label {
  margin-bottom: 8px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.write__ask {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  color: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;

  &:hover:not(:disabled) {
    border-color: rgba(244, 201, 93, 0.6);
  }

  &:disabled {
    opacity: 0.45;
    cursor: default;
  }
}

.write__option {
  margin-bottom: 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
}

.write__lines {
  line-height: 1.6;
}
</style>
