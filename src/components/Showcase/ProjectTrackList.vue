<template>
  <div class="grid gap-2">
    <div class="flex items-center gap-2">
      <div class="text-lg font-bold">Tracks</div>
      <q-space />
      <span class="text-sm text-fg-muted flex-none!">{{ privacyNote }}</span>
    </div>

    <SimpleInfo dense text="No tracks to show yet." v-if="!tracks.length" />

    <q-list separator class="track-list" v-else>
      <q-item :key="track.id" v-for="(track, i) in tracks">
        <q-item-section avatar>
          <q-btn
            round
            dense
            unelevated
            class="flex-none!"
            :color="playingId === track.id ? 'primary' : 'grey-9'"
            :icon="playingId === track.id ? 'lucide-pause' : 'lucide-play'"
            :aria-label="playingId === track.id ? `Pause ${track.title}` : `Play ${track.title}`"
            :disable="!track.preview"
            @click="toggle(track)"
          />
        </q-item-section>
        <q-item-section>
          <q-item-label>{{ i + 1 }}. {{ track.title }}</q-item-label>
          <q-item-label caption v-if="!track.preview">No mix to play yet</q-item-label>
        </q-item-section>
        <q-item-section side v-if="track.duration">
          <span class="text-sm text-fg-muted">{{ clock(track.duration) }}</span>
        </q-item-section>
        <q-item-section side v-if="project.opensStudio">
          <q-btn
            flat
            dense
            no-caps
            size="sm"
            class="flex-none!"
            icon="lucide-audio-lines"
            :label="member ? 'Open in studio' : 'Watch in studio'"
            :to="{ name: 'studio.project.track', params: { project_id: project.slug, track_id: track.id } }"
          />
        </q-item-section>
      </q-item>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { notify } from 'src/utils/helpers';
import { usePlayerStore } from 'src/stores/player-store';
import type { Project, ProjectTrack } from 'src/utils/models';

/**
 * A project's tracks for its public page: each plays its current preview
 * mix, and opens in the studio (read-only for visitors) when the project
 * is public.
 */
const props = defineProps<{ project: Project }>();

const player = usePlayerStore();
const playingId = ref<ProjectTrack['id'] | null>(null);
let audio: HTMLAudioElement | null = null;

const tracks = computed(() => props.project.tracks || []);
const member = computed(() => props.project.isOwner || props.project.isCollaber);

const privacyNote = computed(() => {
  if (member.value) return '';
  return props.project.opensStudio ? 'Open project: watch it being made' : 'Preview only';
});

const clock = (seconds: number) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const element = () => {
  if (!audio) {
    audio = new Audio();
    audio.addEventListener('ended', () => (playingId.value = null));
    audio.addEventListener('pause', () => (playingId.value = null));
    audio.addEventListener('error', () => {
      playingId.value = null;
      if (audio?.getAttribute('src')) notify('This track couldn\'t be played.', 'error');
    });
  }
  return audio;
};

const toggle = async (track: ProjectTrack) => {
  const el = element();

  if (playingId.value === track.id) {
    el.pause();
    return;
  }

  el.src = String(track.preview);
  el.volume = player.muted ? 0 : player.volume / 100;
  player.pause();

  try {
    await el.play();
    playingId.value = track.id;
  } catch {
    playingId.value = null;
  }
};

onBeforeUnmount(() => audio?.pause());
</script>

<style lang="scss" scoped>
.track-list {
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);
}
</style>
