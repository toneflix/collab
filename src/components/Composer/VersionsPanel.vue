<template>
  <ComposerSheet title="Versions" caption="Saved copies of the lyrics" :dock="dock" v-model="open" @show="load(1)">
    <template #top>
      <form class="flex items-center gap-2 px-4 pt-3 no-wrap" @submit.prevent="nameVersion">
        <q-input dark filled dense class="min-w-0" maxlength="100" placeholder="Name this version" v-model="name" />
        <q-btn
          unelevated
          rounded
          no-caps
          type="submit"
          color="toneflix"
          text-color="dark"
          label="Save"
          class="!flex-none"
          :loading="naming"
          :disable="!name.trim()"
        />
      </form>
    </template>

    <q-inner-loading dark :showing="loading && !versions.length" />

    <div class="version" :key="v.id" v-for="v in versions">
      <div class="flex items-start gap-2 no-wrap">
        <div class="min-w-0">
          <div class="text-sm font-semibold truncate">{{ v.name || kindLabel(v.kind) }}</div>
          <div class="text-xs text-grey-5">{{ when(v.createdAt) }} · {{ lineCount(v.body) }} lines</div>
          <div class="mt-1 text-xs text-grey-6 version__preview">{{ preview(v.body) }}</div>
        </div>
        <q-btn
          flat
          dense
          rounded
          no-caps
          size="sm"
          label="Restore"
          class="!flex-none ml-auto"
          :loading="restoring === v.id"
          :disable="!!restoring"
          @click="confirmRestore(v)"
        />
      </div>
    </div>

    <div class="p-4 text-sm text-center text-grey-5" v-if="loaded && !versions.length">No versions yet.</div>
    <div class="p-3 text-center" v-if="page < lastPage">
      <q-btn flat rounded no-caps label="Show older versions" :loading="loading" @click="load(page + 1)" />
    </div>
  </ComposerSheet>
</template>

<script setup lang="ts">
import { date, useQuasar } from 'quasar';
import { ref } from 'vue';
import ComposerSheet from 'src/components/Composer/ComposerSheet.vue';
import { notify } from 'src/utils/helpers';
import { isSectionLine } from 'src/utils/composer';
import {
  loadSongVersionsRequest,
  nameSongVersionRequest,
  restoreSongVersionRequest,
  type Song,
  type SongVersion,
  type SongVersionKind,
} from 'src/utils/requests/composer';

const props = defineProps<{
  songId: number;
  dock?: string;
  /** Saves pending edits first, so a restore never drops typing */
  flush: () => Promise<void>;
}>();

const emit = defineEmits<{ restored: [song: Song] }>();

const $q = useQuasar();
const open = defineModel<boolean>({ default: false });

const versions = ref<SongVersion[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const loaded = ref(false);
const name = ref('');
const naming = ref(false);
const restoring = ref<number | null>(null);

const errorText = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

const kindLabel = (kind: SongVersionKind) =>
  ({ autosave: 'Autosaved', named: 'Named version', before_restore: 'Before a restore', before_ai: 'Before an AI insert' })[kind];

const when = (value: string) => date.formatDate(value, 'MMM D [at] h:mm A');
const sung = (body: string) => body.split('\n').filter((l) => l.trim() && !isSectionLine(l));
const lineCount = (body: string) => sung(body).length;
const preview = (body: string) => sung(body).slice(0, 2).join(' / ');

const load = async (to = 1) => {
  loading.value = true;
  try {
    const res = await loadSongVersionsRequest(props.songId, to).send();
    versions.value = to === 1 ? res.data : [...versions.value, ...res.data];
    page.value = res.meta.currentPage;
    lastPage.value = res.meta.lastPage;
  } catch (e) {
    notify(errorText(e, "The versions couldn't be loaded."), 'error');
  } finally {
    loading.value = false;
    loaded.value = true;
  }
};

const nameVersion = async () => {
  naming.value = true;
  try {
    await props.flush();
    await nameSongVersionRequest(props.songId, name.value.trim()).send();
    name.value = '';
    await load(1);
  } catch (e) {
    notify(errorText(e, "The version couldn't be saved."), 'error');
  } finally {
    naming.value = false;
  }
};

const confirmRestore = (v: SongVersion) => {
  $q.dialog({
    dark: true,
    title: 'Restore this version?',
    message: 'Your lyrics now are kept as a version, so you can come back to them.',
    ok: { label: 'Restore', color: 'toneflix', textColor: 'dark', noCaps: true, unelevated: true, rounded: true },
    cancel: { flat: true, noCaps: true, rounded: true },
  }).onOk(() => void restore(v));
};

const restore = async (v: SongVersion) => {
  restoring.value = v.id;
  try {
    await props.flush();
    const res = await restoreSongVersionRequest(props.songId, v.id).send();
    emit('restored', res.data);
    await load(1);
  } catch (e) {
    notify(errorText(e, "The version couldn't be restored."), 'error');
  } finally {
    restoring.value = null;
  }
};
</script>

<style lang="scss" scoped>
.version {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  &__preview {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
}
</style>
