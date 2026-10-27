<template>
  <q-dialog v-model="show" @before-show="reset">
    <q-card class="w-full max-w-lg bg-dark">
      <q-form @submit="save">
        <q-card-section class="flex items-center justify-between flex-nowrap">
          <div class="text-lg font-bold">Edit artist profile</div>
          <IconBtn icon="lucide-x" class="flex-none!" v-close-popup />
        </q-card-section>

        <q-card-section class="pt-0">
          <ImageCropper
            :aspect-ratio="2 / 1"
            :buttons="{ cancel: 'Cancel', crop: 'Use photo' }"
            @result="(e: CropResult) => pick('cover', e)"
          >
            <template #default="{ open }">
              <div class="cover" :style="{ backgroundImage: preview.cover ? `url(${preview.cover})` : undefined }">
                <q-btn
                  dense
                  no-caps
                  rounded
                  unelevated
                  size="sm"
                  padding="xs md"
                  color="dark-opaque"
                  icon="lucide-image"
                  class="absolute right-2 bottom-2"
                  :label="preview.cover ? 'Change cover' : 'Add cover photo'"
                  @click="open"
                />
                <AiArtworkButton
                  size="sm"
                  kind="artist_cover"
                  class="absolute right-2 top-2"
                  :artist="form.name"
                  @pick="(e: ArtworkPick) => pickAi('cover', e)"
                />
              </div>
            </template>
          </ImageCropper>

          <div class="flex items-end gap-3 -mt-10 flex-nowrap px-4">
            <ImageCropper
              class="flex-none!"
              :aspect-ratio="1 / 1"
              :buttons="{ cancel: 'Cancel', crop: 'Use photo' }"
              @result="(e: CropResult) => pick('image', e)"
            >
              <template #default="{ open }">
                <q-avatar size="96px" class="relative cursor-pointer avatar" @click="open">
                  <q-img :ratio="1" :src="preview.image || artist.imageUrl" />
                  <div class="absolute-full flex items-center justify-center avatar-overlay">
                    <q-icon name="lucide-camera" size="18px" />
                  </div>
                </q-avatar>
              </template>
            </ImageCropper>
            <div class="pb-1 text-xs text-grey-5">
              Square photo for the profile, and a wide cover photo for the top of the page.
            </div>
          </div>
          <AiArtworkButton
            outline
            size="sm"
            color="toneflix"
            class="mt-3 ml-4"
            kind="artist"
            label="Generate photo with AI"
            :artist="form.name"
            @pick="(e: ArtworkPick) => pickAi('image', e)"
          />
        </q-card-section>

        <q-card-section class="flex flex-col gap-3 pt-0">
          <q-input
            dark
            filled
            dense
            counter
            maxlength="100"
            label="Artist name"
            :error="!!errors.name"
            :error-message="errors.name"
            :rules="[(v: string) => !!v?.trim() || 'The artist needs a name.']"
            v-model="form.name"
          />
          <q-input
            dark
            filled
            dense
            autogrow
            counter
            type="textarea"
            maxlength="2000"
            label="About"
            input-class="min-h-24"
            :error="!!errors.about"
            :error-message="errors.about"
            v-model="form.about"
          />
          <q-toggle
            dark
            color="toneflix"
            label="Verified artist"
            v-model="form.verified"
            v-if="artist.canVerify"
          />
          <div class="text-xs text-negative" v-if="errors.image || errors.cover">{{ errors.image || errors.cover }}</div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancel" v-close-popup />
          <q-btn unelevated rounded no-caps type="submit" color="toneflix" label="Save" :loading="saving" />
        </q-card-actions>
      </q-form>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import ImageCropper from 'src/components/Utilities/ImageCropper.vue';
import AiArtworkButton from 'src/components/Artwork/AiArtworkButton.vue';
import type { ArtworkPick } from 'src/components/Artwork/AiArtworkDialog.vue';
import { notify } from 'src/utils/helpers';
import type { Artist } from 'src/utils/models';
import { updateArtistProfileRequest } from 'src/utils/requests/artists';

type CropResult = { base64: string; blob: Blob; file: File };

const props = defineProps<{ artist: Artist }>();
const emit = defineEmits<{ saved: [artist: Artist] }>();

const show = defineModel<boolean>({ default: false });
const saving = ref(false);
const errors = ref<Record<string, string>>({});
const files = reactive<{ image: File | null; cover: File | null }>({ image: null, cover: null });
const preview = reactive<{ image: string | null; cover: string | null }>({ image: null, cover: null });
const form = reactive({ name: '', about: '', verified: false });

const reset = () => {
  form.name = props.artist.name;
  form.about = props.artist.about || '';
  form.verified = props.artist.verified;
  files.image = files.cover = null;
  preview.image = null;
  preview.cover = props.artist.coverUrl || null;
  errors.value = {};
};

const pick = (field: 'image' | 'cover', result: CropResult) => {
  const type = result.blob.type || 'image/png';
  files[field] = new File([result.blob], `${field}.${type.split('/')[1] || 'png'}`, { type });
  preview[field] = result.base64;
};

const pickAi = (field: 'image' | 'cover', { file, url }: ArtworkPick) => {
  files[field] = file;
  preview[field] = url;
};

const save = async () => {
  saving.value = true;
  errors.value = {};

  try {
    const { data, message } = await updateArtistProfileRequest(props.artist.id, {
      name: form.name,
      about: form.about,
      image: files.image,
      cover: files.cover,
      verified: props.artist.canVerify ? form.verified : undefined,
    }).send();

    notify(message, 'success');
    emit('saved', data);
    show.value = false;
  } catch (error) {
    const body = error as { message?: string; errors?: Record<string, string> };
    errors.value = body.errors || {};
    notify(body.message || 'We could not save the profile.', 'error');
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.cover {
  position: relative;
  aspect-ratio: 2 / 1;
  max-height: 200px;
  width: 100%;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.02));
  background-size: cover;
  background-position: center;
}

.avatar {
  border: 3px solid var(--q-dark);
}

.avatar-overlay {
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  transition: opacity 0.15s;
}

.avatar:hover .avatar-overlay {
  opacity: 1;
}
</style>
