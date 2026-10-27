<template>
  <div class="q-col-gutter-md row">
    <div class="col-12 col-md-4">
      <AudioMiniPlayer v-model:track="track" v-if="track && type === 'track'">
        <template #image>
          <ImageCropper
            :aspect-ratio="1 / 1"
            :buttons="{ cancel: 'Cancel', crop: 'Accept' }"
            @result="uploadArtwork"
          >
            <template #default="{ open, dataURL }">
              <q-avatar
                square
                class="w-48 h-48 edit-photo-avatar bg-gradient-to-t from-slate-200 to-gray-300"
              >
                <q-img
                  fit="cover"
                  class="w-full h-full card-avatar"
                  :ratio="1 / 1"
                  :src="picked || dataURL || meta.imageUrl || placeholder"
                  :alt="meta.title"
                />

                <div class="absolute p-4 text-center">
                  <q-btn
                    dense
                    no-caps
                    rounded
                    padding="xs md"
                    unelevated
                    icon="lucide-camera"
                    label="Upload Image"
                    color="primary"
                    @click="open"
                  />
                  <slot name="avatar-center"></slot>
                </div>
                <slot name="avatar-bottom"></slot>
                <q-inner-loading
                  color="greysoft"
                  :showing="uploading.total > 0"
                />
              </q-avatar>
            </template>
          </ImageCropper>
        </template>
      </AudioMiniPlayer>
      <ImageCropper
        v-else
        :aspect-ratio="1 / 1"
        :buttons="{ cancel: 'Cancel', crop: 'Accept' }"
        @result="uploadArtwork"
      >
        <template #default="{ open, dataURL }">
          <q-avatar
            square
            class="w-48 h-48 edit-photo-avatar bg-gradient-to-t from-slate-200 to-gray-300"
          >
            <q-img
              fit="cover"
              class="w-full h-full card-avatar"
              :ratio="1 / 1"
              :src="picked || dataURL || meta.imageUrl || placeholder"
              :alt="meta.title"
            />

            <div class="p-4 text-center absolute-bottom">
              <q-btn
                dense
                no-caps
                rounded
                padding="xs md"
                unelevated
                icon="lucide-camera"
                label="Upload Image"
                color="primary"
                @click="open"
              />
              <slot name="avatar-center"></slot>
            </div>
            <slot name="avatar-bottom"></slot>
            <q-inner-loading color="greysoft" :showing="uploading.total > 0" />
          </q-avatar>
        </template>
      </ImageCropper>
      <AiArtworkButton
        outline
        color="toneflix"
        class="mt-3"
        :kind="type"
        :title="form.title"
        :artist="artistName"
        :genre="genreName"
        @pick="pickArtwork"
      />
    </div>
    <div class="text-white col-12 col-md-8">
      <div class="grid gap-y-2 md:grid-cols-2 md:gap-x-4">
        <div class="col-span-2">
          <label class="block mb-2 text-xl text-gray-400">
            {{ mapOptions[type] }} Title
            <span class="text-center text-red-500">*</span>
          </label>
          <q-input
            outlined
            required
            color="primary"
            class="custom-q-class no-fill"
            input-class="custom-input-class"
            placeholder="Name of your track"
            :error="!!errors.title || !!errors['release.title']"
            :error-message="errors.title || errors['release.title']"
            v-model="form.title"
            @update:model-value="(v) => (form.slug = (v as string)?.slug('-'))"
          />
        </div>
        <div class="col-span-2" v-if="form.slug">
          <label class="block mb-2 text-xl text-gray-400"> Link </label>
          <div
            class="flex items-center no-wrap"
            :class="`justify-${editingSlug ? 'start' : 'between'}`"
          >
            <span class="block">
              {{
                frontUrl +
                $router.resolve({
                  name: editingSlug ? 'artist' : 'artist.track',
                  params: {
                    track_id: !editingSlug ? form.slug.slug('-') : 'undefined',
                    artist_id:
                      meta.username || form.artist?.username || 'unknown',
                  },
                }).href
              }}{{ editingSlug ? '/' : '' }}
            </span>
            <span class="block ml-2" :class="{ 'flex-1!': editingSlug }">
              <q-btn
                dense
                outline
                color="primary"
                icon="lucide-pencil"
                @click="
                  () => {
                    editingSlug = !editingSlug;
                  }
                "
                v-if="!editingSlug"
              />
              <q-input
                v-else
                dense
                outlined
                required
                autofocus
                hide-bottom-space
                ref="slugInput"
                color="primary"
                :error="!!errors.slug || !!errors['release.slug']"
                :error-message="errors.slug || errors['release.slug']"
                v-model="form.slug"
                @update:model-value="(v) => (form.slug = v as string)"
                @blur="editingSlug = false"
              />
            </span>
          </div>
          <p
            class="text-sm text-negative"
            v-if="errors.slug || !!errors['release.slug']"
          >
            {{ errors.slug || errors['release.slug'] }}
          </p>
        </div>
        <div class="col-span-2">
          <label class="block mb-2 text-xl text-gray-400">
            Genre
            <span class="text-center text-red-500">*</span>
          </label>
          <q-select
            outlined
            required
            emit-value
            map-options
            color="primary"
            class="custom-q-class no-fill"
            label="Genre of your track"
            input-class="custom-input-class"
            option-value="id"
            option-label="title"
            :error="!!errors.genre_id || !!errors['release.genre_id']"
            :error-message="errors.genre_id || errors['release.genre_id']"
            :options="genres"
            v-model="form.genre_id"
          />
        </div>
        <div class="col-span-2">
          <label class="block mb-2 text-xl text-gray-400"> Artist </label>
          <UserSearchInput
            outlined
            required
            allow-create
            color="primary"
            class="custom-q-class no-fill"
            input-class="custom-input-class"
            :error="
              !!errors.artist_id ||
              !!errors['release.artist_id'] ||
              !!errors[`tracks.${index}.artist_id`]
            "
            :error-message="
              errors.artist_id ||
              errors['release.artist_id'] ||
              errors[`tracks.${index}.artist_id`]
            "
            :params="{ user_id: user.id }"
            v-model="artist"
            @selected="
              (e) => {
                form.artist = e;
                form.artist_id = e.id;
                clearError('artist_id');
              }
            "
          />
        </div>
        <div
          class="col-span-2"
          v-if="type === 'track' && (form as Track & UploadData).project_track_id"
        >
          <label class="block mb-2 text-xl text-gray-400"> Stems Price </label>
          <q-input
            outlined
            type="number"
            min="0"
            color="primary"
            class="custom-q-class no-fill"
            input-class="custom-input-class"
            hint="Let fans buy this track's stems from your project. Leave at 0 to keep them private."
            :prefix="symbol"
            :error="!!errors[`tracks.${index}.stems_price`] || !!errors.stems_price"
            :error-message="errors[`tracks.${index}.stems_price`] || errors.stems_price"
            v-model.number="form.stems_price"
          />
        </div>
        <div class="col-span-2" v-if="showVersion">
          <label class="block mb-2 text-xl text-gray-400"> Version </label>
          <q-input
            outlined
            clearable
            maxlength="60"
            color="primary"
            class="custom-q-class no-fill"
            input-class="custom-input-class"
            placeholder="e.g. Radio Edit, Acoustic or Deluxe"
            hint="Optional. Tells this release apart from the project's other versions."
            :error="!!errors.version"
            :error-message="errors.version"
            v-model="(form as Release).version"
          />
        </div>
        <div class="col-span-2">
          <label class="block mb-2 text-xl text-gray-400"> Description </label>
          <q-input
            outlined
            type="textarea"
            color="primary"
            class="custom-q-class no-fill"
            input-class="custom-input-class"
            placeholder="Describe your track"
            :error="!!errors.description || !!errors['release.description']"
            :error-message="errors.description || errors['release.description']"
            v-model="form.description"
          />
        </div>
        <div class="col-span-2" v-if="!hidePrivacyOptions">
          <label class="block mb-2 text-xl text-gray-400">
            Track Privacy
          </label>
          <q-option-group
            :options="privacyOptions"
            type="radio"
            v-model="form.privacy"
          />
          <p
            class="text-sm text-negative"
            v-if="errors.privacy || !!errors['release.privacy']"
          >
            {{ errors.privacy || errors['release.privacy'] }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import UserSearchInput from '../Utilities/UserSearchInput.vue';
import ImageCropper from 'src/components/Utilities/ImageCropper.vue';
import AiArtworkButton from 'src/components/Artwork/AiArtworkButton.vue';
import type { ArtworkPick } from 'src/components/Artwork/AiArtworkDialog.vue';
import placeholder from 'src/assets/placeholder.svg';
import { frontUrl } from 'src/utils/env';
import { privacyOptions } from 'src/utils/presets';
import {
  BaseOption,
  ContentMeta,
  Release,
  Track,
  UploadData,
  User,
} from 'src/utils/models';
import { computed, ref, PropType, watch } from 'vue';
import { useGenres } from 'src/composables/useGenres';
import { usePayments } from 'src/composables/usePayments';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import AudioMiniPlayer from '../Controllers/AudioMiniPlayer.vue';

const { genres } = useGenres();
const emit = defineEmits(['error', 'error-cleared']);
const props = defineProps({
  hidePrivacyOptions: Boolean,
  showPlayer: Boolean,
  /** Shows the version label field, for releases of a project. */
  showVersion: Boolean,
  type: {
    type: String as PropType<'release' | 'track'>,
    default: 'release',
  },
  index: {
    type: Number,
    default: 0,
  },
});

const user = computed(() => useBootstrapStore().user || {});

const mapOptions: Record<string, string> = {
  release: 'Release',
  track: 'Track',
};

const track = computed<Track>({
  get: () => form.value as unknown as Track,
  set: (v) => (form.value = v),
});

const { symbol } = usePayments();

const form = defineModel<(Release | Track) & UploadData>('form', {
  required: true,
});

const meta = defineModel<ContentMeta>('meta', {
  required: true,
});

const errors = defineModel<Record<string, string>>('errors', {
  required: false,
  default: () => ({}),
});

const artist = ref<User & BaseOption>(form.value.artist as User & BaseOption);
const uploading = { total: 0 };
const slugInput = ref();
const editingSlug = ref(false);

/** An image drawn with AI, shown until another one is uploaded */
const picked = ref('');

const artistName = computed(
  () => artist.value?.name || artist.value?.label || null,
);
const genreName = computed(
  () => genres.value.find((g) => g.id == form.value.genre_id)?.title ?? null,
);

const uploadArtwork = ({ file }: { file: File }) => {
  picked.value = '';
  if (props.type === 'release') {
    form.value.artwork = file;
  } else {
    form.value.image = file;
  }
};

const pickArtwork = ({ file, url }: ArtworkPick) => {
  uploadArtwork({ file });
  picked.value = url;
};

const clearError = (error: string) => {
  delete errors.value[error];
  delete errors.value[`release.${error}`];
  delete errors.value[`tracks.${props.index}.${error}`];
  emit('error-cleared', error);
};

watch(errors, () => emit('error', errors.value));
</script>
