<template>
  <q-page class="p-4">
    <div class="max-w-full mx-auto md:max-w-3xl lg:max-w-4xl">
      <div class="flex items-center gap-3 mb-1 no-wrap">
        <h4 class="text-xl font-semibold md:text-2xl !flex-none">Composer</h4>
        <q-btn
          unelevated
          rounded
          no-caps
          color="toneflix"
          text-color="dark"
          label="New song"
          class="!flex-none ml-auto"
          icon="lucide-plus"
          :loading="creating"
          @click="newSong"
        />
      </div>
      <p class="mb-8 text-sm text-grey-5">
        Your notepad for lyrics. Syllables, rhymes and word lookups sit beside every line, and songs save as you write.
      </p>

      <q-input
        dark
        dense
        outlined
        rounded
        clearable
        debounce="300"
        class="mb-8"
        placeholder="Search your songs"
        v-model="search"
      >
        <template #prepend>
          <q-icon name="lucide-search" />
        </template>
      </q-input>

      <div class="empty" v-if="!songs.length && !loading">
        <q-icon size="40px" class="mb-2 text-toneflix" name="lucide-square-pen" />
        <div class="text-base font-semibold" v-if="search">No songs match "{{ search }}".</div>
        <template v-else>
          <div class="text-base font-semibold">No songs yet.</div>
          <div class="text-sm text-grey-5">Start one and write your first verse.</div>
        </template>
      </div>

      <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
        <router-link
          class="song-card"
          :key="song.id"
          :to="{ name: 'studio.composer.song', params: { song_id: song.id } }"
          v-intersection="(e: IntersectionObserverEntry) => onIntersect(e, i === songs.length - 1)"
          v-for="(song, i) in songs"
        >
          <div class="flex items-start gap-2 no-wrap">
            <div class="min-w-0 flex-1">
              <div class="font-semibold truncate">{{ song.title }}</div>
              <div class="text-xs text-grey-5">
                {{ song.lineCount }} {{ song.lineCount === 1 ? 'line' : 'lines' }} · {{ song.wordCount }} words
                <template v-if="song.bpm"> · {{ song.bpm }} BPM</template>
                <template v-if="song.key"> · {{ song.key }}</template>
              </div>
            </div>
            <IconBtn size="sm"
              class="!flex-none"
              aria-label="Delete song"
              icon="lucide-trash-2"
              @click.stop.prevent="remove(song, i)"
            />
          </div>
          <div class="song-card__excerpt">
            <template v-if="song.excerpt?.length">
              <div class="truncate" :key="n" v-for="(line, n) in song.excerpt">{{ line }}</div>
            </template>
            <div class="text-grey-6" v-else>Nothing written yet</div>
          </div>
          <div class="text-[11px] text-grey-6">Edited {{ timeAgo(song.updatedAt) }}</div>
        </router-link>
      </div>

      <ListSkeleton avatar="square" :rows="4" v-if="loading" />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { date, useQuasar } from 'quasar';
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { notifyError } from 'src/utils/composer';
import { createSongRequest, deleteSongRequest, loadSongsRequest, type Song } from 'src/utils/requests/composer';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';

defineOptions({ name: 'ComposerPage' });

const $q = useQuasar();
const router = useRouter();

const songs = ref<Song[]>([]);
const search = ref('');
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const creating = ref(false);
let ticket = 0;


const load = async (reset = false) => {
  if (reset) {
    page.value = 1;
    songs.value = [];
  }
  const mine = ++ticket;
  loading.value = true;
  try {
    const res = await loadSongsRequest(page.value, search.value ?? '').send();
    if (mine !== ticket) return;
    songs.value = reset ? res.data : [...songs.value, ...res.data];
    lastPage.value = res.meta?.lastPage ?? 1;
  } catch (e) {
    notifyError(e, "Your songs couldn't be loaded.");
  } finally {
    if (mine === ticket) loading.value = false;
  }
};

const onIntersect = (evt: IntersectionObserverEntry, isLast: boolean) => {
  if (isLast && evt.isIntersecting && !loading.value && page.value < lastPage.value) {
    page.value++;
    void load();
  }
};

const newSong = async () => {
  creating.value = true;
  try {
    const res = await createSongRequest().send();
    await router.push({ name: 'studio.composer.song', params: { song_id: res.data.id } });
  } catch (e) {
    notifyError(e, "A new song couldn't be started.");
  } finally {
    creating.value = false;
  }
};

const remove = (song: Song, i: number) => {
  $q.dialog({
    dark: true,
    title: 'Delete this song?',
    message: `"${song.title}" and its versions will be deleted.`,
    ok: { label: 'Delete', color: 'negative', noCaps: true, unelevated: true, rounded: true },
    cancel: { label: 'Keep it', flat: true, noCaps: true, rounded: true },
  }).onOk(async () => {
    try {
      await deleteSongRequest(song.id).send();
      songs.value.splice(i, 1);
    } catch (e) {
      notifyError(e, "The song couldn't be deleted.");
    }
  });
};

const timeAgo = (at: string) => {
  const minutes = date.getDateDiff(new Date(), at, 'minutes');
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return date.formatDate(at, 'D MMM YYYY');
};

watch(search, () => void load(true));

onMounted(() => void load(true));
</script>

<style lang="scss" scoped>
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 16px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  text-align: center;
}

.song-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  background: #15171c;
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s ease;

  &:hover {
    border-color: rgba(244, 201, 93, 0.5);
  }

  &__excerpt {
    font-size: 13px;
    line-height: 1.6;
    color: #c9ccd3;
  }
}
</style>
