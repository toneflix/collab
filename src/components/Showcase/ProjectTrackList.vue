<template>
  <div class="grid gap-2">
    <div class="flex items-center gap-2">
      <div class="text-lg font-bold flex-none!">Tracks</div>
      <q-btn
        round
        dense
        unelevated
        size="sm"
        color="primary"
        class="flex-none!"
        :icon="playingAll ? 'lucide-pause' : 'lucide-play'"
        :aria-label="playingAll ? 'Pause' : 'Play all'"
        @click="toggleAll"
        v-if="entries.length"
      />
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
            :color="playing(track) ? 'primary' : 'grey-9'"
            :icon="playing(track) ? 'lucide-pause' : 'lucide-play'"
            :aria-label="playing(track) ? `Pause ${track.title}` : `Play ${track.title}`"
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
        <q-item-section side v-if="project.opensStudio && !boot.isListener">
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
import { computed } from 'vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import { usePlayerStore } from 'src/stores/player-store';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import type { Project, ProjectTrack, Track } from 'src/utils/models';

/**
 * A project's tracks for its public page. They play their current preview
 * mix in the app's player, as temporary queue entries, and open in the
 * studio (read-only for visitors) when the project is public.
 */
const props = defineProps<{ project: Project }>();

const player = usePlayerStore();
const boot = useBootstrapStore();

const tracks = computed(() => props.project.tracks || []);
const member = computed(() => props.project.isOwner || props.project.isCollaber);
const source = computed(() => `project:${props.project.id}`);

const privacyNote = computed(() => {
  if (member.value) return '';
  return props.project.opensStudio ? 'Open project: watch it being made' : 'Preview only';
});

const key = (track: ProjectTrack) => `project-track-${track.id}`;

/** The tracks with a mix to play, as queue entries */
const entries = computed(() =>
  tracks.value
    .filter((track) => !!track.preview)
    .map(
      (track) =>
        ({
          id: key(track),
          title: track.title,
          imageUrl: track.imageUrl || props.project.imageUrl,
          duration: track.duration,
          playUrl: String(track.preview),
          project: { id: props.project.id, slug: props.project.slug, title: props.project.title },
        }) as Track,
    ),
);

const playing = (track: ProjectTrack) => player.isPlaying({ id: key(track) });
const playingAll = computed(() => entries.value.some((entry) => player.isPlaying(entry)));

const clock = (seconds: number) => {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const toggle = (track: ProjectTrack) => {
  if (player.isCurrent({ id: key(track) })) return player.toggle();
  const start = entries.value.findIndex((entry) => entry.id === key(track));
  return player.playTemporary(entries.value, start, source.value);
};

const toggleAll = () => {
  if (entries.value.some((entry) => player.isCurrent(entry))) return player.toggle();
  return player.playTemporary(entries.value, 0, source.value);
};
</script>

<style lang="scss" scoped>
.track-list {
  border: 1px solid var(--tf-border);
  border-radius: var(--tf-radius-lg);
  background: var(--tf-surface-1);
}
</style>
