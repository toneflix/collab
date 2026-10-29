<template>
  <ResponsiveDialog
    title="Save to playlist"
    card-class="w-full max-w-md"
    body-class="max-h-[70vh] overflow-y-auto p-2"
    v-model="open"
    @before-show="reset"
  >
    <div class="flex flex-col gap-2 pb-3">
      <q-form class="flex flex-col gap-2 px-2 pt-2" @submit="create" v-if="creating">
        <q-input
          dark
          filled
          dense
          autofocus
          maxlength="120"
          label="Playlist name"
          :rules="[(v: string) => !!v?.trim() || 'Name your playlist.']"
          v-model="form.title"
        />
        <q-toggle
          dark
          color="toneflix"
          label="Anyone with the link can see it"
          true-value="public"
          false-value="private"
          v-model="form.privacy"
        />
        <div class="flex justify-end gap-2">
          <q-btn flat no-caps rounded class="flex-none!" label="Cancel" @click="creating = false" />
          <q-btn
            unelevated
            no-caps
            rounded
            type="submit"
            color="toneflix"
            class="flex-none!"
            label="Create and save"
            :loading="saving"
          />
        </div>
      </q-form>

      <q-item clickable class="mx-1" @click="creating = true" v-else>
        <q-item-section avatar>
          <q-avatar rounded size="44px" class="bg-surface-3">
            <q-icon name="lucide-plus" size="20px" />
          </q-avatar>
        </q-item-section>
        <q-item-section class="font-semibold">New playlist</q-item-section>
      </q-item>

      <ListSkeleton avatar="square" :rows="3" v-if="loading && !playlists.length" />

      <q-list dark v-else>
        <q-item
          clickable
          class="mx-1"
          :key="playlist.id"
          :disable="busy === playlist.id"
          @click="toggle(playlist)"
          v-for="playlist in playlists"
        >
          <q-item-section avatar>
            <PlaylistArt size="44px" :playlist="playlist" />
          </q-item-section>
          <q-item-section>
            <q-item-label lines="1">{{ playlist.title }}</q-item-label>
            <q-item-label caption>
              {{ countStr(playlist.tracksCount, 'track') }} • {{ playlist.privacy === 'public' ? 'Public' : 'Private' }}
            </q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon
              size="22px"
              :color="playlist.hasTrack ? 'toneflix' : undefined"
              :name="playlist.hasTrack ? 'lucide-square-check' : 'lucide-square'"
            />
          </q-item-section>
        </q-item>
      </q-list>

      <div class="flex justify-center" v-if="page < lastPage">
        <q-btn flat no-caps rounded class="flex-none!" label="Show more" :loading="loading" @click="load(page + 1)" />
      </div>
    </div>
  </ResponsiveDialog>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import ResponsiveDialog from 'src/components/Controllers/ResponsiveDialog.vue';
import ListSkeleton from 'src/components/Skeletons/ListSkeleton.vue';
import PlaylistArt from 'src/components/Playlists/PlaylistArt.vue';
import { countStr, notify } from 'src/utils/helpers';
import {
  addToPlaylistRequest,
  createPlaylistRequest,
  loadMyPlaylistsRequest,
  removeFromPlaylistRequest,
} from 'src/utils/requests/playlists';
import type { Playlist, Track } from 'src/utils/models';

const props = defineProps<{ track: Track | null }>();

const open = defineModel<boolean>({ default: false });

const playlists = ref<Playlist[]>([]);
const page = ref(1);
const lastPage = ref(1);
const loading = ref(false);
const busy = ref<number | null>(null);
const creating = ref(false);
const saving = ref(false);
const form = reactive({ title: '', privacy: 'private' as Playlist['privacy'] });

const load = async (to = 1) => {
  if (!props.track) return;

  loading.value = true;
  try {
    const { data, meta } = await loadMyPlaylistsRequest({ page: to, limit: 20, track_id: props.track.id }).send();
    playlists.value = to === 1 ? data : [...playlists.value, ...data];
    page.value = meta?.currentPage ?? to;
    lastPage.value = meta?.lastPage ?? to;
  } finally {
    loading.value = false;
  }
};

const reset = () => {
  creating.value = false;
  form.title = '';
  form.privacy = 'private';
  playlists.value = [];
  void load(1);
};

const toggle = async (playlist: Playlist) => {
  if (!props.track) return;

  busy.value = playlist.id;
  try {
    const { data, message } = playlist.hasTrack
      ? await removeFromPlaylistRequest(playlist.slug, props.track.id).send()
      : await addToPlaylistRequest(playlist.slug, props.track.id).send();

    Object.assign(playlist, data, { hasTrack: !playlist.hasTrack });
    notify(message, 'success');
  } finally {
    busy.value = null;
  }
};

const create = async () => {
  if (!props.track) return;

  saving.value = true;
  try {
    const { data: playlist } = await createPlaylistRequest({ title: form.title.trim(), privacy: form.privacy }).send();
    const { data, message } = await addToPlaylistRequest(playlist.slug, props.track.id).send();

    playlists.value.unshift({ ...data, hasTrack: true });
    creating.value = false;
    form.title = '';
    notify(message, 'success');
  } finally {
    saving.value = false;
  }
};
</script>
