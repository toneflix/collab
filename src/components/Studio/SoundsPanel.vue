<template>
  <slot :toggle="toggle" :open="open" />
  <StudioSheet :dock="dock" v-model="open" @show="load" @hide="stopPreview">
    <q-card dark class="sounds" :class="{ 'sounds--mobile': $q.screen.lt.sm }">
      <header class="sounds__head">
        <div class="text-lg font-bold">Sounds</div>
        <IconBtn icon="lucide-x" aria-label="Close sounds" class="flex-none!" @click="open = false" />
      </header>

      <q-tabs dense no-caps align="justify" active-color="toneflix" indicator-color="toneflix" v-model="tab">
        <q-tab name="library" label="Library" v-if="status?.library" />
        <q-tab name="mine" label="My sounds" />
        <q-tab name="freesound" label="Freesound" v-if="status?.freesound" />
      </q-tabs>

      <div class="sounds__search">
        <q-input
          dense
          dark
          outlined
          clearable
          debounce="350"
          :placeholder="tab === 'freesound' ? 'Search Freesound, like “drum loop”' : 'Search sounds'"
          v-model="search"
        >
          <template #prepend><q-icon name="lucide-search" /></template>
        </q-input>
      </div>

      <!-- Library categories -->
      <div class="sounds__chips" v-if="tab === 'library' && status?.categories.length">
        <q-chip
          dense
          clickable
          :outline="category !== c"
          :color="category === c ? 'toneflix' : undefined"
          :text-color="category === c ? 'dark' : undefined"
          :key="c"
          v-for="c in status.categories"
          @click="category = category === c ? '' : c"
        >
          {{ c }}
        </q-chip>
      </div>

      <!-- My sounds: storage and upload -->
      <div class="sounds__storage" v-if="tab === 'mine' && status">
        <div class="flex items-center justify-between gap-2 no-wrap text-xs">
          <span>
            {{ readableSize(status.storage.used) }}
            <template v-if="status.storage.limit"> of {{ readableSize(status.storage.limit) }} used</template>
            <template v-else> used</template>
          </span>
          <router-link class="text-toneflix" :to="{ name: 'premium' }" v-if="nearlyFull">Get more space</router-link>
        </div>
        <q-linear-progress
          rounded
          size="6px"
          class="mt-1"
          :color="nearlyFull ? 'orange' : 'toneflix'"
          track-color="grey-9"
          :value="status.storage.limit ? Math.min(1, status.storage.used / status.storage.limit) : 0"
          v-if="status.storage.limit"
        />
        <input ref="fileInput" type="file" multiple class="hidden" :accept="acceptFor(audioExts())" @change="onFiles" />
        <q-btn
          unelevated
          rounded
          no-caps
          color="white"
          text-color="dark"
          icon="lucide-upload"
          label="Upload sounds"
          class="w-full mt-2"
          :loading="uploading > 0"
          @click="fileInput?.click()"
        />
      </div>

      <!-- Freesound: connect and license -->
      <div class="sounds__freesound" v-if="tab === 'freesound' && status">
        <div class="text-xs text-grey-4">
          Only CC0 sounds are shown. They're free to use in anything you release, with no credit needed.
        </div>
        <div class="flex items-center justify-between gap-2 mt-2 no-wrap" v-if="status.freesoundConnected">
          <span class="text-xs">Connected as <b>{{ status.freesoundUsername || 'your account' }}</b></span>
          <q-btn flat dense no-caps size="sm" label="Disconnect" @click="disconnect" />
        </div>
        <q-btn
          unelevated
          rounded
          no-caps
          color="white"
          text-color="dark"
          label="Connect Freesound to import"
          class="w-full mt-2"
          :loading="connecting"
          @click="connect"
          v-else
        />
      </div>

      <q-list dark separator class="sounds__list" role="list">
        <ListSkeleton dense avatar="square" :rows="6" v-if="loading && !items.length" />
        <div class="px-6 py-10 text-sm text-center text-grey-5" v-else-if="!items.length">
          {{ emptyText }}
        </div>

        <q-item :key="item.key" v-for="item in items" role="listitem" class="sound">
          <q-item-section avatar>
            <q-btn
              round
              dense
              unelevated
              color="grey-9"
              :icon="playingKey === item.key ? 'pause' : 'play_arrow'"
              :aria-label="playingKey === item.key ? `Pause ${item.name}` : `Play ${item.name}`"
              :disable="!item.url"
              @click="preview(item)"
            />
          </q-item-section>
          <q-item-section class="min-w-0">
            <q-item-label class="truncate">{{ item.name }}</q-item-label>
            <q-item-label caption class="truncate">
              {{ [item.category, item.bpm ? `${Math.round(item.bpm)} BPM` : '', soundLength(item.duration), item.author ? `by ${item.author}` : ''].filter(Boolean).join(' · ') }}
            </q-item-label>
            <div class="sound__wave" aria-hidden="true" v-if="item.waveform?.length">
              <span :key="i" :style="{ height: `${Math.max(8, v * 100)}%` }" v-for="(v, i) in item.waveform" />
            </div>
          </q-item-section>
          <q-item-section side class="sound__actions">
            <template v-if="item.kind === 'freesound'">
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="toneflix"
                :label="item.imported ? 'Imported' : 'Import'"
                :icon="item.imported ? 'check' : 'download'"
                :disable="item.imported || !status?.freesoundConnected"
                :loading="busy === item.key"
                @click="importSound(item)"
              >
                <q-tooltip v-if="!status?.freesoundConnected">Connect Freesound first</q-tooltip>
              </q-btn>
            </template>
            <template v-else>
              <q-btn
                flat
                dense
                no-caps
                size="sm"
                color="toneflix"
                icon="lucide-plus"
                label="Add"
                :loading="busy === item.key"
                :disable="disabled"
                @click="add(item)"
              >
                <q-tooltip>Add to the track at the playhead</q-tooltip>
              </q-btn>
              <IconBtn size="sm"
                icon="lucide-trash-2"
                :aria-label="`Delete ${item.name}`"
                @click="remove(item)"
                v-if="item.kind === 'mine'"
              />
            </template>
          </q-item-section>
        </q-item>

        <div class="flex justify-center py-4" v-if="hasMore && !loading">
          <q-btn flat no-caps label="Show more" :loading="loadingMore" @click="loadMore" />
        </div>
      </q-list>
      <audio ref="player" class="hidden" @ended="playingKey = ''" @pause="playingKey = ''" />
    </q-card>
  </StudioSheet>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import StudioSheet from 'src/components/Studio/StudioSheet.vue';
import { useRoute } from 'vue-router';
import { useQuasar } from 'quasar';
import { notify } from 'src/utils/helpers';
import { acceptFor, audioExts } from 'src/utils/presets';
import { usePlayerStore } from 'src/stores/player-store';
import type { Stem } from 'src/utils/daw';
import {
  addSoundToTrackRequest,
  analyseAudio,
  connectFreesoundRequest,
  deleteSoundRequest,
  disconnectFreesoundRequest,
  importFreesoundRequest,
  loadLibrarySoundsRequest,
  loadMySoundsRequest,
  loadSoundsStatusRequest,
  readableSize,
  searchFreesoundRequest,
  soundLength,
  uploadSoundRequest,
  type FreesoundResult,
  type Sound,
  type SoundsStatus,
} from 'src/utils/requests/sounds';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

/**
 * Sounds to drop into a track: the shared library (only when it's on and
 * has sounds), the person's own uploads, and CC0 sounds from Freesound.
 */
const props = defineProps<{
  projectId: string | number;
  trackId: string | number;
  /** Where the playhead is, for placing a new sound */
  playhead: () => number;
  disabled?: boolean;
  /** CSS selector of the column the panel docks into on desktop. */
  dock?: string;
}>();

const emit = defineEmits<{ added: [stem: Stem] }>();

const $q = useQuasar();
const route = useRoute();

type Item = {
  key: string;
  kind: 'library' | 'mine' | 'freesound';
  id: number | string;
  name: string;
  url?: string | null;
  category?: string | null;
  bpm?: number | null;
  duration: number;
  author?: string | null;
  waveform?: number[];
  imported?: boolean;
};

const open = ref(false);
const tab = ref<'library' | 'mine' | 'freesound'>('mine');
const status = ref<SoundsStatus | null>(null);
const search = ref('');
const category = ref('');
const items = ref<Item[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const page = ref(1);
const hasMore = ref(false);
const busy = ref('');
const uploading = ref(0);
const connecting = ref(false);
const fileInput = ref<HTMLInputElement>();
const player = ref<HTMLAudioElement>();
const playingKey = ref('');

const toggle = () => (open.value = !open.value);

const nearlyFull = computed(() => {
  const s = status.value?.storage;
  return !!s?.limit && s.used / s.limit > 0.85;
});

const emptyText = computed(() => {
  if (tab.value === 'mine') return search.value ? 'None of your sounds match.' : 'Upload loops and one-shots here to use them in any track.';
  if (tab.value === 'freesound') return search.value ? 'No CC0 sounds match that search.' : 'Search Freesound for loops, drums and effects.';
  return 'No sounds match.';
});

const fromSound = (s: Sound, kind: 'library' | 'mine'): Item => ({
  key: `${kind}-${s.id}`,
  kind,
  id: s.id,
  name: s.name,
  url: s.url,
  category: s.category,
  bpm: s.bpm,
  duration: s.duration,
  author: s.author,
  waveform: s.waveform,
});

const fromFreesound = (s: FreesoundResult): Item => ({
  key: `freesound-${s.id}`,
  kind: 'freesound',
  id: s.id,
  name: s.name,
  url: s.previewUrl,
  bpm: s.bpm,
  duration: s.duration,
  author: s.author,
  imported: s.imported,
});

const errorText = (e: unknown, fallback: string) => (e as { message?: string })?.message || fallback;

let opened = false;

const load = async () => {
  const before = tab.value;
  try {
    status.value = await loadSoundsStatusRequest().send();
    // Start on the library the first time, when there is one.
    if (!opened && status.value.library) tab.value = 'library';
    if (tab.value === 'library' && !status.value.library) tab.value = 'mine';
    if (tab.value === 'freesound' && !status.value.freesound) tab.value = 'mine';
    opened = true;
  } catch {
    // The list shows its own error.
  }
  // A tab change loads the list by itself.
  if (tab.value === before) await list();
};

const list = async (more = false) => {
  if (!more) {
    page.value = 1;
    loading.value = true;
  } else {
    loadingMore.value = true;
  }
  try {
    if (tab.value === 'freesound') {
      if (!search.value) {
        items.value = [];
        hasMore.value = false;
        return;
      }
      const res = await searchFreesoundRequest(search.value, page.value).send();
      const found = res.data.map(fromFreesound);
      items.value = more ? [...items.value, ...found] : found;
      hasMore.value = items.value.length < res.meta.total;
      return;
    }
    const params = { search: search.value || undefined, category: tab.value === 'library' ? category.value || undefined : undefined, page: page.value };
    const res = await (tab.value === 'library' ? loadLibrarySoundsRequest(params) : loadMySoundsRequest(params)).send();
    const found = res.data.map((s) => fromSound(s, tab.value as 'library' | 'mine'));
    items.value = more ? [...items.value, ...found] : found;
    hasMore.value = res.meta.currentPage < res.meta.lastPage;
  } catch (e) {
    if (!more) items.value = [];
    notify(errorText(e, 'The sounds couldn\'t be loaded.'), 'error');
  } finally {
    loading.value = false;
    loadingMore.value = false;
  }
};

const loadMore = () => {
  page.value++;
  void list(true);
};

watch([tab, search, category], () => {
  stopPreview();
  if (open.value) void list();
});

const preview = (item: Item) => {
  const el = player.value;
  if (!el || !item.url) return;
  if (playingKey.value === item.key) return el.pause();
  usePlayerStore().pause();
  el.src = item.url;
  void el.play().then(() => (playingKey.value = item.key)).catch(() => notify('This sound couldn\'t be played.', 'error'));
};

const stopPreview = () => {
  player.value?.pause();
  playingKey.value = '';
};

const add = async (item: Item) => {
  busy.value = item.key;
  try {
    const res = await addSoundToTrackRequest(props.projectId, props.trackId, Number(item.id), props.playhead()).send();
    emit('added', res.data);
    notify(`Added "${item.name}".`, 'success');
  } catch (e) {
    notify(errorText(e, 'The sound couldn\'t be added.'), 'error');
  } finally {
    busy.value = '';
  }
};

const upload = async (files: File[]) => {
  for (const file of files) {
    uploading.value++;
    try {
      const info = await analyseAudio(file).catch(() => ({ duration: 0, waveform: [] as number[] }));
      const res = await uploadSoundRequest(file, { name: file.name.replace(/\.[^.]+$/, ''), ...info }).send();
      if (res.storage && status.value) status.value.storage = res.storage;
      if (tab.value === 'mine') items.value = [fromSound(res.data, 'mine'), ...items.value];
    } catch (e) {
      notify(errorText(e, `"${file.name}" couldn't be uploaded.`), 'error');
    } finally {
      uploading.value--;
    }
  }
};

const onFiles = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  if (files.length) void upload(files);
};

const remove = (item: Item) => {
  $q.dialog({
    dark: true,
    title: 'Delete sound',
    message: `Delete "${item.name}" from My sounds? Stems already made from it stay in their tracks.`,
    cancel: true,
    ok: { label: 'Delete', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      const res = await deleteSoundRequest(Number(item.id)).send();
      items.value = items.value.filter((i) => i.key !== item.key);
      if (status.value) status.value.storage = res.storage;
    } catch (e) {
      notify(errorText(e, 'The sound couldn\'t be deleted.'), 'error');
    }
  });
};

const importSound = async (item: Item) => {
  busy.value = item.key;
  try {
    const res = await importFreesoundRequest(String(item.id)).send();
    item.imported = true;
    if (status.value) status.value.storage = res.storage;
    notify(`Added "${item.name}" to My sounds.`, 'success');
  } catch (e) {
    notify(errorText(e, 'The sound couldn\'t be imported.'), 'error');
  } finally {
    busy.value = '';
  }
};

const connect = async () => {
  connecting.value = true;
  try {
    window.location.href = await connectFreesoundRequest(route.fullPath).send();
  } catch (e) {
    connecting.value = false;
    notify(errorText(e, 'Freesound couldn\'t be reached.'), 'error');
  }
};

const disconnect = async () => {
  try {
    await disconnectFreesoundRequest().send();
    if (status.value) status.value.freesoundConnected = false;
  } catch (e) {
    notify(errorText(e, 'Freesound couldn\'t be disconnected.'), 'error');
  }
};

defineExpose({ toggle, upload });
</script>

<style lang="scss" scoped>
.sounds {
  display: flex;
  flex-direction: column;
  width: 380px;
  height: calc(100vh - 32px);
  max-height: none !important;
  margin: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  background: #15171c;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.55);

  > * {
    flex: 0 0 auto;
  }

  &--mobile {
    width: 100vw;
    height: 100dvh;
    margin: 0;
    border: 0;
    border-radius: 0;
  }

  &__head {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    padding: 12px 12px 4px 16px;
  }

  &__search,
  &__storage,
  &__freesound {
    padding: 10px 12px 0;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 2px;
    padding: 6px 8px 0;
  }

  > .sounds__list {
    flex: 1 1 auto;
    min-height: 0;
    margin-top: 8px;
    overflow-y: auto;
  }
}

.sound {
  padding: 8px 12px;

  &__wave {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 1px;
    height: 18px;
    margin-top: 4px;
    overflow: hidden;
    opacity: 0.6;

    span {
      flex: 1 1 0;
      min-width: 1px;
      border-radius: 1px;
      background: #03bfff;
    }
  }

  &__actions {
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    gap: 2px;
  }
}
</style>
