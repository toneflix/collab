<template>
  <q-dialog v-model="show" @before-show="reset">
    <q-card class="w-full max-w-md bg-dark">
      <q-form @submit="save">
        <q-card-section class="flex items-center justify-between flex-nowrap">
          <div class="text-lg font-bold">{{ genre ? 'Edit genre' : 'Add genre' }}</div>
          <IconBtn icon="lucide-x" class="flex-none!" v-close-popup />
        </q-card-section>

        <q-card-section class="flex gap-4 pt-0 flex-nowrap max-xs:flex-col">
          <ImageCropper
            class="flex-none!"
            :aspect-ratio="1"
            :buttons="{ cancel: 'Cancel', crop: 'Use photo' }"
            @result="pick"
          >
            <template #default="{ open }">
              <button type="button" class="cover" @click="open">
                <GenreTile size="fill" :genre="{ slug: form.slug || form.title, title: form.title || 'Genre', imageUrl: coverUrl }" />
                <span class="cover__hint">
                  <q-icon name="lucide-camera" size="18px" />
                  {{ coverUrl ? 'Change cover' : 'Add cover' }}
                </span>
              </button>
            </template>
          </ImageCropper>
          <div class="flex flex-col justify-end gap-2 min-w-0 text-xs text-grey-5">
            <p>Square photo shown wherever the genre is listed.</p>
            <q-btn
              flat
              dense
              no-caps
              size="sm"
              color="grey-5"
              icon="lucide-trash-2"
              label="Remove cover"
              class="self-start flex-none!"
              @click="removeCover"
              v-if="coverUrl"
            />
            <div class="text-negative" v-if="errors.image">{{ errors.image }}</div>
          </div>
        </q-card-section>

        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-input
            dark
            filled
            dense
            counter
            maxlength="60"
            label="Name"
            :error="!!errors.title"
            :error-message="errors.title"
            :rules="[(v: string) => !!v?.trim() || 'The genre needs a name.']"
            v-model="form.title"
          />
          <q-input
            dark
            filled
            dense
            maxlength="60"
            label="Address name"
            :hint="genre ? `Used in links: ?genre=${form.slug}` : 'Made from the name when left empty'"
            :error="!!errors.slug"
            :error-message="errors.slug"
            v-model="form.slug"
          />
          <q-input
            dark
            filled
            dense
            autogrow
            counter
            maxlength="500"
            label="Description (optional)"
            :error="!!errors.description"
            :error-message="errors.description"
            v-model="form.description"
          />
        </q-card-section>

        <q-card-actions class="flex-nowrap">
          <q-btn
            flat
            no-caps
            color="negative"
            label="Remove"
            class="flex-none!"
            @click="emit('remove', genre)"
            v-if="genre"
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
            :label="genre ? 'Save' : 'Add genre'"
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
import { notify } from 'src/utils/helpers';
import type { Genre } from 'src/utils/models';
import { saveGenreRequest } from 'src/utils/requests/adminGenres';

type CropResult = { base64: string; blob: Blob; file: File };

const props = defineProps<{ genre?: Genre | null }>();
const emit = defineEmits<{ saved: [genre: Genre]; remove: [genre: Genre] }>();

const show = defineModel<boolean>({ default: false });
const saving = ref(false);
const errors = ref<Record<string, string>>({});
const form = reactive({ title: '', slug: '', description: '' });
const cover = reactive<{ file: File | null; preview: string | null; removed: boolean }>({ file: null, preview: null, removed: false });

const coverUrl = computed(() => cover.preview || (cover.removed ? null : props.genre?.imageUrl || null));

const reset = () => {
  form.title = props.genre?.title || '';
  form.slug = props.genre?.slug || '';
  form.description = props.genre?.description || '';
  Object.assign(cover, { file: null, preview: null, removed: false });
  errors.value = {};
};

const pick = (result: CropResult) => {
  const type = result.blob.type || 'image/png';

  cover.file = new File([result.blob], `cover.${type.split('/')[1] || 'png'}`, { type });
  cover.preview = result.base64;
  cover.removed = false;
};

const removeCover = () => {
  Object.assign(cover, { file: null, preview: null, removed: true });
};

const save = async () => {
  saving.value = true;
  errors.value = {};

  try {
    const { data, message } = await saveGenreRequest(
      {
        title: form.title.trim(),
        slug: form.slug.trim(),
        description: form.description,
        image: cover.file,
        removeImage: cover.removed && !!props.genre?.imageUrl,
      },
      props.genre?.id,
    ).send();

    notify(message, 'success');
    emit('saved', data);
    show.value = false;
  } catch (error) {
    const body = error as { message?: string; errors?: Record<string, string | string[]> };

    errors.value = Object.fromEntries(
      Object.entries(body.errors || {}).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
    ) as Record<string, string>;
    notify(body.message || 'The genre could not be saved.', 'error');
  } finally {
    saving.value = false;
  }
};
</script>

<style lang="scss" scoped>
.cover {
  position: relative;
  display: block;
  width: 148px;
  padding: 0;
  border: 0;
  border-radius: var(--tf-radius-lg);
  background: none;
  cursor: pointer;
}

.cover__hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #fff;
  border-radius: var(--tf-radius-lg);
  background: rgb(0 0 0 / 45%);
  opacity: 0;
  transition: opacity var(--tf-duration) var(--tf-ease);
}

.cover:hover .cover__hint,
.cover:focus-visible .cover__hint {
  opacity: 1;
}
</style>
