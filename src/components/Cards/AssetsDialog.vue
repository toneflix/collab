<template>
  <slot :toggle="() => (toggle = !toggle)">
    <q-btn icon="fas fa-folder" v-bind="$attrs" @click="toggle = !toggle">
      <span class="ml-2 text-base">{{ btnLabel }}</span>
    </q-btn>
  </slot>
  <q-dialog
    transition-show="rotate"
    transition-hide="rotate"
    v-model="toggle"
    @before-show="loadAssets"
  >
    <q-card flat>
      <q-toolbar>
        <q-toolbar-title class="flex gap-2">
          Assets
          <div>
            <q-btn
              padding="xs sm"
              icon="fas fa-cloud-upload"
              color="primary"
              :disable="readonly"
            />
            <q-popup-edit title="Upload Asset" v-model="form" v-slot="scope">
              <q-form
                class="gap-2 column"
                @submit="upload().then(scope.cancel)"
              >
                <q-input
                  dense
                  outlined
                  autofocus
                  type="text"
                  label="File Name"
                  class="custom-q-class no-fill"
                  input-class="custom-input-class"
                  :error="!!errors.name"
                  :error-message="errors.name"
                  v-model="(form.meta as Record<string, string>).name"
                />
                <q-input
                  dense
                  outlined
                  autofocus
                  type="text"
                  label="File Description"
                  class="custom-q-class no-fill"
                  input-class="custom-input-class"
                  :error="!!errors.description"
                  :error-message="errors.description"
                  v-model="form.description"
                />
                <q-file
                  dense
                  outlined
                  autofocus
                  label="File"
                  class="custom-q-class no-fill"
                  input-class="custom-input-class"
                  :accept="allowedAssetsExts.join(', ')"
                  :error="!!errors.file"
                  :error-message="errors.file"
                  v-model="form.file"
                >
                  <template v-slot:prepend>
                    <q-icon name="fas fa-cloud-upload" @click.stop.prevent />
                  </template>
                  <template v-slot:append>
                    <q-icon
                      name="close"
                      @click.stop.prevent="form.file = undefined"
                      class="cursor-pointer"
                    />
                  </template>
                </q-file>
                <div class="flex gap-2">
                  <q-btn
                    color="negative"
                    label="Cancel"
                    @click="scope.cancel"
                  />
                  <q-btn
                    type="submit"
                    color="positive"
                    label="Save"
                    :loading="uploading"
                  />
                </div>
              </q-form>
            </q-popup-edit>
          </div>
        </q-toolbar-title>
        <q-btn flat round dense icon="close" v-close-popup />
      </q-toolbar>
      <q-separator />
      <q-card-section class="scroll max-h-[50vh]">
        <q-item-label class="text-lg font-bold">Stem Files</q-item-label>
        <div class="grid grid-cols-4 gap-2 mt-2 mb-8">
          <IconCard
            dense
            no-animation
            color="primary"
            icon="fas fa-file-waveform"
            :title="String(stem.title || stem.name)"
            :key="i"
            :links="[
              {
                label: formatBytes(stem.size, 2, true),
                icon: 'fas fa-box-open',
                color: 'white',
              },
              {
                label: 'Download Asset',
                icon: 'fas fa-cloud-download',
                color: 'white',
                click: () => download(stem.src as string, stem.name, '.wav'),
              },
            ]"
            v-for="(stem, i) in stems"
          >
            <template #title>
              <div>
                <q-btn
                  flat
                  dense
                  size="xs"
                  icon="fas fa-edit"
                  color="white"
                  :disable="readonly"
                />
                <q-popup-edit
                  title="Rename"
                  v-model="stem.title"
                  v-slot="scope"
                >
                  <div class="gap-2 column">
                    <q-input
                      dense
                      outlined
                      autofocus
                      type="text"
                      class="custom-q-class no-fill"
                      input-class="custom-input-class"
                      v-model="scope.value"
                      @keyup.enter="scope.set(), updateStem(stem)"
                    />

                    <div class="flex gap-2">
                      <q-btn
                        color="negative"
                        label="Cancel"
                        @click="scope.cancel"
                      />
                      <q-btn
                        color="positive"
                        label="Save"
                        @click="scope.set(), updateStem(stem)"
                      />
                    </div>
                  </div>
                </q-popup-edit>
              </div>
            </template>
          </IconCard>
        </div>
        <q-item-label class="text-lg font-bold">Other Assets</q-item-label>
        <div class="grid grid-cols-4 gap-2 mt-2 min-h-10">
          <IconCard dense skeleton :key="i" v-for="i in loading ? 8 : 0" />
          <IconCard
            dense
            no-animation
            with-notifications
            :key="i"
            :icon="icon(asset.type)"
            :title="asset.name"
            :links="[
              {
                label: formatBytes(asset.size, 2, true),
                icon: 'fas fa-box-open',
                color: 'white',
              },
              {
                label: 'Download File',
                icon: 'fas fa-cloud-download',
                color: 'white',
                click: () => download(asset.src, asset.name),
              },
              {
                label: 'Delete File',
                icon: 'fas fa-trash',
                color: 'negative',
                target: `creator/projects/${track.projectId}/tracks/${track.id}/assets/${asset.id}`,
                action: 'delete',
                callback: () => assets.splice(i, 1),
              },
            ]"
            v-for="(asset, i) in assets"
          >
          </IconCard>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import {
  FileType,
  ProjectTrack,
  ResponseBody,
  UploadData,
} from 'src/utils/models';
import { PropType, computed, ref } from 'vue';
import IconCard from './IconCard.vue';
import { Stem } from 'src/utils/daw';
import { exportFile } from 'quasar';
import { axios, useRequest } from 'src/boot/alova';
import { formatBytes, notify } from 'src/utils/helpers';
import {
  loadProjectTrackAssetsRequest,
  saveProjectTrackAssetRequest,
} from 'src/utils/requests/requests';
import { useForm } from 'alova/client';
import { allowedAssetsExts } from 'src/utils/presets';

const emit = defineEmits<{
  stemUpdated: [value: UploadData];
}>();

const props = defineProps({
  track: {
    type: Object as PropType<ProjectTrack>,
    required: true,
  },
  stems: {
    type: Array as PropType<Stem[]>,
    required: true,
    default: () => [] as Stem[],
  },
  btnLabel: {
    type: String,
    default: 'Assets',
  },
  readonly: Boolean,
});

const toggle = ref(false);

const {
  loading,
  data: assets,
  send: loadAssets,
  update,
} = useRequest(
  () => loadProjectTrackAssetsRequest(props.track, { with: 'ext' }),
  {
    initialData: [],
    immediate: false,
  },
);

const updateStem = (stem: Stem) => {
  const form: UploadData = {
    id: stem.id,
    title: stem.title,
    meta: stem.meta as unknown as UploadData['meta'],
  };

  emit('stemUpdated', form);
};

const errors = computed(
  () => (error.value as unknown as ResponseBody)?.errors || {},
);

const {
  form,
  error,
  reset,
  send: upload,
  loading: uploading,
  onSuccess,
} = useForm((f) => saveProjectTrackAssetRequest(f, props.track), {
  initialForm: {
    file: undefined,
    meta: { name: '' },
    dscription: '',
  } as UploadData,
});

onSuccess(({ data }) => {
  reset();
  update({ data: assets.value.concat(data.data) });
});

const icon = (type: FileType) => {
  const set = {
    pdf: 'fas fa-file-pdf',
    lrc: 'svguse:/icons.svg#lrc-fill|0 0 512 512',
    zip: 'fas fa-file-zipper',
    txt: 'fas fa-file-lines',
    text: 'fas fa-file-lines',
    audio: 'fas fa-file-audio',
    image: 'fas fa-file-image',
  };

  return set[type] || 'fas fa-file-circle-question';
};

const download = (src: string, name: string, ext: string = '') => {
  const err = () => notify('Asset download failed.', 'error');
  axios
    .Get<Blob>(src, {
      responseType: 'blob',
      withXSRFToken: true,
    })
    .then((data) => {
      const status = exportFile(
        name.replaceAll(' ', '-').toLowerCase() + ext,
        data,
      );
      status !== true && err();
    })
    .catch(() => {
      err();
    });
};
</script>
