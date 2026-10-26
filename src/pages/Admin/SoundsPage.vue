<template>
  <q-page padding>
    <div class="max-w-6xl mx-auto">
      <div class="py-8">
        <h1 class="text-3xl font-circlular-std">Sounds</h1>
        <p class="text-grey-5">
          The shared sound library in the studio, and Freesound search and import. Only CC0 sounds are
          ever taken from Freesound, so creators can use them in anything they sell, with no credit needed.
        </p>
      </div>

      <q-spinner v-if="loading" />

      <q-form v-else-if="settings" @submit="save">
        <SettingsSections :sections="sections" :marked="unsaved">
          <template #availability>
            <div class="flex flex-col gap-3">
              <div class="toggle-card">
                <q-toggle color="toneflix" v-model="form.sounds_library_enabled" />
                <div class="min-w-0">
                  <div class="font-bold">Sound library</div>
                  <div class="text-sm text-grey-5">
                    {{ settings.librarySize }} {{ settings.librarySize === 1 ? 'sound' : 'sounds' }}, {{ settings.activeSize }} shown.
                    The studio hides the library while it's off or has no sounds.
                  </div>
                </div>
                <q-badge rounded :color="settings.client.library ? 'green-9' : 'grey-8'" :label="settings.client.library ? 'Visible' : 'Hidden'" />
              </div>

              <div class="toggle-card">
                <q-toggle color="toneflix" v-model="form.freesound_enabled" />
                <div class="min-w-0">
                  <div class="font-bold">Freesound for creators</div>
                  <div class="text-sm text-grey-5">
                    Creators can search Freesound and import CC0 sounds into My sounds with their own Freesound account.
                  </div>
                </div>
                <q-badge rounded :color="settings.client.freesound ? 'green-9' : 'grey-8'" :label="settings.client.freesound ? 'On' : 'Off'" />
              </div>
            </div>
          </template>

          <template #freesound>
            <p class="mb-4 text-sm text-grey-5">
              Create an API app at freesound.org/apiv2/apply and put its Client ID and Client secret in the API's .env.
              Set the app's callback URL to:
            </p>
            <div class="callback">
              <code class="truncate">{{ callbackUrl }}</code>
              <q-btn flat dense round size="sm" icon="content_copy" aria-label="Copy the callback URL" class="!flex-none" @click="copyCallback" />
            </div>
            <EnvKeys class="mt-8" :keys="settings.keys.freesound" />
          </template>

          <template #sync>
            <p class="mb-4 text-sm text-grey-5">
              Each search adds CC0 sounds to the library, once a day and when you press Sync now. Sounds already in the
              library are skipped.
            </p>
            <q-checkbox
              dark
              color="toneflix"
              class="mb-4"
              :label="fields.freesound_sync_paused?.title || 'Pause library sync'"
              v-model="form.freesound_sync_paused"
            />
            <div class="mb-8 -mt-2 text-sm text-grey-5" v-if="fields.freesound_sync_paused?.hint">{{ fields.freesound_sync_paused.hint }}</div>
            <q-input
              dark
              outlined
              autogrow
              type="textarea"
              input-class="font-mono text-sm"
              :label="fields.freesound_sync_queries?.title"
              :hint="fields.freesound_sync_queries?.hint"
              placeholder="Drums: drum loop 120bpm&#10;Bass: bass loop&#10;FX: riser"
              v-model="form.freesound_sync_queries"
            />
            <div class="grid gap-3 mt-8 sm:grid-cols-2">
              <q-input dark outlined type="number" min="1" max="150" :label="fields.freesound_sync_limit?.title" :hint="fields.freesound_sync_limit?.hint" v-model.number="form.freesound_sync_limit" />
              <q-input dark outlined type="number" min="1" max="600" :label="fields.freesound_sync_max_duration?.title" :hint="fields.freesound_sync_max_duration?.hint" v-model.number="form.freesound_sync_max_duration" />
            </div>

            <div class="mt-8 text-sm">
              <template v-if="settings.downloads.quality === 'original'">
                Downloads original files with the Freesound account
                <b>{{ settings.downloads.username || 'that was chosen' }}</b>{{ settings.downloads.isMe ? ' (yours)' : '' }}.
              </template>
                <template v-else>
                  Downloads the high quality MP3 previews. Connect your Freesound account and use it for the library to get
                  the original files.
                </template>
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <q-btn
                  outline
                  rounded
                  no-caps
                  size="sm"
                  color="white"
                  class="!flex-none"
                  :label="settings.me.connected ? `Connected as ${settings.me.username || 'you'}` : 'Connect my Freesound account'"
                  :icon="settings.me.connected ? 'check' : 'link'"
                  :disable="settings.me.connected || !settings.configured"
                  :loading="connecting"
                  @click="connect"
                />
                <q-btn
                  outline
                  rounded
                  no-caps
                  size="sm"
                  color="white"
                  class="!flex-none"
                  label="Use my account for the library"
                  :disable="!settings.me.connected || settings.downloads.isMe"
                  @click="useMine"
                />
              </div>
              <div class="flex flex-wrap items-center gap-3 mt-8">
                <q-btn
                  outline
                  rounded
                  no-caps
                  color="white"
                  icon="sync"
                  :label="settings.syncing ? 'Syncing…' : 'Sync now'"
                  class="!flex-none"
                  :loading="syncing"
                  :disable="!settings.configured || changed || settings.syncing || syncPaused"
                  @click="sync"
                >
                  <q-tooltip v-if="changed">Save first</q-tooltip>
                  <q-tooltip v-else-if="syncPaused">Library sync is paused</q-tooltip>
                </q-btn>
                <span class="text-sm text-grey-5" v-if="settings.lastSync">
                  Last sync {{ when(settings.lastSync.at) }}: {{ settings.lastSync.added }} added, {{ settings.lastSync.skipped }} skipped<template v-if="settings.lastSync.failed">, {{ settings.lastSync.failed }} failed</template><template v-if="settings.lastSync.paused">, paused before it finished</template>.
                </span>
              </div>
              <q-banner rounded dense class="mt-8 text-white bg-orange-10" v-if="settings.lastSync?.errors.length">
                <div class="font-bold">From the last sync:</div>
                <div class="text-sm" :key="i" v-for="(e, i) in settings.lastSync.errors">{{ e }}</div>
              </q-banner>
          </template>

          <template #library>
            <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div class="flex items-center gap-2 no-wrap">
                <q-input dense dark outlined clearable debounce="350" placeholder="Search" class="w-48" v-model="search">
                  <template #prepend><q-icon name="search" /></template>
                </q-input>
                <input ref="fileInput" type="file" multiple class="hidden" accept="audio/*" @change="onFiles" />
                <q-btn unelevated rounded no-caps color="white" text-color="dark" icon="upload" label="Upload" class="!flex-none" :loading="uploading > 0" @click="fileInput?.click()" />
              </div>
            </div>

            <q-list dark separator bordered class="rounded-xl">
              <div class="p-6 text-sm text-center text-grey-5" v-if="!library.length && !listing">
                No sounds yet. Add sync searches and press Sync now, or upload sounds you have the rights to share.
              </div>
              <q-item :key="sound.id" v-for="sound in library">
                <q-item-section avatar>
                  <q-btn round dense flat :icon="playing === sound.id ? 'pause' : 'play_arrow'" :aria-label="`Play ${sound.name}`" @click="play(sound)" />
                </q-item-section>
                <q-item-section class="min-w-0">
                  <q-item-label class="truncate">{{ sound.name }}</q-item-label>
                  <q-item-label caption class="truncate">
                    {{ [sound.category, soundLength(sound.duration), sound.author ? `by ${sound.author}` : '', sound.source === 'freesound' ? `Freesound ${sound.quality === 'original' ? 'original' : 'preview'}` : 'Uploaded', readableSize(sound.size)].filter(Boolean).join(' · ') }}
                  </q-item-label>
                </q-item-section>
                <q-item-section side class="flex-row items-center gap-1 no-wrap">
                  <q-btn flat dense round size="sm" icon="open_in_new" :href="sound.sourceUrl" target="_blank" aria-label="Open on Freesound" v-if="sound.sourceUrl" />
                  <q-toggle dense size="sm" color="toneflix" :model-value="sound.isActive" :aria-label="sound.isActive ? 'Hide this sound' : 'Show this sound'" @update:model-value="setActive(sound, $event)">
                    <q-tooltip>{{ sound.isActive ? 'Shown in the studio' : 'Hidden' }}</q-tooltip>
                  </q-toggle>
                  <q-btn flat dense round size="sm" icon="delete_outline" :aria-label="`Delete ${sound.name}`" @click="remove(sound)" />
                </q-item-section>
              </q-item>
            </q-list>
            <div class="flex justify-center mt-4" v-if="hasMore">
              <q-btn flat no-caps label="Show more" :loading="listing" @click="list(true)" />
            </div>
          </template>

          <template #footer>
            <span class="text-sm text-grey-5" v-if="changed">Unsaved changes</span>
            <q-btn unelevated rounded no-caps type="submit" color="toneflix" label="Save" class="!flex-none" :disable="!changed" :loading="saving" />
          </template>
        </SettingsSections>
      </q-form>
      <audio ref="player" class="hidden" @ended="playing = 0" @pause="playing = 0" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { copyToClipboard, date, useQuasar } from 'quasar';
import SettingsSections, { type SettingsSection } from 'src/components/Admin/SettingsSections.vue';
import EnvKeys from 'src/components/Utilities/EnvKeys.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import type { ResponseBody } from 'src/utils/models';
import {
  analyseAudio,
  connectFreesoundRequest,
  deleteLibrarySoundRequest,
  loadAdminLibraryRequest,
  loadSoundSettingsRequest,
  readableSize,
  saveSoundSettingsRequest,
  soundLength,
  syncSoundLibraryRequest,
  updateLibrarySoundRequest,
  uploadSoundRequest,
  useMyFreesoundForLibraryRequest,
  type Sound,
  type SoundAdminSettings,
} from 'src/utils/requests/sounds';

const $q = useQuasar();
const boot = useBootstrapStore();

const loading = ref(true);
const saving = ref(false);
const syncing = ref(false);
const connecting = ref(false);
const settings = ref<SoundAdminSettings>();
const form = reactive({
  sounds_library_enabled: false,
  freesound_enabled: false,
  freesound_sync_paused: false,
  freesound_sync_queries: '',
  freesound_sync_limit: 25 as number | string,
  freesound_sync_max_duration: 30 as number | string,
});
const saved = ref<Partial<typeof form>>({});

type FormKey = keyof typeof form;

/** The page's sections and the form fields each one holds. */
const sections: (SettingsSection & { fields: FormKey[] })[] = [
  {
    key: 'availability',
    icon: 'fas fa-power-off',
    title: 'Availability',
    caption: 'The studio library and Freesound for creators.',
    fields: ['sounds_library_enabled', 'freesound_enabled'],
  },
  {
    key: 'freesound',
    icon: 'fas fa-key',
    title: 'Freesound app',
    caption: 'The API app, its callback and keys.',
    fields: [],
    hideFooter: true,
  },
  {
    key: 'sync',
    icon: 'fas fa-rotate',
    title: 'Library sync',
    caption: 'The searches that fill the library each day.',
    fields: ['freesound_sync_paused', 'freesound_sync_queries', 'freesound_sync_limit', 'freesound_sync_max_duration'],
  },
  {
    key: 'library',
    icon: 'fas fa-music',
    title: 'Library',
    caption: 'Every shared sound, to play, hide or delete.',
    fields: [],
    hideFooter: true,
  },
];

const fields = computed(() => settings.value?.fields ?? {});
const differs = (key: FormKey) => JSON.stringify(form[key]) !== JSON.stringify(saved.value[key]);
const changed = computed(() => (Object.keys(form) as FormKey[]).some(differs));
const unsaved = computed(() =>
  sections.filter((section) => section.fields.some(differs)).map((section) => section.key),
);
const callbackUrl = computed(() => (typeof window !== 'undefined' ? `${window.location.origin}/freesound/callback` : '/freesound/callback'));

const on = (v?: string | null) => v === '1' || v === 'true';
const syncPaused = computed(() => on(fields.value.freesound_sync_paused?.value));

const fill = (data: SoundAdminSettings) => {
  settings.value = data;
  const f = data.fields;
  form.sounds_library_enabled = on(f.sounds_library_enabled?.value);
  form.freesound_enabled = on(f.freesound_enabled?.value);
  form.freesound_sync_paused = on(f.freesound_sync_paused?.value);
  form.freesound_sync_queries = f.freesound_sync_queries?.value ?? '';
  form.freesound_sync_limit = Number(f.freesound_sync_limit?.value ?? 25);
  form.freesound_sync_max_duration = Number(f.freesound_sync_max_duration?.value ?? 30);
  saved.value = { ...form };
  boot.sounds = data.client;
};

const errorText = (e: unknown, fallback: string) => {
  const err = e as ResponseBody;
  const first = err?.errors ? Object.values(err.errors)[0] : undefined;
  return (Array.isArray(first) ? first[0] : first) || err?.message || fallback;
};

const load = async () => {
  loading.value = true;
  try {
    fill(await loadSoundSettingsRequest().send());
  } catch (e) {
    notify(errorText(e, 'The sound settings couldn\'t be loaded.'), 'error');
  } finally {
    loading.value = false;
  }
};

const save = async () => {
  saving.value = true;
  try {
    const body = await saveSoundSettingsRequest({ ...form }).send();
    fill(body.data);
    notify(body.message, 'success');
  } catch (e) {
    notify(errorText(e, 'The settings couldn\'t be saved.'), 'error');
  } finally {
    saving.value = false;
  }
};

const sync = async () => {
  syncing.value = true;
  try {
    const body = await syncSoundLibraryRequest().send();
    fill(body.data);
    notify(body.message, 'success');
    void list();
  } catch (e) {
    notify(errorText(e, 'The sync couldn\'t start.'), 'error');
  } finally {
    syncing.value = false;
  }
};

const connect = async () => {
  connecting.value = true;
  try {
    window.location.href = await connectFreesoundRequest('/admin/sounds').send();
  } catch (e) {
    connecting.value = false;
    notify(errorText(e, 'Freesound couldn\'t be reached.'), 'error');
  }
};

const useMine = async () => {
  try {
    const body = await useMyFreesoundForLibraryRequest().send();
    fill(body.data);
    notify(body.message, 'success');
  } catch (e) {
    notify(errorText(e, 'That didn\'t work.'), 'error');
  }
};

const copyCallback = () => void copyToClipboard(callbackUrl.value).then(() => notify('Callback URL copied.', 'success'));

const when = (at: string) => date.formatDate(at, 'MMM D, h:mm A');

// The library list
const library = ref<Sound[]>([]);
const search = ref('');
const listing = ref(false);
const page = ref(1);
const hasMore = ref(false);
const uploading = ref(0);
const fileInput = ref<HTMLInputElement>();
const player = ref<HTMLAudioElement>();
const playing = ref(0);

const list = async (more = false) => {
  listing.value = true;
  page.value = more ? page.value + 1 : 1;
  try {
    const res = await loadAdminLibraryRequest({ search: search.value || undefined, page: page.value }).send();
    library.value = more ? [...library.value, ...res.data] : res.data;
    hasMore.value = res.meta.currentPage < res.meta.lastPage;
  } catch (e) {
    notify(errorText(e, 'The library couldn\'t be loaded.'), 'error');
  } finally {
    listing.value = false;
  }
};

watch(search, () => void list());

const play = (sound: Sound) => {
  const el = player.value;
  if (!el) return;
  if (playing.value === sound.id) return el.pause();
  el.src = sound.url;
  void el.play().then(() => (playing.value = sound.id));
};

const setActive = async (sound: Sound, active: boolean) => {
  try {
    await updateLibrarySoundRequest(sound.id, { is_active: active }).send();
    sound.isActive = active;
  } catch (e) {
    notify(errorText(e, 'The sound couldn\'t be changed.'), 'error');
  }
};

const remove = (sound: Sound) => {
  $q.dialog({
    dark: true,
    title: 'Delete sound',
    message: `Delete "${sound.name}" from the library? Stems already made from it stay in their tracks.`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await deleteLibrarySoundRequest(sound.id).send();
      library.value = library.value.filter((s) => s.id !== sound.id);
    } catch (e) {
      notify(errorText(e, 'The sound couldn\'t be deleted.'), 'error');
    }
  });
};

const onFiles = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  for (const file of files) {
    uploading.value++;
    try {
      const info = await analyseAudio(file).catch(() => ({ duration: 0, waveform: [] as number[] }));
      const res = await uploadSoundRequest(file, { name: file.name.replace(/\.[^.]+$/, ''), ...info }, { category: 'Uploads' }).send();
      library.value = [res.data, ...library.value];
    } catch (err) {
      notify(errorText(err, `"${file.name}" couldn't be uploaded.`), 'error');
    } finally {
      uploading.value--;
    }
  }
};

onMounted(async () => {
  await load();
  void list();
});
</script>

<style lang="scss" scoped>
.toggle-card {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);

  > :first-child,
  > :last-child {
    flex: none;
  }

  > .min-w-0 {
    flex: 1 1 auto;
  }
}


.callback {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  padding: 6px 6px 6px 12px;
  border-radius: 8px;
  background: #0d0f12;

  code {
    flex: 1 1 auto;
    min-width: 0;
    font-size: 0.85rem;
  }
}
</style>
