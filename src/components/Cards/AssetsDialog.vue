<template>
  <slot :toggle="() => (toggle = !toggle)">
    <q-btn icon="lucide-folder" v-bind="$attrs" @click="toggle = !toggle">
      <span class="ml-2 text-base">{{ btnLabel }}</span>
    </q-btn>
  </slot>
  <ResponsiveDialog
    title="Assets"
    transition-show="rotate"
    transition-hide="rotate"
    body-class="scroll max-h-[50vh]"
    v-model="toggle"
    @before-show="loadAssets"
  >
    <template #title>
      Assets
      <div>
        <q-btn
          padding="xs sm"
          icon="lucide-cloud-upload"
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
              :accept="acceptFor(assetsExts())"
              :error="!!errors.file"
              :error-message="errors.file"
              v-model="form.file"
            >
              <template v-slot:prepend>
                <q-icon name="lucide-cloud-upload" @click.stop.prevent />
              </template>
              <template v-slot:append>
                <q-icon
                  name="lucide-x"
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
    </template>

    <template #default="{ sheet }">
      <!-- Phones: one row per file -->
      <template v-if="sheet">
        <q-item-label header class="px-0! text-base font-bold">Stem Files</q-item-label>
        <q-list>
          <q-item class="px-0" :key="i" v-for="(stem, i) in stems">
            <q-item-section avatar>
              <q-icon name="lucide-file-audio" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label lines="1">{{ stem.title || stem.name }}</q-item-label>
              <q-item-label caption>{{ formatBytes(stem.size, 2, true) }}</q-item-label>
            </q-item-section>
            <q-item-section side class="flex-row! flex-nowrap! items-center gap-1">
              <RenameButton :disable="readonly" v-model="stem.title" @saved="updateStem(stem)" />
              <TDropdown flat dense rounded icon="lucide-ellipsis-vertical" dropdown-icon="none" :links="stemLinks(stem)" />
            </q-item-section>
          </q-item>
        </q-list>

        <q-item-label header class="px-0! text-base font-bold">Other Assets</q-item-label>
        <q-list>
          <q-item class="px-0" :key="i" v-for="i in loading ? 4 : 0">
            <q-item-section avatar><q-skeleton type="QAvatar" size="24px" /></q-item-section>
            <q-item-section>
              <q-skeleton type="text" width="60%" />
              <q-skeleton type="text" width="30%" />
            </q-item-section>
          </q-item>
          <q-item class="px-0" :key="asset.id" v-for="(asset, i) in assets">
            <q-item-section avatar>
              <q-icon :name="icon(asset.type)" color="primary" />
            </q-item-section>
            <q-item-section>
              <q-item-label lines="1">{{ asset.name }}</q-item-label>
              <q-item-label caption>{{ formatBytes(asset.size, 2, true) }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <TDropdown
                flat
                dense
                rounded
                item-name="file"
                icon="lucide-ellipsis-vertical"
                dropdown-icon="none"
                :links="assetLinks(asset, Number(i))"
              />
            </q-item-section>
          </q-item>
          <SimpleInfo dense icon="lucide-image" text="No other assets yet." v-if="!loading && !assets.length" />
        </q-list>
      </template>

      <!-- Larger screens: cards -->
      <template v-else>
        <q-item-label class="text-lg font-bold">Stem Files</q-item-label>
        <div class="grid grid-cols-4 gap-2 mt-2 mb-8">
          <IconCard
            dense
            no-animation
            color="primary"
            icon="lucide-file-audio"
            :title="String(stem.title || stem.name)"
            :key="i"
            :links="stemLinks(stem)"
            v-for="(stem, i) in stems"
          >
            <template #title>
              <RenameButton color="white" :disable="readonly" v-model="stem.title" @saved="updateStem(stem)" />
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
            :links="assetLinks(asset, Number(i))"
            v-for="(asset, i) in assets"
          />
        </div>
      </template>
    </template>
  </ResponsiveDialog>
</template>

<script setup lang="ts">
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import {
  FileAsset,
  FileType,
  Link,
  ProjectTrack,
  ResponseBody,
  UploadData,
} from 'src/utils/models';
import { PropType, computed, ref } from 'vue';
import IconCard from './IconCard.vue';
import RenameButton from './RenameButton.vue';
import ResponsiveDialog from 'src/components/Controllers/ResponsiveDialog.vue';
import TDropdown from 'src/components/Utilities/TDropdown.vue';
import { Stem } from 'src/utils/daw';
import { exportFile } from 'quasar';
import { axios, useRequest } from 'src/boot/alova';
import { formatBytes, notify } from 'src/utils/helpers';
import {
  loadProjectTrackAssetsRequest,
  saveProjectTrackAssetRequest,
} from 'src/utils/requests/requests';
import { useForm } from 'alova/client';
import { acceptFor, assetsExts } from 'src/utils/presets';
import { isInstrumentStem } from 'src/utils/studio/instrument-notes';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { loadFaustEffectsRequest } from 'src/utils/requests/effects';

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

/** The menu on a stem: its size and a download. An instrument stem has no file; it is rendered here. */
const stemLinks = (stem: Stem): Link[] =>
  isInstrumentStem(stem)
    ? [
        {
          label: 'Download Asset',
          icon: 'lucide-cloud-download',
          color: 'white',
          click: () => void downloadInstrument(stem),
        },
      ]
    : [
        {
          label: formatBytes(stem.size, 2, true),
          icon: 'lucide-package-open',
          color: 'white',
        },
        {
          label: 'Download Asset',
          icon: 'lucide-cloud-download',
          color: 'white',
          click: () => download(stem.src as string, stem.name, '.wav'),
        },
      ];

/** Play an instrument stem's notes alone, with its effects, and save the audio as FLAC. */
const downloadInstrument = async (stem: Stem) => {
  notify('Rendering the instrument…', 'info');
  try {
    const { mixTrack } = await import('src/utils/studio/render-track');
    const faust = await loadFaustEffectsRequest()
      .send()
      .then((res) => res.data ?? [])
      .catch(() => []);
    const meta = { ...stem.meta, gain: 1, stereoPan: 0, muted: false, soloed: false, automation: undefined };
    const audio = await mixTrack(
      { bpm: 120, timeSignature: '4/4', mixVolume: 1, masterEffects: '', stems: [{ ...stem, meta }] },
      { plugins: !!useBootstrapStore().configuration.studio_plugins, faust },
    );
    if (!audio) {
      notify('That instrument has no notes to play.', 'info');
      return;
    }
    if (exportFile(stem.name.replaceAll(' ', '-').toLowerCase() + '.flac', audio) !== true) throw new Error('save');
  } catch {
    notify('Asset download failed.', 'error');
  }
};

/** The menu on another asset: its size, a download and delete */
const assetLinks = (asset: FileAsset, i: number): Link[] => [
  {
    label: formatBytes(asset.size, 2, true),
    icon: 'lucide-package-open',
    color: 'white',
  },
  {
    label: 'Download File',
    icon: 'lucide-cloud-download',
    color: 'white',
    click: () => download(asset.src, asset.name),
  },
  {
    label: 'Delete File',
    icon: 'lucide-trash-2',
    color: 'negative',
    target: `creator/projects/${props.track.projectId}/tracks/${props.track.id}/assets/${asset.id}`,
    action: 'delete',
    callback: () => assets.value.splice(i, 1),
  },
];

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
    pdf: 'lucide-file-text',
    lrc: 'svguse:/icons.svg#lrc-fill|0 0 512 512',
    zip: 'lucide-file-archive',
    txt: 'lucide-file-text',
    text: 'lucide-file-text',
    audio: 'lucide-file-music',
    image: 'lucide-file-image',
  };

  return set[type] || 'lucide-file-question-mark';
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
