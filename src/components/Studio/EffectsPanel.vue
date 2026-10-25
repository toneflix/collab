<template>
  <div class="fx">
    <div class="fx__head">
      <div class="font-bold">Effects on {{ name }}</div>
      <q-btn-dropdown
        flat
        dense
        no-caps
        color="toneflix"
        icon="add"
        label="Add"
        :disable="readonly || modelValue.length >= 8"
        dropdown-icon="expand_more"
      >
        <q-list dark dense class="min-w-64 max-h-[60vh]">
          <template :key="group" v-for="group in EFFECT_GROUPS">
            <q-item-label header class="!py-2 !text-xs uppercase tracking-wider">{{ group }}</q-item-label>
            <q-item
              clickable
              v-close-popup
              :key="e.type"
              v-for="e in EFFECTS.filter((x) => x.group === group)"
              @click="add(e.type)"
            >
              <q-item-section>
                <q-item-label>{{ e.label }}</q-item-label>
                <q-item-label caption>{{ e.description }}</q-item-label>
              </q-item-section>
            </q-item>
          </template>
        </q-list>
      </q-btn-dropdown>
    </div>

    <div class="py-6 text-sm text-center text-grey-5" v-if="!modelValue.length">
      No effects yet. Add EQ, reverb, saturation, chorus and more.
    </div>

    <div class="fx__item" :class="{ 'fx__item--off': effect.bypassed }" :key="i" v-for="(effect, i) in modelValue">
      <div class="fx__item-head">
        <q-toggle
          dense
          size="sm"
          color="toneflix"
          :model-value="!effect.bypassed"
          :aria-label="effect.bypassed ? `Turn ${label(effect)} on` : `Turn ${label(effect)} off`"
          :disable="readonly"
          @update:model-value="toggle(i, $event)"
        />
        <span class="font-bold">{{ label(effect) }}</span>
        <q-space />
        <q-btn flat round dense size="sm" icon="arrow_upward" aria-label="Move up" :disable="readonly || i === 0" @click="move(i, -1)" />
        <q-btn flat round dense size="sm" icon="arrow_downward" aria-label="Move down" :disable="readonly || i === modelValue.length - 1" @click="move(i, 1)" />
        <q-btn flat round dense size="sm" icon="close" :aria-label="`Remove ${label(effect)}`" :disable="readonly" @click="remove(i)" />
      </div>
      <label class="fx__param" :key="p.key" v-for="p in effectInfo(effect.type)?.params ?? []">
        <span class="fx__param-label">{{ p.label }}</span>
        <q-slider
          dense
          color="toneflix"
          :min="p.min"
          :max="p.max"
          :step="p.step"
          :disable="readonly"
          :model-value="effect.params[p.key] ?? 0"
          @update:model-value="setParam(i, p.key, $event)"
          @change="emit('commit')"
        />
        <span class="fx__param-value">{{ format(effect.params[p.key] ?? 0, p.unit) }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { EFFECT_GROUPS, EFFECTS, effectInfo, type EffectType, type StemEffect } from 'src/utils/studio/effects';

/**
 * The effect chain of one stem: add, reorder, switch off and adjust effects.
 * Changes are emitted right away so they can be heard while dragging.
 */
const props = defineProps<{ modelValue: StemEffect[]; name: string; readonly?: boolean }>();

const emit = defineEmits<{
  /** The chain changed shape: added, removed, moved or switched */
  'update:modelValue': [effects: StemEffect[]];
  /** One effect's settings changed */
  param: [index: number, params: Record<string, number>];
  /** A slider was let go */
  commit: [];
}>();

const label = (e: StemEffect) => effectInfo(e.type)?.label ?? e.type;

const format = (value: number, unit?: string) => {
  if (unit === 'Hz') {
    if (value >= 1000) return `${(value / 1000).toFixed(1)} kHz`;
    return value < 10 ? `${value.toFixed(2)} Hz` : `${Math.round(value)} Hz`;
  }
  if (unit === '%') return `${Math.round(value * 100)}%`;
  if (unit === 'bits') return `${Math.round(value)} bits`;
  if (unit === 's') return value < 0.1 ? `${Math.round(value * 1000)} ms` : `${value.toFixed(2)} s`;
  if (unit === 'dB') return `${value > 0 ? '+' : ''}${value.toFixed(1)} dB`;
  return Math.abs(value) <= 1 ? `${Math.round(value * 100)}%` : value.toFixed(1);
};

const add = (type: EffectType) => {
  const info = effectInfo(type)!;
  emit('update:modelValue', [...props.modelValue, { type, params: { ...info.defaults }, bypassed: false }]);
};

const remove = (i: number) => emit('update:modelValue', props.modelValue.filter((_, j) => j !== i));

const move = (i: number, by: number) => {
  const list = [...props.modelValue];
  const [item] = list.splice(i, 1);
  list.splice(i + by, 0, item!);
  emit('update:modelValue', list);
};

const toggle = (i: number, on: boolean) =>
  emit('update:modelValue', props.modelValue.map((e, j) => (j === i ? { ...e, bypassed: !on } : e)));

const setParam = (i: number, key: string, value: number | null) => {
  const effect = props.modelValue[i];
  if (!effect || value === null) return;
  effect.params = { ...effect.params, [key]: value };
  emit('param', i, effect.params);
};
</script>

<style lang="scss" scoped>
.fx {
  width: min(360px, 92vw);
  max-height: 70vh;
  padding: 12px;
  overflow-y: auto;

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  &__item {
    padding: 8px 10px;
    margin-top: 8px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);

    &--off {
      opacity: 0.55;
    }
  }

  &__item-head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 6px;

    > *:not(.q-space) {
      flex: none;
    }
  }

  &__param {
    display: grid;
    grid-template-columns: 92px 1fr 64px;
    align-items: center;
    gap: 8px;
    font-size: 0.8rem;
  }

  &__param-label {
    color: #b8bcc4;
  }

  &__param-value {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
}
</style>
