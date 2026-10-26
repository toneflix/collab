<template>
  <q-dialog v-model="open" @show="reset">
    <q-card dark class="publish-dialog !flex-none" style="width: 480px; max-width: 100vw">
      <header class="flex items-start gap-2 p-4 pb-2 no-wrap">
        <div class="min-w-0">
          <div class="text-lg font-bold">Artwork and sharing</div>
        </div>
        <IconBtn icon="lucide-x" class="!flex-none ml-auto" aria-label="Close" v-close-popup />
      </header>

      <div class="flex flex-col gap-4 px-5 pb-4">
        <div class="flex items-center gap-4 no-wrap">
          <ImageCropper :aspect-ratio="1" :buttons="{ cancel: 'Cancel', crop: 'Use this' }" @result="upload">
            <template #default="{ open: pick }">
              <button type="button" class="artwork !flex-none" aria-label="Change the artwork" @click="pick">
                <img :src="song.imageUrl" alt="" class="artwork__img" />
                <q-inner-loading dark :showing="uploading" />
              </button>
            </template>
          </ImageCropper>
          <div class="flex flex-col gap-2 min-w-0">
            <div class="text-sm font-semibold">Artwork</div>
            <div class="text-xs text-grey-5">A square image, PNG, JPG or WebP up to 5 MB.</div>
            <div class="flex flex-wrap gap-2">
              <ImageCropper :aspect-ratio="1" :buttons="{ cancel: 'Cancel', crop: 'Use this' }" @result="upload">
                <template #default="{ open: pick }">
                  <q-btn
                    outline
                    rounded
                    no-caps
                    dense
                    class="px-3 !flex-none"
                    icon="lucide-image-up"
                    :label="song.hasArtwork ? 'Replace' : 'Upload'"
                    :disable="uploading"
                    @click="pick"
                  />
                </template>
              </ImageCropper>
              <AiArtworkButton
                outline
                class="px-3 !flex-none"
                kind="song"
                label="AI"
                :title="song.title"
                :genre="song.settings.mood"
                :disable="uploading"
                @pick="upload"
              />
              <q-btn
                flat
                rounded
                no-caps
                dense
                class="px-3 !flex-none"
                label="Remove"
                :disable="uploading"
                @click="removeArtwork"
                v-if="song.hasArtwork"
              />
            </div>
          </div>
        </div>

        <q-separator dark />

        <div class="option">
          <q-toggle dark color="toneflix" class="!flex-none" v-model="form.published" />
          <div class="min-w-0">
            <div class="text-sm font-semibold">Publish this composition</div>
            <div class="text-xs text-grey-5">Your notes stay private.</div>
          </div>
        </div>
        <div class="option" :class="{ 'option--off': !form.published }">
          <q-toggle dark color="toneflix" class="!flex-none" :disable="!form.published" v-model="form.allowForks" />
          <div class="min-w-0">
            <div class="text-sm font-semibold">Let others fork it</div>
            <div class="text-xs text-grey-5">Others get their own copy to edit.</div>
          </div>
        </div>
        <div class="option" :class="{ 'option--off': !form.published }">
          <q-toggle dark color="toneflix" class="!flex-none" :disable="!form.published" v-model="form.allowProjects" />
          <div class="min-w-0">
            <div class="text-sm font-semibold">Let others start a project with it</div>
            <div class="text-xs text-grey-5">Others can use the lyrics in a project.</div>
          </div>
        </div>

        <div class="link-row" v-if="song.publishedAt && song.slug">
          <q-icon name="lucide-globe" size="16px" class="!flex-none text-toneflix" />
          <router-link class="truncate" :to="{ name: 'composition', params: { slug: song.slug } }">{{ link }}</router-link>
          <IconBtn size="sm" icon="lucide-copy" class="!flex-none ml-auto" aria-label="Copy the link" @click="copy" />
        </div>

        <div class="text-xs text-negative" v-if="error">{{ error }}</div>

        <div class="flex justify-end gap-2 no-wrap">
          <q-btn flat rounded no-caps class="!flex-none" label="Cancel" v-close-popup />
          <q-btn
            unelevated
            rounded
            no-caps
            color="toneflix"
            text-color="dark"
            class="!flex-none"
            :label="form.published && !song.publishedAt ? 'Publish' : 'Save'"
            :loading="saving"
            :disable="!changed"
            @click="save"
          />
        </div>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { copyToClipboard } from 'quasar';
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AiArtworkButton from 'src/components/Artwork/AiArtworkButton.vue';
import ImageCropper from 'src/components/Utilities/ImageCropper.vue';
import { notifyError } from 'src/utils/composer';
import { notify } from 'src/utils/helpers';
import {
  removeSongArtworkRequest,
  saveSongPublishingRequest,
  uploadSongArtworkRequest,
  type Song,
} from 'src/utils/requests/composer';

const props = defineProps<{
  song: Song;
  /** Saves anything waiting first, so the published lyrics are the newest */
  flush: () => Promise<void>;
}>();

const emit = defineEmits<{ updated: [song: Song] }>();

const open = defineModel<boolean>({ default: false });

const router = useRouter();

const form = reactive({ published: false, allowForks: false, allowProjects: false });
const saving = ref(false);
const uploading = ref(false);
const error = ref('');

const changed = computed(
  () =>
    form.published !== !!props.song.publishedAt ||
    form.allowForks !== props.song.allowForks ||
    form.allowProjects !== props.song.allowProjects,
);

const link = computed(() => {
  if (!props.song.slug) return '';
  const path = router.resolve({ name: 'composition', params: { slug: props.song.slug } }).href;
  return typeof window === 'undefined' ? path : `${window.location.origin}${path}`;
});

const reset = () => {
  form.published = !!props.song.publishedAt;
  form.allowForks = props.song.allowForks;
  form.allowProjects = props.song.allowProjects;
  error.value = '';
};

const save = async () => {
  saving.value = true;
  error.value = '';
  try {
    await props.flush();
    const res = await saveSongPublishingRequest(props.song.id, {
      published: form.published,
      allow_forks: form.allowForks,
      allow_projects: form.allowProjects,
    }).send();
    notify(res.message, 'success');
    emit('updated', res.data);
  } catch (e) {
    const err = e as { errors?: Record<string, string | string[]> };
    const first = Object.values(err.errors ?? {})[0];
    if (first) error.value = Array.isArray(first) ? (first[0] ?? '') : first;
    else notifyError(e, "The sharing settings couldn't be saved.");
  } finally {
    saving.value = false;
  }
};

const upload = async ({ file }: { file: File }) => {
  uploading.value = true;
  try {
    const res = await uploadSongArtworkRequest(props.song.id, file).send();
    emit('updated', res.data);
  } catch (e) {
    notifyError(e, "The artwork couldn't be uploaded.");
  } finally {
    uploading.value = false;
  }
};

const removeArtwork = async () => {
  uploading.value = true;
  try {
    const res = await removeSongArtworkRequest(props.song.id).send();
    emit('updated', res.data);
  } catch (e) {
    notifyError(e, "The artwork couldn't be removed.");
  } finally {
    uploading.value = false;
  }
};

const copy = () => {
  void copyToClipboard(link.value).then(() => notify('Link copied.', 'success'));
};
</script>

<style lang="scss" scoped>
.publish-dialog {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
}

.artwork {
  position: relative;
  width: 112px;
  height: 112px;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: #1f2229;
  cursor: pointer;

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.option {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-start;
  gap: 10px;

  &--off {
    opacity: 0.55;
  }
}

.link-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 13px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
}
</style>
