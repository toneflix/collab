<template>
  <div
    class="stem-strip"
    :class="{ 'stem-strip--selected': selected }"
    :style="{ '--stem': color }"
    @pointerdown="host.select(trackId)"
  >
    <div class="stem-strip__top">
      <button type="button" class="stem-strip__dot" aria-label="Change colour" :disabled="host.readonly" @click.stop="host.openColors(trackId)" />
      <span class="stem-strip__name" :title="name">{{ name }}</span>
      <IconBtn size="sm" icon="lucide-ellipsis-vertical" class="stem-strip__menu" :aria-label="`More for ${name}`" v-if="!host.readonly">
        <q-menu dark anchor="bottom right" self="top right">
          <q-list dense style="min-width: 160px">
            <q-item clickable v-close-popup @click="host.openEffects(trackId)">
              <q-item-section>Effects</q-item-section>
            </q-item>
            <q-item clickable v-close-popup @click="host.openColors(trackId)">
              <q-item-section>Colour</q-item-section>
            </q-item>
            <template v-if="host.hasNotes(trackId)">
              <q-item clickable v-close-popup @click="host.editNotes(trackId)">
                <q-item-section>Edit notes</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="host.openInstrument(trackId)">
                <q-item-section>Instrument settings</q-item-section>
              </q-item>
            </template>
            <q-item
              v-for="lane in lanes"
              :key="lane.param ?? 'hide'"
              clickable
              v-close-popup
              @click="host.showAutomation(trackId, lane.param)"
            >
              <q-item-section>{{ lane.label }}</q-item-section>
            </q-item>
            <q-item clickable v-close-popup :disable="!stem" @click="host.duplicate(trackId)">
              <q-item-section>Duplicate</q-item-section>
            </q-item>
            <q-item clickable v-close-popup :disable="index <= 0" @click="host.move(trackId, index - 1)">
              <q-item-section>Move up</q-item-section>
            </q-item>
            <q-item clickable v-close-popup :disable="index >= host.count() - 1" @click="host.move(trackId, index + 1)">
              <q-item-section>Move down</q-item-section>
            </q-item>
            <q-separator dark />
            <q-item clickable v-close-popup class="text-red-4" :disable="!stem" @click="host.remove(trackId)">
              <q-item-section>Remove</q-item-section>
            </q-item>
          </q-list>
        </q-menu>
      </IconBtn>
    </div>
    <div class="stem-strip__buttons">
      <button
        type="button"
        class="stem-strip__toggle"
        :class="{ 'stem-strip__toggle--mute': channel.mute }"
        :aria-pressed="channel.mute"
        :aria-label="`Mute ${name}`"
        @click.stop="host.setChannel(trackId, { mute: !channel.mute })"
      >
        M
      </button>
      <button
        type="button"
        class="stem-strip__toggle"
        :class="{ 'stem-strip__toggle--solo': channel.solo }"
        :aria-pressed="channel.solo"
        :aria-label="`Solo ${name}`"
        @click.stop="host.setChannel(trackId, { solo: !channel.solo })"
      >
        S
      </button>
      <button
        type="button"
        class="stem-strip__toggle stem-strip__fx"
        :class="{ 'stem-strip__toggle--on': effects > 0 }"
        :aria-label="`Effects on ${name}`"
        @click.stop="host.openEffects(trackId)"
      >
        FX<template v-if="effects"> {{ effects }}</template>
      </button>
      <span class="stem-strip__meter" aria-hidden="true" :style="{ '--level': host.level(trackId) }"><i /></span>
    </div>
    <div class="stem-strip__sliders">
      <q-slider
        dense
        color="toneflix"
        track-size="3px"
        thumb-size="11px"
        :min="0"
        :max="1"
        :step="0.01"
        :model-value="channel.volume"
        :aria-label="`Volume of ${name}`"
        :readonly="host.readonly"
        @update:model-value="host.setChannel(trackId, { volume: $event ?? 0 })"
        @change="host.committed()"
        @dblclick="host.setChannel(trackId, { volume: 1 }, true)"
      />
      <q-slider
        dense
        color="grey-5"
        track-size="3px"
        thumb-size="11px"
        class="stem-strip__pan"
        :min="-1"
        :max="1"
        :step="0.01"
        :model-value="channel.pan"
        :aria-label="`Pan of ${name}`"
        :readonly="host.readonly"
        @update:model-value="host.setChannel(trackId, { pan: $event ?? 0 })"
        @change="host.committed()"
        @dblclick="host.setChannel(trackId, { pan: 0 }, true)"
      >
        <q-tooltip>Pan {{ panLabel }}</q-tooltip>
      </q-slider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export interface StripChannel {
  volume: number;
  pan: number;
  mute: boolean;
  solo: boolean;
}

/** What a track header reads from and asks of the editor. */
export interface StripHost {
  readonly: boolean;
  channel: (trackId: string) => StripChannel;
  name: (trackId: string) => string;
  color: (trackId: string) => string;
  effects: (trackId: string) => number;
  level: (trackId: string) => number;
  index: (trackId: string) => number;
  count: () => number;
  selected: () => string | null;
  hasStem: (trackId: string) => boolean;
  /** An instrument track this person can edit */
  hasNotes: (trackId: string) => boolean;
  select: (trackId: string) => void;
  setChannel: (trackId: string, patch: Partial<StripChannel>, commit?: boolean) => void;
  committed: () => void;
  openEffects: (trackId: string) => void;
  openColors: (trackId: string) => void;
  editNotes: (trackId: string) => void;
  openInstrument: (trackId: string) => void;
  /** The automation lane shown under a track, if any */
  automation: (trackId: string) => 'volume' | 'pan' | null;
  showAutomation: (trackId: string, param: 'volume' | 'pan' | null) => void;
  duplicate: (trackId: string) => void;
  move: (trackId: string, index: number) => void;
  remove: (trackId: string) => void;
}

/** A stem's controls beside its lane: colour, name, mute, solo, effects, volume and pan. */
const props = defineProps<{ trackId: string; host: StripHost }>();

const channel = computed(() => props.host.channel(props.trackId));
const name = computed(() => props.host.name(props.trackId));
const color = computed(() => props.host.color(props.trackId));
const effects = computed(() => props.host.effects(props.trackId));
const index = computed(() => props.host.index(props.trackId));
const selected = computed(() => props.host.selected() === props.trackId);
const stem = computed(() => props.host.hasStem(props.trackId));

/** Menu items for the automation lanes this track isn't showing. */
const lanes = computed(() => {
  const shown = props.host.automation(props.trackId);
  const all = [
    { param: 'volume' as const, label: 'Volume automation' },
    { param: 'pan' as const, label: 'Pan automation' },
    { param: null, label: 'Hide automation' },
  ];

  return all.filter((lane) => lane.param !== shown && (lane.param || shown));
});
const panLabel = computed(() => {
  const pan = Math.round(channel.value.pan * 100);
  return pan === 0 ? 'centre' : `${Math.abs(pan)}% ${pan < 0 ? 'left' : 'right'}`;
});
</script>

<style lang="scss" scoped>
.stem-strip {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  height: 100%;
  padding: 4px 8px 4px 12px;
  box-sizing: border-box;
  position: relative;
  border-left: 3px solid var(--stem);

  &--selected {
    background: color-mix(in srgb, var(--stem) 14%, transparent);
  }
}

.stem-strip__top,
.stem-strip__buttons,
.stem-strip__sliders {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.stem-strip__dot {
  width: 12px;
  height: 12px;
  flex: none;
  border-radius: 50%;
  border: 0;
  padding: 0;
  background: var(--stem);
  cursor: pointer;
}

.stem-strip__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 600;
}

.stem-strip__menu {
  flex: none;
  margin: -4px -6px -4px 0;
}

.stem-strip__toggle {
  flex: none;
  min-width: 20px;
  height: 18px;
  padding: 0 4px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;

  &--mute {
    background: #f59e0b;
    border-color: #f59e0b;
    color: #111;
  }

  &--solo {
    background: #22c55e;
    border-color: #22c55e;
    color: #111;
  }

  &--on {
    border-color: var(--stem);
    color: var(--stem);
  }
}

.stem-strip__meter {
  flex: 1;
  height: 4px;
  min-width: 12px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;

  i {
    display: block;
    height: 100%;
    width: calc(var(--level, 0) * 100%);
    background: linear-gradient(90deg, #2ed47a 0 70%, #ffb020 85%, #ff5c8a);
  }
}

.stem-strip__pan {
  max-width: 40%;
}

/* Phones keep colour, name, mute and solo; effects, volume and pan live in the menu and the mixer */
@media (max-width: 599.98px) {
  .stem-strip {
    gap: 6px;
    padding-left: 10px;
  }

  .stem-strip__fx,
  .stem-strip__meter,
  .stem-strip__sliders {
    display: none;
  }

  .stem-strip__toggle {
    min-width: 32px;
    height: 28px;
    font-size: 12px;
  }
}
</style>
