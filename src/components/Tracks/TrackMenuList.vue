<template>
  <q-list dark class="track-menu-list">
    <template v-if="!track.temporary">
      <TrackMenuItem icon="lucide-radio" label="Start mix" @click="startMix" />
      <template v-if="!current">
        <TrackMenuItem icon="lucide-list-start" label="Play next" @click="playNext" />
        <TrackMenuItem icon="lucide-list-end" label="Add to queue" @click="addToQueue" />
      </template>
      <TrackMenuItem
        icon="lucide-list-x"
        label="Remove from queue"
        @click="removeFromQueue"
        v-if="context.queuePosition !== undefined && !current"
      />

      <TrackMenuItem
        :icon="track.saved ? 'lucide-bookmark-check' : 'lucide-bookmark'"
        :label="track.saved ? 'Remove from library' : 'Save to library'"
        @click="toggleSave"
      />
      <TrackMenuItem
        :icon="track.liked ? 'lucide-heart-off' : 'lucide-heart'"
        :label="track.liked ? 'Remove from liked songs' : 'Add to liked songs'"
        @click="toggleLike"
      />

      <TrackMenuItem icon="lucide-disc-3" label="Go to album" :to="albumLink" v-if="track.album" />
      <TrackMenuItem icon="lucide-user" label="Go to artist" :to="artistLink" v-if="artistLink" />
      <TrackMenuItem icon="lucide-users-round" label="View song credits" @click="openTrackDialog('credits', track)" />
      <TrackMenuItem icon="lucide-share-2" label="Share" @click="share" />
      <TrackMenuItem icon="lucide-download" label="Download" @click="download" v-if="canDownload(track)" />
    </template>

    <slot />

    <TrackMenuItem icon="lucide-flag" label="Report" @click="report" v-if="!track.temporary && !track.owned" />
  </q-list>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { copyToClipboard, EventBus, useQuasar } from 'quasar';
import { useRoute, useRouter } from 'vue-router';
import { usePlayerStore } from 'src/stores/player-store';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { usePayments } from 'src/composables/usePayments';
import { trackInteractionRequest } from 'src/utils/requests/requests';
import { loadTrackDownloadRequest } from 'src/utils/requests/payments';
import { downloadFile } from 'src/utils/download';
import { notify } from 'src/utils/helpers';
import type { CollabEvents, Track } from 'src/utils/models';
import { openTrackDialog, type TrackMenuContext } from 'src/utils/track-menu';
import TrackMenuItem from './TrackMenuItem.vue';

const props = withDefaults(
  defineProps<{
    track: Track;
    context?: TrackMenuContext;
  }>(),
  { context: () => ({}) },
);

const $q = useQuasar();
const route = useRoute();
const router = useRouter();
const player = usePlayerStore();
const boot = useBootstrapStore();
const bus = inject<EventBus<CollabEvents>>('bus');
const { canDownload } = usePayments();

const current = computed(() => player.isCurrent(props.track));
const artistName = computed(() => props.track.artist?.username || props.track.artistId);

const trackLink = computed(() => ({
  name: 'artist.track',
  params: { artist_id: artistName.value || '-', track_id: props.track.slug },
}));
const artistLink = computed(() =>
  artistName.value ? { name: 'artist', params: { artist_id: artistName.value } } : null,
);
const albumLink = computed(() => ({
  name: 'artist.album',
  params: { artist_id: artistName.value || '-', album_id: props.track.album?.slug || '-' },
}));

/** Sends guests to sign in first, then back here */
const signedIn = () => {
  if (boot.user.id) return true;

  void router.push({ name: 'auth.login', query: { redirect: route.fullPath } });
  return false;
};

const startMix = () => {
  void player.startMix(props.track);
};

const playNext = () => {
  player.playNext(props.track);
  notify('Playing next.', 'success');
};

const addToQueue = () => {
  player.addToQueue(props.track);
  notify('Added to queue.', 'success');
};

const removeFromQueue = () => {
  player.removeFromQueue(props.context.queuePosition!);
};

const toggleSave = async () => {
  if (!signedIn()) return;

  const track = props.track;
  const state = !track.saved;

  track.saved = state;
  try {
    const { data } = await trackInteractionRequest(track.id, 'save', state).send();
    track.saved = data.saved;
    notify(data.saved ? 'Saved to library.' : 'Removed from library.', 'success');
  } catch {
    track.saved = !state;
  }
};

const toggleLike = async () => {
  if (!signedIn()) return;

  const track = props.track;
  const state = !track.liked;

  track.liked = state;
  try {
    const { data } = await trackInteractionRequest(track.id, 'like', state).send();
    track.liked = data.liked;
    track.likes = data.likes;
    bus?.emit('liked', data.liked, data, `track:${track.id}`);
  } catch {
    track.liked = !state;
  }
};

const share = async () => {
  const url = new URL(router.resolve(trackLink.value).href, window.location.origin).href;

  if ($q.platform.is.mobile && navigator.share) {
    await navigator
      .share({ title: props.track.title, text: props.track.title, url })
      .catch(() => undefined);
    return;
  }

  await copyToClipboard(url);
  notify('Link copied.', 'success');
};

const download = async () => {
  const { data } = await loadTrackDownloadRequest(props.track.id).send();
  await downloadFile(data.url, data.filename);
};

const report = () => {
  if (signedIn()) openTrackDialog('report', props.track);
};
</script>
