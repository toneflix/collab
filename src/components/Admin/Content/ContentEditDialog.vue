<template>
  <q-dialog v-model="show" @before-show="reset">
    <q-card class="w-full max-w-xl bg-dark">
      <q-form @submit="save">
        <q-card-section class="flex items-center justify-between flex-nowrap">
          <div class="min-w-0">
            <div class="text-lg font-bold truncate">{{ item ? `Edit ${section.noun}` : `Add ${section.noun}` }}</div>
            <div class="text-xs truncate text-grey-5" v-if="item?.owner">Owned by {{ item.owner.name }}</div>
          </div>
          <IconBtn icon="lucide-x" class="flex-none!" v-close-popup />
        </q-card-section>

        <q-card-section class="flex flex-wrap gap-4 pt-0" v-if="imageFields.length">
          <ImageCropper
            class="flex-none!"
            :key="field.key"
            :aspect-ratio="field.aspect || 1"
            :buttons="{ cancel: 'Cancel', crop: 'Use photo' }"
            @result="(result: CropResult) => pick(field.key, result)"
            v-for="field in imageFields"
          >
            <template #default="{ open }">
              <button
                type="button"
                class="picture"
                :class="{ 'picture--wide': (field.aspect || 1) > 1 }"
                :style="{ backgroundImage: previews[field.key] ? `url(${previews[field.key]})` : undefined }"
                @click="open"
              >
                <q-icon name="lucide-image-plus" size="20px" v-if="!previews[field.key]" />
                <span class="picture__label">{{ field.label }}</span>
              </button>
            </template>
          </ImageCropper>
          <div class="self-end text-xs text-negative" v-if="imageError">{{ imageError }}</div>
        </q-card-section>

        <q-card-section class="grid gap-3 pt-0 sm:grid-cols-2">
          <template :key="field.key" v-for="field in formFields">
            <ContentPicker
              :source="pickerSource(field)"
              :initial="pickerInitial(field)"
              :label="label(field)"
              :hint="field.hint"
              :clearable="!isRequired(field)"
              :error="!!errors[field.key]"
              :error-message="errors[field.key]"
              v-model="form[field.key]"
              v-if="field.kind === 'owner' || field.kind === 'artist' || field.kind === 'release'"
            />
            <q-select
              dark
              filled
              dense
              emit-value
              map-options
              option-value="id"
              option-label="title"
              :label="label(field)"
              :options="genres"
              :error="!!errors[field.key]"
              :error-message="errors[field.key]"
              v-model="form[field.key]"
              v-else-if="field.kind === 'genre'"
            >
              <template #option="{ itemProps, opt }">
                <q-item v-bind="itemProps">
                  <q-item-section avatar>
                    <GenreTile size="sm" class="genre-option" :genre="opt" />
                  </q-item-section>
                  <q-item-section>{{ opt.title }}</q-item-section>
                </q-item>
              </template>
            </q-select>
            <q-select
              dark
              filled
              dense
              emit-value
              map-options
              :label="label(field)"
              :hint="field.hint"
              :options="field.options"
              :error="!!errors[field.key]"
              :error-message="errors[field.key]"
              v-model="form[field.key]"
              v-else-if="field.kind === 'select'"
            />
            <q-file
              dark
              filled
              dense
              clearable
              accept="audio/*"
              :label="audioLabel(field)"
              :error="!!errors[field.key]"
              :error-message="errors[field.key]"
              v-model="files[field.key]"
              v-else-if="field.kind === 'audio'"
            >
              <template #prepend><q-icon name="lucide-audio-lines" /></template>
            </q-file>
            <q-toggle
              dark
              color="toneflix"
              class="self-center"
              :label="field.hint ? `${field.label} · ${field.hint}` : field.label"
              v-model="flags[field.key]"
              v-else-if="field.kind === 'toggle'"
            />
            <q-input
              dark
              filled
              dense
              autogrow
              :counter="!!field.max"
              :maxlength="field.max"
              :label="label(field)"
              :hint="field.hint"
              class="sm:col-span-2"
              :input-class="field.kind === 'lyrics' ? 'min-h-48' : 'min-h-16'"
              :error="!!errors[field.key]"
              :error-message="errors[field.key]"
              v-model="form[field.key]"
              v-else-if="field.kind === 'textarea' || field.kind === 'lyrics'"
            />
            <q-input
              dark
              filled
              dense
              :type="field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text'"
              :step="field.kind === 'number' ? 'any' : undefined"
              :min="field.kind === 'number' ? 0 : undefined"
              :maxlength="field.max"
              :label="label(field)"
              :hint="field.hint"
              :stack-label="field.kind === 'date'"
              :rules="isRequired(field) ? [(v: string) => !!String(v ?? '').trim() || `Add the ${field.label.toLowerCase()}.`] : []"
              :error="!!errors[field.key]"
              :error-message="errors[field.key]"
              v-model="form[field.key]"
              v-else
            />
          </template>
        </q-card-section>

        <q-card-actions class="flex-nowrap">
          <q-btn
            flat
            no-caps
            color="negative"
            label="Delete"
            class="flex-none!"
            @click="item && emit('remove', item)"
            v-if="item"
          />
          <q-btn
            flat
            no-caps
            color="grey-4"
            icon="lucide-sparkles"
            label="Ask AI moderator"
            class="flex-none!"
            :loading="asking"
            @click="askModerator"
            v-if="item?.fields.originPending"
          />
          <q-space />
          <q-btn flat no-caps label="Cancel" class="flex-none!" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            type="submit"
            color="toneflix"
            class="flex-none!"
            :label="item ? 'Save' : `Add ${section.noun}`"
            :loading="saving"
          />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import ImageCropper from 'src/components/Utilities/ImageCropper.vue';
import GenreTile from 'src/components/Cards/GenreTile.vue';
import ContentPicker from './ContentPicker.vue';
import { useGenres } from 'src/composables/useGenres';
import { notify } from 'src/utils/helpers';
import { sendTrackToAiRequest } from 'src/utils/requests/moderation';
import { contentSection, type ContentField } from 'src/utils/admin-content';
import {
  saveAdminContentRequest,
  type AdminContent,
  type ContentForm,
  type ContentKind,
} from 'src/utils/requests/adminContent';

type CropResult = { base64: string; blob: Blob; file: File };
type Value = string | number | null;

const props = defineProps<{ type: ContentKind; item?: AdminContent | null }>();
const emit = defineEmits<{ saved: [item: AdminContent]; remove: [item: AdminContent] }>();

const show = defineModel<boolean>({ default: false });
const { genres } = useGenres();

const saving = ref(false);
const asking = ref(false);
const errors = ref<Record<string, string>>({});
const form = reactive<Record<string, Value>>({});
const flags = reactive<Record<string, boolean>>({});
const files = reactive<Record<string, File | null>>({});
const previews = reactive<Record<string, string | null>>({});

const section = computed(() => contentSection(props.type));
const fields = computed(() => section.value.fields.filter((field) => !(props.item && field.createOnly)));
const imageFields = computed(() => fields.value.filter((field) => field.kind === 'image'));
const formFields = computed(() => fields.value.filter((field) => field.kind !== 'image'));
const imageError = computed(() => imageFields.value.map((field) => errors.value[field.key]).find(Boolean));

const isRequired = (field: ContentField) => field.required || (!props.item && field.requiredOnCreate);

/** Fields that always hold a value need no "optional" */
const label = (field: ContentField) =>
  isRequired(field) || field.kind === 'select' || field.kind === 'genre' ? field.label : `${field.label} (optional)`;

const audioLabel = (field: ContentField) => {
  if (!props.item) return field.label;

  return props.item.fields.hasAudio ? 'Replace audio (optional)' : 'Audio (optional)';
};

const reset = () => {
  const values = props.item?.fields ?? {};

  Object.keys(form).forEach((key) => delete form[key]);
  fields.value.forEach((field) => {
    const value = values[field.from] as Value | boolean | undefined;

    if (field.kind === 'toggle') flags[field.key] = !!value;
    else form[field.key] = (value as Value | undefined) ?? (field.kind === 'select' ? (field.options?.[0]?.value ?? null) : null);
    files[field.key] = null;
    previews[field.key] = field.kind === 'image' ? ((value as string | null) ?? null) : null;
  });

  if (!props.item && 'genre_id' in form) form.genre_id = genres.value[0]?.id ?? null;
  errors.value = {};
};

const pickerSource = (field: ContentField) => field.kind as 'owner' | 'artist' | 'release';

const pickerInitial = (field: ContentField) => {
  const item = props.item;
  if (!item) return null;

  if (field.kind === 'owner') {
    return item.owner ? { id: item.owner.id, label: item.owner.name, caption: item.owner.username ? `@${item.owner.username}` : null } : null;
  }

  const id = item.fields[field.from] as number | null;
  const name = item.fields[field.kind === 'artist' ? 'artistName' : 'releaseTitle'] as string | null;

  return id ? { id, label: name || `#${id}` } : null;
};

const pick = (key: string, result: CropResult) => {
  const type = result.blob.type || 'image/png';

  files[key] = new File([result.blob], `${key}.${type.split('/')[1] || 'png'}`, { type });
  previews[key] = result.base64;
};

const body = (): ContentForm => {
  const values: ContentForm = {};

  fields.value.forEach((field) => {
    if (field.kind === 'image' || field.kind === 'audio') {
      if (files[field.key]) values[field.key] = files[field.key];

      return;
    }

    values[field.key] = field.kind === 'toggle' ? flags[field.key] : form[field.key];
  });

  return values;
};

/** Sends an unranked upload to the AI moderator to judge its rank. */
const askModerator = async () => {
  if (!props.item) return;

  asking.value = true;

  try {
    const { message } = await sendTrackToAiRequest(props.item.id).send();

    notify(message, 'success');
    show.value = false;
  } catch (error) {
    notify((error as { message?: string }).message || 'It could not be sent.', 'error');
  } finally {
    asking.value = false;
  }
};

const save = async () => {
  saving.value = true;
  errors.value = {};

  try {
    const { data, message } = await saveAdminContentRequest(props.type, body(), props.item?.id).send();

    notify(message, 'success');
    emit('saved', data);
    show.value = false;
  } catch (error) {
    const response = error as { message?: string; errors?: Record<string, string | string[]> };

    errors.value = Object.fromEntries(
      Object.entries(response.errors || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    ) as Record<string, string>;
    notify(response.message || 'It could not be saved.', 'error');
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
.picture {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 112px;
  aspect-ratio: 1;
  padding: 0;
  color: var(--tf-text-subtle);
  border: 1px dashed var(--tf-border-strong);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-2) center / cover no-repeat;
  cursor: pointer;
}

.picture--wide {
  width: 224px;
  aspect-ratio: 2;
}

.picture__label {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 1px 8px;
  font-size: 0.6875rem;
  color: #fff;
  border-radius: var(--tf-radius-full);
  background: rgb(0 0 0 / 60%);
}

.genre-option {
  width: 40px !important;
  height: 28px !important;
  border-radius: var(--tf-radius-sm);

  :deep(.genre-tile__title) {
    display: none;
  }
}
</style>
