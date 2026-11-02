<template>
  <q-page class="p-2 sm:p-3 md:p-4">
    <!-- Track header and actions -->
    <div class="flex items-center gap-2 mb-2 no-wrap">
      <IconBtn
        class="flex-none!"
        aria-label="Back to the project"
        icon="lucide-arrow-left"
        :to="viewOnly ? { name: 'project', params: { project_id: project.slug } } : { name: 'studio.project', params: { project_id: project.id } }"
      />
      <div class="studio-title">
        <h1 class="studio-title__name" :title="track.title">{{ track.title }}</h1>
        <div class="studio-title__meta">
          <router-link
            class="hover:underline"
            :to="{ name: 'studio.project', params: { project_id: project.id } }"
            >{{ project.title }}</router-link
          >
          • {{ stems.length }} {{ stems.length === 1 ? 'stem' : 'stems' }}
          <template v-if="project.released"> • Released</template>
          <template v-if="viewOnly"> • View only</template>
        </div>
        <!-- On phones the tags sit at the end of the tools row instead -->
        <AudioTagChips
          class="studio-title__tags max-sm:hidden!"
          :tags="track.tags"
          :styles="track.styles ?? null"
          :genre-id="track.genreId"
          :editable="!viewOnly"
          :target="{ projectId: project.id, trackId: track.id }"
          @update:tags="track.tags = $event"
          @update:styles="track.styles = $event"
        />
        <q-btn
          flat
          dense
          no-caps
          size="sm"
          class="flex-none! text-grey-4 max-sm:hidden!"
          :label="`Use ${Math.round(track.tags?.bpm || 0)} BPM`"
          title="Set the studio tempo to the detected tempo"
          @click="useTagTempo"
          v-if="tagTempoDiffers"
        />
      </div>
      <div
        class="flex items-center gap-2 ml-auto flex-none! no-wrap"
        v-if="!viewOnly"
      >
        <q-badge
          rounded
          color="grey-9"
          class="mix-badge max-sm:hidden!"
          v-if="rendering"
        >
          <q-spinner-audio size="11px" color="toneflix" class="mr-1" />
          Mixing preview
          <q-tooltip>Mixing the saved stems into the preview</q-tooltip>
        </q-badge>
        <q-badge
          rounded
          color="orange"
          class="max-sm:hidden!"
          v-if="dirty || tempoDirty"
          >Unsaved changes</q-badge
        >
        <q-btn
          unelevated
          no-caps
          rounded
          color="primary"
          icon="lucide-save"
          :label="$q.screen.gt.xs ? 'Save' : undefined"
          :loading="saving"
          :disable="(!stems.length && !tempoDirty) || !editorReady"
          @click="save()"
        >
          <q-tooltip
            >Save the arrangement{{
              conf.previews_on_save ? ' and its preview' : ''
            }}</q-tooltip
          >
        </q-btn>
        <q-btn
          flat
          round
          icon="lucide-cloud-upload"
          aria-label="Save with a preview"
          :loading="rendering"
          :disable="!stems.length || !editorReady || saving"
          @click="save(true)"
          v-if="!conf.previews_on_save"
        >
          <q-tooltip
            >Save, and mix the stems into the track's preview</q-tooltip
          >
        </q-btn>
      </div>
    </div>

    <!-- Stems, assets and conversation. One row that scrolls sideways on phones. -->
    <div class="studio-tools">
      <input
        multiple
        type="file"
        class="hidden"
        ref="fileInput"
        :accept="acceptFor(audioExts())"
        @change="onFilesPicked"
      />
      <ActionButton
        label="Add stems"
        icon="lucide-circle-plus"
        :expanded="expanded"
        :loading="uploading > 0"
        :disable="viewOnly"
        @click="fileInput?.click()"
      />
      <SoundsPanel
        ref="soundsPanel"
        :project-id="project.id"
        :track-id="track.id"
        :playhead="() => editor?.currentTime() ?? 0"
        :disabled="!editorReady"
        dock="#studio-dock"
        @added="addStemFromSound"
        v-if="!viewOnly"
      >
        <template #default="{ toggle, open }">
          <ActionButton
            label="Sounds"
            icon="lucide-music"
            :expanded="expanded"
            :active="open"
            :disable="!editorReady"
            @click="toggle"
          />
        </template>
      </SoundsPanel>
      <AiPanel
        ref="aiPanel"
        :project-id="project.id"
        :track-id="track.id"
        :stems="stems"
        :song-lyrics="track.song?.body"
        :details="musicDetails"
        :artist-id="track.artistId"
        :disabled="!editorReady"
        dock="#studio-dock"
        @finished="onAiFinished"
        :live="trackLive"
        @job="(e: AiJob) => lyricsPanel?.onJob(e)"
        v-if="!viewOnly"
      >
        <template #default="{ toggle, open, busy }">
          <ActionButton
            label="AI tools"
            icon="lucide-sparkles"
            :expanded="expanded"
            :active="open"
            :glow="busy"
            @click="toggle"
          />
        </template>
      </AiPanel>
      <LyricsPanel
        ref="lyricsPanel"
        :project-id="project.id"
        :track-id="track.id"
        :stems="stems"
        :readonly="viewOnly"
        :disabled="!editorReady"
        :playhead="() => editor?.currentTime() ?? 0"
        :seek="(s: number) => editor?.seek(s)"
        :live="trackLive"
        dock="#studio-dock"
      >
        <template #default="{ toggle, open, busy }">
          <ActionButton
            label="Lyrics"
            icon="lucide-file-text"
            :expanded="expanded"
            :active="open"
            :glow="busy"
            @click="toggle"
          />
        </template>
      </LyricsPanel>
      <ActionButton
        label="Instrument"
        icon="lucide-layout-grid"
        :expanded="expanded"
        :disable="!editorReady"
        @click="newInstrument"
        v-if="!viewOnly"
      />
      <HistoryPanel
        ref="historyPanel"
        :project-id="project.id"
        :track-id="track.id"
        :readonly="viewOnly"
        :dirty="dirty || tempoDirty"
        dock="#studio-dock"
        @restored="onRestored"
        v-if="!viewOnly"
      >
        <template #default="{ toggle, open }">
          <ActionButton
            label="History"
            icon="lucide-clock"
            :expanded="expanded"
            :active="open"
            @click="toggle"
          />
        </template>
      </HistoryPanel>
      <AssetsDialog
        :track="track"
        :stems="stems"
        :readonly="viewOnly"
        @stem-updated="renameStem"
      >
        <template #default="{ toggle }">
          <ActionButton
            label="Assets"
            icon="lucide-folder-open"
            :expanded="expanded"
            @click="toggle"
          />
        </template>
      </AssetsDialog>
      <ConversationDialog
        type="ProjectTrack"
        :id="track.id"
        :params="{ limit: 30, track_id: track.id }"
      >
        <template #default="{ toggle }">
          <ActionButton
            label="Conversation"
            icon="lucide-messages-square"
            :expanded="expanded"
            @click="toggle"
          />
        </template>
      </ConversationDialog>
      <ProjectTrackInfoDialog
        :track="track"
        :project="project"
        v-if="!viewOnly"
      >
        <template #default="{ toggle }">
          <ActionButton
            label="Track info"
            icon="lucide-info"
            :expanded="expanded"
            @click="toggle"
          />
        </template>
      </ProjectTrackInfoDialog>
      <ActionButton
        :label="projectReleaseLabel(project)"
        icon="lucide-disc-3"
        :expanded="expanded"
        :disable="!!releaseBlocker"
        @click="router.push(projectReleaseLink(project))"
        v-if="project.isOwner"
      />
      <AudioTagChips
        class="flex-nowrap! sm:hidden!"
        :tags="track.tags"
        :styles="track.styles ?? null"
        :genre-id="track.genreId"
        :editable="!viewOnly"
        :target="{ projectId: project.id, trackId: track.id }"
        @update:tags="track.tags = $event"
        @update:styles="track.styles = $event"
      />
      <IconBtn
        class="flex-none! expand-toggle max-sm:hidden!"
        :class="{ 'expand-toggle--open': expanded }"
        icon="lucide-chevron-right"
        :aria-label="expanded ? 'Hide labels' : 'Show labels'"
        :aria-expanded="expanded"
        @click="toggleExpanded"
      >
        <q-tooltip>{{ expanded ? 'Hide labels' : 'Show labels' }}</q-tooltip>
      </IconBtn>
    </div>

    <q-no-ssr>
      <!-- The editor, with a column on the right that panels dock into. -->
      <div class="studio-body" :style="fit" ref="studioBody">
        <div class="studio-main">
          <DawSkeleton class="daw-loading" v-if="!loaded" />
          <SimpleInfo
            class="mb-4"
            icon="lucide-audio-lines"
            text="No stems yet. Upload the parts of this track, press record, add a sound, or make a beat with an instrument."
            v-if="loaded && !stems.length && !viewOnly"
          />
          <SimpleInfo
            class="mt-8"
            icon="lucide-audio-lines"
            text="This track has no stems."
            v-if="loaded && !stems.length && viewOnly"
          />

          <StemEditor
            ref="editor"
            :stems="stems"
            :readonly="viewOnly"
            :bpm="track.bpm"
            :time-signature="track.timeSignature"
            :mix-volume="track.mixVolume"
            :master-effects="track.masterEffects"
            :arrangement="track.arrangement"
            commentable
            :ai-editable="!viewOnly"
            @comment="messageAboutRegion"
            @ai-edit="(region: SectionSelection) => aiPanel?.editSection(region)"
            @ready="editorReady = true"
            @dirty="dirty = $event"
            @remove="removeStem"
            @replace="replaceAudio"
            @duplicate="duplicateStem"
            @files="upload"
            @change="shareChanges"
            @tempo="onTempo"
            @recorded="onRecorded"
            @sound="onSound"
            @instrument="onInstrument"
            v-if="loaded && (stems.length || !viewOnly)"
          />
        </div>
        <div id="studio-dock" class="studio-dock" />
      </div>

    </q-no-ssr>
  </q-page>
</template>

<script setup lang="ts">
import { LocalStorage, useQuasar } from 'quasar';
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useConversationStore } from 'src/stores/conversation-store';
import { usePlayerStore } from 'src/stores/player-store';
import { useFitToScreen } from 'src/composables/useFitToScreen';
import type { ChatRegion } from 'src/utils/requests/conversations';
import ActionButton from 'src/components/Studio/ActionButton.vue';
import AssetsDialog from 'src/components/Cards/AssetsDialog.vue';
import ConversationDialog from 'src/components/Cards/ConversationDialog.vue';
import ProjectTrackInfoDialog from 'src/components/Cards/ProjectTrackInfoDialog.vue';
import AudioTagChips from 'src/components/Utilities/AudioTagChips.vue';
import type { AudioTags, StyleTags } from 'src/utils/requests/tags';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import StemEditor from 'src/components/Studio/StemEditor.vue';
import SoundsPanel from 'src/components/Studio/SoundsPanel.vue';
import { addSoundToTrackRequest } from 'src/utils/requests/sounds';
import HistoryPanel from 'src/components/Studio/HistoryPanel.vue';
import AiPanel from 'src/components/Studio/AiPanel.vue';
import LyricsPanel from 'src/components/Studio/LyricsPanel.vue';
import type { Lyrics } from 'src/utils/requests/lyrics';
import type { AiJob } from 'src/utils/requests/ai';
import { readInstrument, type InstrumentKind } from 'src/utils/studio/instrument-notes';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { useRealtimeChannel, type RealtimeMeta } from 'src/utils/realtime';
import {
  MixState,
  Project,
  ProjectTrack,
  ResponseBody,
  UploadData,
} from 'src/utils/models';
import { acceptFor, audioExts } from 'src/utils/presets';
import {
  projectReleaseBlocker,
  projectReleaseLabel,
  projectReleaseLink,
} from 'src/utils/navigations';
import { SectionSelection, Stem, StemMeta } from 'src/utils/daw';
import { stemAudio } from 'src/utils/studio/stem-audio';
import {
  deleteProjectTrackStemRequest,
  duplicateProjectTrackStemRequest,
  loadProjectRequest,
  loadProjectTrackRequest,
  loadProjectTrackStemRequest,
  loadProjectTrackStemsRequest,
  saveProjectTrackRequest,
  uploadProjectTrackMixRequest,
  saveProjectTrackStemRequest,
  shareLiveStemsRequest,
} from 'src/utils/requests/requests';
import DawSkeleton from 'src/components/Skeletons/DawSkeleton.vue';

defineOptions({
  async preFetch({ currentRoute, store, redirect }) {
    const boot = useBootstrapStore(store);
    // The public endpoint serves the project's people and, for public projects, visitors.
    const project = await loadProjectRequest(
      String(currentRoute.params.project_id),
      { with: 'tracks' },
      true,
    ).send();

    // Preview-only projects play on their page; their studio stays closed.
    if (project.opensStudio === false) {
      redirect({ name: 'project', params: { project_id: project.slug } });
      return;
    }
    const track = await loadProjectTrackRequest(
      project,
      String(currentRoute.params.track_id),
      {
        with: 'genre,artist',
      },
    ).send();

    boot.pageData.current = { track, project };
  },
});

const $q = useQuasar();
const boot = useBootstrapStore();
const conf = computed(() => boot.configuration);
const current = boot.pageData.current as {
  track: ProjectTrack;
  project: Project;
};

const track = ref<ProjectTrack>(current.track);
const project = ref<Project>(current.project);

/** Only the owner and collaborators can change the track. */
const viewOnly = computed(
  () => !project.value.isOwner && !project.value.isCollaber,
);
const stems = ref<Stem[]>([]);
const loaded = ref(false);
const editorReady = ref(false);
const dirty = ref(false);

// Saved stems on this track also make the project ready to release.
const releaseBlocker = computed(() =>
  projectReleaseBlocker({
    ...project.value,
    ready: project.value.ready || (stems.value.length > 0 && !dirty.value),
  }),
);

/** The tempo or meter changed since the last save */
const tempoDirty = ref(false);
const saving = ref(false);
const uploading = ref(0);
const fileInput = ref<HTMLInputElement>();
const editor = ref<InstanceType<typeof StemEditor>>();
const soundsPanel = ref<InstanceType<typeof SoundsPanel>>();
const historyPanel = ref<InstanceType<typeof HistoryPanel>>();
const studioBody = ref<HTMLElement>();
const { style: fit, measure: fitBody } = useFitToScreen(studioBody);
// The body only appears once the track has loaded.
watch(loaded, () => fitBody());
const aiPanel = ref<InstanceType<typeof AiPanel>>();

/** The track's genre and its song's mood, tempo and key, for describing AI music */
const musicDetails = computed(() => {
  const t = track.value;
  const song = t.song;
  // 120 is the studio's default tempo, so it says nothing about the song.
  const studioBpm = t.bpm && t.bpm !== 120 ? t.bpm : null;
  return {
    genre: t.genre?.title ?? null,
    mood: song?.mood ?? null,
    bpm: song?.bpm || t.tags?.bpm || studioBpm,
    key: song?.key || t.tags?.key || null,
  };
});
const lyricsPanel = ref<InstanceType<typeof LyricsPanel>>();
const route = useRoute();
const router = useRouter();
const conversations = useConversationStore();

/** Open the chat with the selected part of the track attached. */
const messageAboutRegion = (
  region: Omit<ChatRegion, 'trackId' | 'projectId'>,
) => {
  const target = {
    type: 'project-track' as const,
    id: track.value.id,
    title: track.value.title,
  };
  if ($q.screen.lt.sm) {
    // The chat would cover the editor on a phone; the Messages page is roomier.
    conversations.regionDraft = {
      key: `project-track.${track.value.id}`,
      region: {
        ...region,
        trackId: track.value.id,
        projectId: project.value.id,
      },
    };
    void router.push({
      name: 'messages',
      params: { type: target.type, id: target.id },
    });
    return;
  }
  conversations.messageAboutRegion(target, {
    ...region,
    trackId: track.value.id,
    projectId: project.value.id,
  });
};

/** Show a part of the track a message pointed at. */
const showRegion = (region: ChatRegion) => {
  if (!editor.value?.highlight(region))
    notify("That part of the track couldn't be shown.", 'info');
};

watch(
  () => conversations.regionFocus,
  (focus) => {
    if (!focus || String(focus.region.trackId) !== String(track.value.id))
      return;
    conversations.regionFocus = null;
    if (editorReady.value) showRegion(focus.region);
  },
);

// Opened from a message elsewhere: ?region=start~end~stemId
watch(
  () => [editorReady.value, route.query.region] as const,
  ([ready, query]) => {
    if (!ready || typeof query !== 'string') return;
    const [start, end, stemId] = query.split('~');
    if (Number.isFinite(Number(start)) && Number.isFinite(Number(end))) {
      // Give the editor a moment to lay out before scrolling.
      setTimeout(
        () =>
          showRegion({
            start: Number(start),
            end: Number(end),
            stemId: stemId || null,
          }),
        300,
      );
    }
    void router.replace({ query: { ...route.query, region: undefined } });
  },
  { immediate: true },
);

/** Whether the action buttons show their labels; remembered on this device */
const expanded = ref(false);
const toggleExpanded = () => {
  expanded.value = !expanded.value;
  try {
    LocalStorage.set('studio.actions.expanded', expanded.value);
  } catch {
    // Storage can be unavailable, e.g. in private browsing.
  }
};

const errorMessage = (e: unknown, fallback: string) =>
  (e as ResponseBody)?.message || (e as Error)?.message || fallback;

const loadStems = async (fresh = false) => {
  try {
    const list = (await loadProjectTrackStemsRequest(
      project.value,
      track.value,
    ).send(fresh)) as unknown as Stem[];
    // In the order they were arranged, then oldest first.
    const place = (s: Stem) => {
      const order = Number(s.meta?.order);

      return Number.isFinite(order) && s.meta?.order !== undefined ? order : Infinity;
    };

    stems.value = [...list].sort(
      (a, b) =>
        place(a) - place(b) ||
        String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) ||
        String(a.id).localeCompare(String(b.id), undefined, { numeric: true }),
    );
  } catch (e) {
    notify(errorMessage(e, "The stems couldn't be loaded."), 'error');
  } finally {
    loaded.value = true;
  }
};

/** Send a stem's audio, showing its progress in the editor. */
const sendStem = async (data: UploadData, key: string, name: string) => {
  const progress = editor.value?.trackUpload(key, name);
  const request = saveProjectTrackStemRequest(data, project.value, track.value);
  const stop = request.onUpload(({ loaded, total }) =>
    progress?.progress(loaded, total),
  );

  try {
    const { data: stem } = await request.send();
    if (data.src instanceof File)
      await stemAudio.put(stem as unknown as Stem, data.src);
    return stem as unknown as Stem;
  } finally {
    stop();
    progress?.done();
  }
};

/**
 * Add audio files as new stems. Each one is on the timeline right away and
 * uploads in the background.
 */
const upload = (files: File[]) =>
  Promise.all(
    files.map(async (file) => {
      const title = file.name.replace(/\.[^.]+$/, '');
      uploading.value++;
      const trackId = (await editor.value?.addLocal(file, title)) ?? null;

      try {
        const stem = await sendStem(
          { src: file, title, meta: { gain: 1 } } as UploadData,
          trackId ?? title,
          title,
        );
        stems.value.push(stem);
        if (trackId) editor.value?.adoptStem(trackId, stem);
        else await editor.value?.addStem(stem);
      } catch (e) {
        if (trackId) editor.value?.dropTrack(trackId);
        notify(errorMessage(e, `"${file.name}" couldn't be uploaded.`), 'error');
      } finally {
        uploading.value--;
      }
    }),
  );

/** Give a stem new audio, keeping its place and settings on the track. */
const replaceAudio = async (stem: Stem, file: File) => {
  uploading.value++;
  try {
    const meta: Partial<StemMeta> = { ...stem.meta };
    delete meta.src;
    const updated = await sendStem(
      { id: stem.id, src: file, title: stem.title, meta } as unknown as UploadData,
      `replace-${stem.id}`,
      stem.title || stem.name,
    );
    stems.value = stems.value.map((s) => (s.id === updated.id ? updated : s));
    editor.value?.removeStem(updated.id);
    await editor.value?.addStem(updated);
    notify(`"${updated.title || updated.name}" has its audio back.`, 'success');
    historyPanel.value?.refresh();
  } catch (e) {
    notify(errorMessage(e, `"${file.name}" couldn't be uploaded.`), 'error');
  } finally {
    uploading.value--;
  }
};

/** Copy a stem onto the track, just below the original. Its audio is reused from this device. */
const duplicateStem = async (stem: Stem, meta: StemMeta) => {
  uploading.value++;
  try {
    // An instrument stem is only its notes, so the copy is a new stem with them.
    if (readInstrument({ ...stem, meta })) {
      const copy = await sendStem({ title: stem.title, meta } as unknown as UploadData, `copy-${stem.id}`, stem.title || 'Copy');
      stems.value.push(copy);
      await editor.value?.addStem(copy);
      if (meta.order !== undefined) editor.value?.moveStem(copy.id, meta.order);
      historyPanel.value?.refresh();
      return;
    }

    const { data } = await duplicateProjectTrackStemRequest(
      stem.id,
      project.value,
      track.value,
      meta,
    ).send();
    const copy = data as unknown as Stem;
    try {
      await stemAudio.put(copy, await stemAudio.get(stem));
    } catch {
      // It downloads like any other stem instead.
    }
    stems.value.push(copy);
    await editor.value?.addStem(copy);
    if (meta.order !== undefined) editor.value?.moveStem(copy.id, meta.order);
    historyPanel.value?.refresh();
  } catch (e) {
    notify(errorMessage(e, "The stem couldn't be duplicated."), 'error');
  } finally {
    uploading.value--;
  }
};

const onFilesPicked = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  if (files.length) void upload(files);
};

/** A sound from the sounds panel was added as a stem. */
const addStemFromSound = async (stem: Stem) => {
  if (findStem(stem.id)) return;
  stems.value.push(stem);
  await editor.value?.addStem(stem);
};

/** Put the stems an AI job made on the timeline. */
const onAiFinished = async (job: AiJob) => {
  const added: string[] = [];
  for (const id of job.stems) {
    if (findStem(id)) continue;
    try {
      const stem = (await loadProjectTrackStemRequest(
        id,
        project.value,
        track.value,
      ).send()) as unknown as Stem;
      if (findStem(stem.id)) continue;
      stems.value.push(stem);
      await editor.value?.addStem(stem);
      added.push(stem.title || String(stem.name));
    } catch {
      // It may have been removed already.
    }
  }
  // A section edit plays in place of the stem it was made from.
  const original = job.muted != null ? findStem(job.muted) : undefined;
  if (original && !original.meta?.muted) {
    original.meta = { ...original.meta, muted: true };
    editor.value?.applyRemote(original.id, original.meta, true);
  }
  if (added.length)
    notify(
      added.length === 1
        ? `"${added[0]}" is ready.`
        : `${added.length} new stems are ready.`,
      'success',
    );
  historyPanel.value?.refresh();
};

/** Whether the tagged tempo is off from the beat grid's tempo */
const tagTempoDiffers = computed(
  () =>
    !viewOnly.value &&
    !!track.value.tags?.bpm &&
    Math.abs(track.value.tags.bpm - (track.value.bpm || 120)) >= 0.5,
);

const useTagTempo = () =>
  onTempo({
    bpm: track.value.tags?.bpm || 120,
    timeSignature: track.value.timeSignature || '4/4',
  });

const onTempo = ({
  bpm,
  timeSignature,
}: {
  bpm: number;
  timeSignature: string;
}) => {
  track.value.bpm = bpm;
  track.value.timeSignature = timeSignature;
  tempoDirty.value = true;
};

/** Save a recorded take as a stem, keeping it where it was recorded. */
const onRecorded = async (take: {
  trackId: string;
  file: File;
  start: number;
  duration: number;
  name: string;
}) => {
  uploading.value++;
  try {
    const stem = await sendStem(
      {
        src: take.file,
        title: take.name,
        meta: { gain: 1, start: take.start, duration: take.duration },
      } as unknown as UploadData,
      take.trackId,
      take.name,
    );
    stems.value.push(stem);
    editor.value?.adoptStem(take.trackId, stem);
    notify(`"${take.name}" saved as a stem.`, 'success');
  } catch (e) {
    editor.value?.dropTrack(take.trackId);
    notify(errorMessage(e, "The recording couldn't be saved."), 'error');
  } finally {
    uploading.value--;
  }
};

/** Save a sound put on the timeline from the studio's browser as a stem. */
const onSound = async (sound: { trackId: string; soundId: number; start: number; name: string }) => {
  uploading.value++;
  try {
    const { data: stem } = await addSoundToTrackRequest(project.value.id, track.value.id, sound.soundId, sound.start).send();
    stems.value.push(stem);
    editor.value?.adoptStem(sound.trackId, stem);
  } catch (e) {
    editor.value?.dropTrack(sound.trackId);
    notify(errorMessage(e, `"${sound.name}" couldn't be added.`), 'error');
  } finally {
    uploading.value--;
  }
};

/** Pick an instrument and add a track that plays it. */
const newInstrument = () => {
  $q.dialog({
    dark: true,
    title: 'Add an instrument',
    message: 'Play it on the keys or draw its notes in the piano roll.',
    options: {
      type: 'radio',
      model: 'synth',
      items: [
        { label: 'Synth', value: 'synth' },
        { label: 'Drums', value: 'drums' },
        { label: 'Sampler (plays your own sounds)', value: 'sampler' },
      ],
    },
    cancel: true,
    ok: { label: 'Add', color: 'toneflix', unelevated: true },
  }).onOk((kind: InstrumentKind) => editor.value?.addInstrument(kind));
};

/** Save an instrument track made in the editor as a stem. It has notes, not audio. */
const onInstrument = async ({ trackId, title, meta }: { trackId: string; title: string; meta: StemMeta }) => {
  uploading.value++;
  try {
    const stem = await sendStem({ title, meta } as unknown as UploadData, trackId, title);
    stems.value.push(stem);
    editor.value?.adoptStem(trackId, stem);
    historyPanel.value?.refresh();
  } catch (e) {
    editor.value?.dropTrack(trackId);
    notify(errorMessage(e, `"${title}" couldn't be added.`), 'error');
  } finally {
    uploading.value--;
  }
};

const removeStem = (stem: Stem) => {
  $q.dialog({
    dark: true,
    title: 'Remove stem',
    message: `Remove "${stem.title || stem.name}" from this track? This can't be undone.`,
    cancel: true,
    ok: { label: 'Remove', color: 'negative', unelevated: true },
  }).onOk(async () => {
    try {
      await deleteProjectTrackStemRequest(
        String(stem.id),
        project.value,
        track.value,
      ).send();
      editor.value?.removeStem(stem.id);
      stems.value = stems.value.filter((s) => s.id !== stem.id);
      void stemAudio.forget(stem.id);
      notify('Stem removed.', 'success');
      historyPanel.value?.refresh();
    } catch (e) {
      notify(errorMessage(e, "The stem couldn't be removed."), 'error');
    }
  });
};

/** Rename a stem from the assets dialog. Its arrangement is kept. */
const renameStem = async (form: UploadData) => {
  const meta = editor.value?.snapshot()[String(form.id)];
  try {
    await saveProjectTrackStemRequest(
      {
        id: form.id,
        title: form.title,
        meta: (meta ?? form.meta) as UploadData['meta'],
      } as UploadData,
      project.value,
      track.value,
    ).send();
    if (form.id !== undefined)
      editor.value?.renameStem(form.id, form.title || '');
  } catch (e) {
    notify(errorMessage(e, "The stem couldn't be renamed."), 'error');
  }
};

/**
 * Save every stem's arrangement. With `withPreview`, or when the site
 * renders previews on every save, the studio then mixes the track here and
 * uploads it as the new preview.
 */
const save = async (withPreview = false) => {
  const ed = editor.value;
  if (!ed) return;

  ed.stop();
  saving.value = true;

  try {
    await ed.keepPluginStates();
    const metas = ed.snapshot();
    const render = (withPreview || conf.value.previews_on_save) && stems.value.length > 0;
    const form = {
      ...track.value,
      preview: undefined,
      mixVolume: ed.mixVolume(),
      masterEffects: ed.masterEffects(),
      arrangement: ed.arrangement(),
      stems: Object.entries(metas).map(([id, meta]) => ({
        id,
        meta,
      })) as unknown as StemMeta[],
    } as unknown as ProjectTrack;

    await saveProjectTrackRequest(form, project.value).send();

    // Keep the saved arrangement, so leaving and coming back shows it.
    stems.value = stems.value.map((s) => ({
      ...s,
      meta: metas[String(s.id)] ?? s.meta,
    }));
    track.value.mixVolume = form.mixVolume;
    track.value.masterEffects = form.masterEffects;
    track.value.arrangement = form.arrangement;
    ed.markSaved();
    tempoDirty.value = false;
    historyPanel.value?.refresh();
    if (!render) {
      notify('Saved.', 'success');
      return;
    }

    notify('Saved. Mixing the preview.', 'success');
    await mixPreview(ed);
  } catch (e) {
    notify(errorMessage(e, "The track couldn't be saved."), 'error');
  } finally {
    saving.value = false;
  }
};

/** Mix the track in the browser and upload it as the preview. */
const mixPreview = async (ed: NonNullable<typeof editor.value>) => {
  const was = track.value.mix ?? null;
  mixingHere = true;
  clearTimeout(mixTimer);
  track.value.mix = { status: 'rendering' };
  try {
    const audio = await ed.mixdown();
    if (!audio) {
      track.value.mix = was;
      notify('There is nothing to mix.', 'info');
      return;
    }

    const { data } = await uploadProjectTrackMixRequest(project.value, track.value, audio).send();
    onMix(data.mix ?? null, data);
  } catch (e) {
    onMix({ status: 'failed', error: errorMessage(e, "The preview couldn't be mixed.") });
  } finally {
    mixingHere = false;
  }
};

/** Whether the preview is being mixed. */
const rendering = computed(() => track.value.mix?.status === 'rendering');

let mixTimer: ReturnType<typeof setTimeout> | undefined;

/** Set while this page mixes the preview, so checks don't overwrite its state. */
let mixingHere = false;

/** Fetch the track's preview and mix state again. */
const refreshMix = async () => {
  if (mixingHere) return;
  try {
    const fresh = await loadProjectTrackRequest(project.value, String(track.value.id)).send(true);
    onMix(fresh.mix ?? null, fresh);
  } catch {
    onMix(track.value.mix ?? null);
  }
};

/**
 * Take the newest preview mix state, from a save, realtime or a check. While
 * it renders, check now and then in case realtime updates don't arrive.
 */
const onMix = (mix: MixState | null, fresh?: ProjectTrack) => {
  const was = track.value.mix?.status;
  track.value.mix = mix;
  if (fresh) {
    track.value.preview = fresh.preview;
    track.value.tags = fresh.tags;
    track.value.styles = fresh.styles;
  }

  clearTimeout(mixTimer);
  if (mix?.status === 'rendering') mixTimer = setTimeout(() => void refreshMix(), 4000);
  else if (was === 'rendering' && mix?.status === 'ready') notify('The preview mix is ready.', 'success');
  else if (was === 'rendering' && mix?.status === 'failed')
    notify(mix.error || "The preview couldn't be mixed.", 'error');
};

/**
 * Load the track and its stems again from the server, e.g. after a version
 * was restored. The editor starts over with what's saved.
 */
const reloadTrack = async () => {
  editor.value?.stop();
  loaded.value = false;
  editorReady.value = false;
  dirty.value = false;
  tempoDirty.value = false;
  try {
    track.value = await loadProjectTrackRequest(
      project.value,
      String(track.value.id),
    ).send(true);
  } catch {
    // Keep what we have; the stems still reload.
  }
  await loadStems(true);
};

const onRestored = () => void reloadTrack();

/**
 * Live collaboration: changes are shared as they're made, and changes from
 * everyone else on the track show up here. Nobody receives their own.
 */
const shareChanges = (changed: Record<string, StemMeta>) => {
  if (!boot.realtime || boot.realtime.driver === 'none') return;
  shareLiveStemsRequest(project.value, track.value, changed)
    .send()
    .catch(() => {
      // Not critical: the next change or a save brings everyone up to date.
    });
};

// AI jobs announce work for the person who started them too.
const who = (e: RealtimeMeta) =>
  e.by && String(e.by.id) === String(boot.user?.id)
    ? 'You'
    : e.by?.name || 'A collaborator';

const findStem = (id: string | number) =>
  stems.value.find((s) => String(s.id) === String(id));

const { live: trackLive } = useRealtimeChannel(
  () => (track.value?.id ? `project-track.${track.value.id}` : null),
  {
    'stems.updated': (
      e: RealtimeMeta & { stems: Record<string, StemMeta> },
    ) => {
      editor.value?.applyRemoteAll(e.stems || {});
    },
    'stem.added': async (e: RealtimeMeta & { stem_id: string | number }) => {
      if (findStem(e.stem_id)) return;
      try {
        const stem = (await loadProjectTrackStemRequest(
          e.stem_id,
          project.value,
          track.value,
        ).send()) as unknown as Stem;
        if (findStem(stem.id)) return;
        stems.value.push(stem);
        await editor.value?.addStem(stem);
        notify(`${who(e)} added "${stem.title || stem.name}".`, 'info');
        historyPanel.value?.refresh();
      } catch {
        // It may have been removed already.
      }
    },
    'ai.job': (e: RealtimeMeta & AiJob) => {
      if (aiPanel.value) aiPanel.value.onJob(e);
      else lyricsPanel.value?.onJob(e);
    },
    'lyrics.updated': (e: RealtimeMeta & { lyrics: Lyrics | null }) =>
      lyricsPanel.value?.onRemote(e.lyrics, who(e)),
    'stem.updated': (
      e: RealtimeMeta & {
        stem_id: string | number;
        title?: string;
        meta?: StemMeta;
      },
    ) => {
      const stem = findStem(e.stem_id);
      if (!stem) return;
      if (e.title && e.title !== stem.title) {
        stem.title = e.title;
        editor.value?.renameStem(stem.id, e.title);
      }
      if (e.meta) editor.value?.applyRemote(stem.id, e.meta);
    },
    'stem.removed': (e: RealtimeMeta & { stem_id: string | number }) => {
      const stem = findStem(e.stem_id);
      if (!stem) return;
      editor.value?.removeStem(stem.id);
      stems.value = stems.value.filter((s) => String(s.id) !== String(stem.id));
      void stemAudio.forget(stem.id);
      notify(`${who(e)} removed "${stem.title || stem.name}".`, 'info');
      historyPanel.value?.refresh();
    },
    'track.saved': (
      e: RealtimeMeta & {
        title?: string;
        bpm?: number;
        timeSignature?: string;
        stems?: Record<string, StemMeta> | null;
      },
    ) => {
      if (e.title) track.value.title = e.title;
      if (e.bpm) track.value.bpm = e.bpm;
      if (e.timeSignature) track.value.timeSignature = e.timeSignature;
      editor.value?.applyRemoteAll(e.stems || {}, true);
      for (const [id, meta] of Object.entries(e.stems || {})) {
        const stem = findStem(id);
        if (stem) stem.meta = { ...stem.meta, ...meta };
      }
      notify(`${who(e)} saved the track.`, 'info');
      historyPanel.value?.refresh();
    },
    'track.mix': () => void refreshMix(),
    'styles.updated': (e: RealtimeMeta & { styles: StyleTags }) => {
      track.value.styles = e.styles;
    },
    'tags.updated': (e: RealtimeMeta & { tags: AudioTags }) => {
      track.value.tags = e.tags;
    },
    'track.restored': async (e: RealtimeMeta) => {
      await reloadTrack();
      historyPanel.value?.refresh();
      notify(`${who(e)} restored an earlier version of the track.`, 'info');
    },
  },
);

const warnBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!dirty.value && !tempoDirty.value) return;
  e.preventDefault();
};

onBeforeRouteLeave(() => {
  if (!dirty.value && !tempoDirty.value) return true;
  return new Promise<boolean>((resolve) => {
    $q.dialog({
      dark: true,
      title: 'Unsaved changes',
      message: "You have changes that aren't saved. Leave without saving?",
      cancel: { label: 'Stay', flat: true },
      ok: { label: 'Leave', color: 'negative', unelevated: true },
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });
});

onMounted(() => {
  // Only the studio plays here: stop the player and any other audio on the page.
  usePlayerStore().pause();
  document.querySelectorAll<HTMLMediaElement>('audio, video').forEach((media) => media.pause());

  try {
    expanded.value =
      LocalStorage.getItem<boolean>('studio.actions.expanded') === true;
  } catch {
    expanded.value = false;
  }
  window.addEventListener('beforeunload', warnBeforeUnload);
  void loadStems();
  onMix(track.value.mix ?? null);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload);
  clearTimeout(mixTimer);
});
</script>

<style lang="scss" scoped>
.daw-loading {
  flex: 1 1 auto;
  min-height: 320px;
  border-radius: 12px;
  overflow: hidden;
}

/* Title, project, stem count and tags on one line; the title gives way first. */
.studio-title {
  display: flex;
  flex: 1 1 auto !important;
  flex-wrap: nowrap;
  align-items: baseline;
  gap: 10px;
  min-width: 0;

  &__name {
    flex: 0 1 auto;
    min-width: 4em;
    margin: 0;
    overflow: hidden;
    font-size: 1.15rem;
    font-weight: 700;
    line-height: 1.6;
    letter-spacing: normal;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__meta {
    flex: 0 1000 auto;
    min-width: 0;
    overflow: hidden;
    color: #9ea3ab;
    font-size: 0.85rem;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &__tags {
    flex: none;
    flex-wrap: nowrap;
    align-self: center;
  }

  > * {
    flex-grow: 0;
  }

  @media (max-width: 599px) {
    &__meta {
      display: none;
    }
  }
}

.studio-tools {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 16px;

  @media (max-width: 639.98px) {
    flex-wrap: nowrap;
    margin: 0 -8px 8px;
    padding: 0 8px;
    overflow-x: auto;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    > * {
      flex: none;
    }
  }
}

.expand-toggle :deep(.q-icon) {
  transition: transform 0.3s ease;
}

.expand-toggle--open :deep(.q-icon) {
  transform: rotate(180deg);
}

/* Sized to end at the bottom of the screen; the editor and dock fill it. */
.studio-body {
  display: flex;
  flex-wrap: nowrap;
  align-items: stretch;
  gap: 16px;
}

.studio-main {
  display: flex;
  flex: 1 1 auto !important;
  flex-direction: column;
  min-width: 0;

  > :deep(.stem-editor) {
    flex: 1 1 auto;
    min-height: 0;
  }
}

.studio-dock {
  flex: 0 0 380px !important;
  min-width: 0;

  &:empty {
    display: none;
  }
}
</style>
