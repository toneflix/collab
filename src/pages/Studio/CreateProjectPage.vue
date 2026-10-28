<template>
  <q-page padding>
    <div class="max-w-full mx-auto md:max-w-2xl lg:max-w-3xl">
      <q-form @submit="send">
        <div class="q-col-gutter-md row">
          <div class="col-12 col-md-4">
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
                    :src="picked || dataURL || form.imageUrl || placeholder"
                    :alt="form.title"
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
                  </div>
                </q-avatar>
              </template>
            </ImageCropper>
            <AiArtworkButton
              outline
              color="toneflix"
              class="mt-3"
              kind="project"
              :title="form.title"
              @pick="pickArtwork"
            />
          </div>
          <div class="text-white col-12 col-md-8">
            <div class="grid gap-y-4 md:grid-cols-2 md:gap-x-4">
              <div class="col-span-2">
                <label class="block mb-2 text-xl text-gray-400">
                  Project Title
                  <span class="text-center text-red-500">*</span>
                </label>
                <q-input
                  outlined
                  required
                  color="primary"
                  class="custom-q-class no-fill"
                  input-class="custom-input-class"
                  placeholder="Title of your project"
                  v-model="form.title"
                  :error="!!errors.title"
                  :error-message="errors.title"
                />
              </div>

              <div class="col-span-2">
                <label class="block mb-2 text-xl text-gray-400">
                  Description
                </label>
                <q-input
                  outlined
                  type="textarea"
                  color="primary"
                  class="custom-q-class no-fill"
                  input-class="custom-input-class"
                  placeholder="Describe your track"
                  v-model="form.description"
                  :error="!!errors.description"
                  :error-message="errors.description"
                />
              </div>

              <div class="col-span-2">
                <label class="block mb-2 text-xl text-gray-400">
                  Project Privacy
                </label>
                <q-option-group
                  type="radio"
                  v-model="form.privacy"
                  :options="privacyOptionsExtended"
                  :error="!!errors.privacy"
                  :error-message="errors.privacy"
                />
                <p class="mt-2 text-sm text-fg-muted" v-if="projectPrivacyHints[form.privacy]">
                  {{ projectPrivacyHints[form.privacy] }}
                </p>
              </div>

              <div class="col-span-2" v-if="form.privacy !== 'private'">
                <q-toggle
                  color="primary"
                  label="Make every track public"
                  v-model="form.tracksPublic"
                />
                <p class="m-0 text-sm text-fg-muted">
                  When this is off, visitors only see the tracks you set to public in each track's info.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          class="justify-end gap-2 mt-8 text-center md:flex md:items-center md:col-span-2"
        >
          <q-btn
            no-caps
            outline
            color="primary"
            class="mb-12 text-xl rounded-lg md:mb-0!"
            label="Cancel"
          />
          <q-btn
            no-caps
            type="submit"
            color="primary"
            class="mb-12 text-xl rounded-lg md:mb-0!"
            label="Save"
            :loading="saving"
          />
        </div>
      </q-form>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import ImageCropper from 'src/components/Utilities/ImageCropper.vue';
import AiArtworkButton from 'src/components/Artwork/AiArtworkButton.vue';
import type { ArtworkPick } from 'src/components/Artwork/AiArtworkDialog.vue';
import placeholder from 'src/assets/placeholder.svg';
import { privacyOptionsExtended, projectPrivacyHints } from 'src/utils/presets';
import { Project, ResponseBody, UploadData } from 'src/utils/models';
import { computed, ref } from 'vue';
import { useForm } from 'alova/client';
import {
  createProjectRequest,
  loadProjectRequest,
} from 'src/utils/requests/requests';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { useRoute, useRouter } from 'vue-router';
import { useWatcher } from 'alova/client';

defineOptions({
  async preFetch({ currentRoute, store }) {
    const boot = useBootstrapStore(store);
    const id = String(currentRoute.params.project_id);
    if (currentRoute.params.release_id) {
      await loadProjectRequest(id, { with: 'tracks,collabers' })
        .send()
        .then((data) => {
          boot.pageData.current = data;
        });
    }
  },
});

const route = useRoute();
const router = useRouter();
const current = useBootstrapStore().pageData.current as Project;
const errors = computed(
  () => (error.value as unknown as ResponseBody<string>)?.errors || {},
);

/**
 * Load the current project
 */
const { onSuccess: projectLoaded } = useWatcher(
  () =>
    loadProjectRequest(route.params.project_id as string, {
      with: 'tracks,collabers',
    }),
  [() => route.params.project_id],
  {
    middleware: (_, next) => (route.params.project_id ? next() : undefined),
    immediate: true,
    initialData: current || {},
  },
);

projectLoaded(({ data }) => {
  form.value = data || ({} as Project);
});

/**
 * Save the project
 */
const {
  form,
  send,
  error,
  loading: saving,
  // onError,
  onSuccess,
} = useForm(createProjectRequest, {
  store: false,
  initialForm: {
    ...current,
    image: null,
    privacy: 'private',
    tracksPublic: false,
  } as unknown as Project & UploadData,
});

onSuccess(({ data }) => {
  router.replace({
    name: 'studio.project',
    params: { project_id: data.data?.slug },
  });
});

/** An image drawn with AI, shown until another one is uploaded */
const picked = ref('');

const uploadArtwork = ({ file }: { file: File }) => {
  picked.value = '';
  form.value.image = file;
};

const pickArtwork = ({ file, url }: ArtworkPick) => {
  picked.value = url;
  form.value.image = file;
};
</script>
