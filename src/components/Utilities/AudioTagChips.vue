<template>
  <div class="audio-tags" v-if="hasTags || editable">
    <span class="audio-tag" :title="sourceHint" v-if="tags?.bpm">
      {{ Math.round(tags.bpm) }} BPM
    </span>
    <span class="audio-tag" :title="`${tags.key} • ${sourceHint}`" v-if="tags?.key">
      {{ tags.keyShort }}
      <span class="audio-tag__camelot">{{ tags.camelot }}</span>
    </span>
    <button
      type="button"
      class="audio-tag audio-tag--edit"
      :title="hasTags ? 'Change the tempo and key' : 'Add a tempo and key'"
      @click="open = true"
      v-if="editable"
    >
      <q-icon :name="hasTags ? 'lucide-square-pen' : 'lucide-plus'" size="12px" />
      <span v-if="!hasTags">Tempo and key</span>
    </button>

    <q-dialog v-model="open" v-if="editable">
      <q-card dark class="w-full max-w-sm">
        <q-card-section class="text-lg font-bold">Tempo and key</q-card-section>
        <q-card-section class="pt-0 text-sm text-grey-5">
          {{
            tags?.source === 'manual'
              ? 'You set these yourself.'
              : tags?.source === 'detected'
                ? 'These were detected from the audio. Correct them if they are off.'
                : 'Nothing was detected yet.'
          }}
        </q-card-section>
        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-input
            dark
            outlined
            dense
            clearable
            type="number"
            label="BPM"
            min="20"
            max="300"
            :error="!!errors.bpm"
            :error-message="errors.bpm"
            v-model.number="form.bpm"
          />
          <q-select
            dark
            outlined
            dense
            clearable
            emit-value
            map-options
            label="Key"
            option-label="label"
            option-value="value"
            :options="MUSICAL_KEYS"
            :error="!!errors.key"
            :error-message="errors.key"
            v-model="form.key"
          />
        </q-card-section>
        <q-card-actions align="between">
          <q-btn
            flat
            no-caps
            label="Detect again"
            :loading="saving === 'detect'"
            :disable="!!saving"
            @click="save(true)"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Save"
            class="flex-none!"
            :loading="saving === 'save'"
            :disable="!!saving || (!form.bpm && !form.key)"
            @click="save(false)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import { MUSICAL_KEYS, saveTagsRequest, type AudioTags, type TagTarget } from 'src/utils/requests/tags';

const props = defineProps<{
  tags?: AudioTags | null;
  /** Where corrections are saved; set it with editable */
  target?: TagTarget;
  editable?: boolean;
}>();

const emit = defineEmits<{ (e: 'update:tags', tags: AudioTags): void }>();

const open = ref(false);
const saving = ref<'save' | 'detect' | null>(null);
const form = reactive<{ bpm: number | null; key: string | null }>({ bpm: null, key: null });
const errors = reactive<{ bpm?: string; key?: string }>({});

const hasTags = computed(() => !!(props.tags?.bpm || props.tags?.key));
const sourceHint = computed(() =>
  props.tags?.source === 'manual' ? 'Set by the creator' : 'Detected from the audio',
);

watch(open, (shown) => {
  if (!shown) return;
  form.bpm = props.tags?.bpm ? Math.round(props.tags.bpm * 10) / 10 : null;
  form.key = props.tags?.key ?? null;
  errors.bpm = errors.key = undefined;
});

const save = async (detect: boolean) => {
  if (!props.target) return;
  saving.value = detect ? 'detect' : 'save';
  try {
    const res = await saveTagsRequest(
      props.target,
      detect ? { bpm: null, key: null } : { bpm: form.bpm || null, key: form.key || null },
    ).send();
    emit('update:tags', res.data);
    notify(res.message || 'Saved.', 'success');
    open.value = false;
  } catch (e) {
    const err = e as ResponseBody & { errors?: Record<string, string | string[]> };
    const first = (field: string) => {
      const value = err?.errors?.[field];
      return Array.isArray(value) ? value[0] : value;
    };
    errors.bpm = first('bpm');
    errors.key = first('key');
    if (!errors.bpm && !errors.key) notify(err?.message || "The tempo and key couldn't be saved.", 'error');
  } finally {
    saving.value = null;
  }
};
</script>

<style lang="scss" scoped>
.audio-tags {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.audio-tag {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  padding: 1px 8px;
  color: #e6e8eb;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  white-space: nowrap;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.35);
}

.audio-tag__camelot {
  color: #4fd1ff;
  font-weight: 700;
}

.audio-tag--edit {
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
  }
}
</style>
