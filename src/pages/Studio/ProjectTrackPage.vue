<template>
  <q-page class="p-3 md:p-4">
    <!-- Track header and actions -->
    <div class="flex items-center gap-3 mb-3 no-wrap">
      <q-btn
        flat
        round
        dense
        class="!flex-none"
        aria-label="Back to the project"
        :icon="ionArrowBack"
        :to="{ name: 'studio.project', params: { project_id: project.id } }"
      />
      <div class="min-w-0">
        <div class="text-xl font-bold truncate">{{ track.title }}</div>
        <div class="text-sm truncate text-grey-5">
          {{ project.title }} • {{ stems.length }} {{ stems.length === 1 ? 'stem' : 'stems' }}
          <template v-if="project.released"> • Released, view only</template>
        </div>
      </div>
      <div class="flex items-center gap-2 ml-auto !flex-none no-wrap" v-if="!project.released">
        <q-badge rounded color="orange" class="max-sm:!hidden" v-if="dirty">Unsaved changes</q-badge>
        <q-btn
          unelevated
          no-caps
          rounded
          color="primary"
          :icon="ionSave"
          :label="$q.screen.gt.xs ? 'Save' : undefined"
          :loading="saving"
          :disable="!stems.length || !editorReady"
          @click="save()"
        >
          <q-tooltip>Save the arrangement{{ conf.previews_on_save ? ' and its preview' : '' }}</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          :icon="ionCloudUpload"
          aria-label="Save with a preview"
          :loading="rendering"
          :disable="!stems.length || !editorReady || saving"
          @click="save(true)"
          v-if="!conf.previews_on_save"
        >
          <q-tooltip>Save, and mix the stems into the track's preview</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- Stems, assets and conversation -->
    <div class="flex flex-wrap items-center gap-1 mb-3">
      <input
        multiple
        type="file"
        class="hidden"
        ref="fileInput"
        :accept="allowedAudioExts.join(', ')"
        @change="onFilesPicked"
      />
      <ActionButton
        label="Add stems"
        :icon="ionAddCircle"
        :expanded="expanded"
        :loading="uploading > 0"
        :disable="project.released"
        @click="fileInput?.click()"
      />
      <AssetsDialog
        :track="track"
        :stems="stems"
        :released="project.released"
        @stem-updated="renameStem"
      >
        <template #default="{ toggle }">
          <ActionButton label="Assets" :icon="ionFolderOpen" :expanded="expanded" @click="toggle" />
        </template>
      </AssetsDialog>
      <ConversationDialog
        type="ProjectTrack"
        :id="track.id"
        :params="{ limit: 30, track_id: track.id }"
      >
        <template #default="{ toggle }">
          <ActionButton label="Conversation" :icon="ionChatbubbles" :expanded="expanded" @click="toggle" />
        </template>
      </ConversationDialog>
      <ProjectTrackInfoDialog :track="track" :project="project">
        <template #default="{ toggle }">
          <ActionButton label="Track info" :icon="ionInformationCircle" :expanded="expanded" @click="toggle" />
        </template>
      </ProjectTrackInfoDialog>
      <q-btn
        flat
        round
        dense
        class="!flex-none expand-toggle"
        :class="{ 'expand-toggle--open': expanded }"
        :icon="ionChevronForward"
        :aria-label="expanded ? 'Hide labels' : 'Show labels'"
        :aria-expanded="expanded"
        @click="toggleExpanded"
      >
        <q-tooltip>{{ expanded ? 'Hide labels' : 'Show labels' }}</q-tooltip>
      </q-btn>
    </div>

    <q-no-ssr>
      <StemEditor
        ref="editor"
        :stems="stems"
        :readonly="project.released"
        commentable
        @comment="messageAboutRegion"
        @ready="editorReady = true"
        @dirty="dirty = $event"
        @remove="removeStem"
        @files="upload"
        @change="shareChanges"
        v-if="loaded && stems.length"
      />

      <SimpleInfo
        class="mt-4"
        text="No stems yet. Add the parts of this track, like drums, bass and vocals, to arrange and mix them here."
        v-else-if="loaded"
      >
        <div class="flex justify-center p-4" v-if="!project.released">
          <q-btn
            no-caps
            rounded
            unelevated
            color="white"
            text-color="dark"
            class="!flex-none"
            :icon="ionAddCircle"
            label="Add stems"
            :loading="uploading > 0"
            @click="fileInput?.click()"
          />
        </div>
      </SimpleInfo>
    </q-no-ssr>

    <q-inner-loading :showing="!loaded" />
  </q-page>
</template>

<script setup lang="ts">
import {
  ionAddCircle,
  ionArrowBack,
  ionChatbubbles,
  ionChevronForward,
  ionCloudUpload,
  ionFolderOpen,
  ionInformationCircle,
  ionSave,
} from '@quasar/extras/ionicons-v8';
import { LocalStorage, useQuasar } from 'quasar';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useConversationStore } from 'src/stores/conversation-store';
import type { ChatRegion } from 'src/utils/requests/conversations';
import ActionButton from 'src/components/Studio/ActionButton.vue';
import AssetsDialog from 'src/components/Cards/AssetsDialog.vue';
import ConversationDialog from 'src/components/Cards/ConversationDialog.vue';
import ProjectTrackInfoDialog from 'src/components/Cards/ProjectTrackInfoDialog.vue';
import SimpleInfo from 'src/components/Alerts/SimpleInfo.vue';
import StemEditor from 'src/components/Studio/StemEditor.vue';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify } from 'src/utils/helpers';
import { useRealtimeChannel, type RealtimeMeta } from 'src/utils/realtime';
import { Project, ProjectTrack, ResponseBody, UploadData } from 'src/utils/models';
import { allowedAudioExts } from 'src/utils/presets';
import { Stem, StemMeta } from 'src/utils/daw';
import {
  deleteProjectTrackStemRequest,
  loadProjectRequest,
  loadProjectTrackRequest,
  loadProjectTrackStemRequest,
  loadProjectTrackStemsRequest,
  saveProjectTrackRequest,
  saveProjectTrackStemRequest,
  shareLiveStemsRequest,
} from 'src/utils/requests/requests';

defineOptions({
  async preFetch({ currentRoute, store }) {
    const boot = useBootstrapStore(store);
    const project = await loadProjectRequest(String(currentRoute.params.project_id), { with: 'tracks' }).send();
    const track = await loadProjectTrackRequest(project, String(currentRoute.params.track_id), {
      with: 'genre,artist',
    }).send();

    boot.pageData.current = { track, project };
  },
});

const $q = useQuasar();
const boot = useBootstrapStore();
const conf = computed(() => boot.configuration);
const current = boot.pageData.current as { track: ProjectTrack; project: Project };

const track = ref<ProjectTrack>(current.track);
const project = ref<Project>(current.project);
const stems = ref<Stem[]>([]);
const loaded = ref(false);
const editorReady = ref(false);
const dirty = ref(false);
const saving = ref(false);
const rendering = ref(false);
const uploading = ref(0);
const fileInput = ref<HTMLInputElement>();
const editor = ref<InstanceType<typeof StemEditor>>();
const route = useRoute();
const router = useRouter();
const conversations = useConversationStore();

/** Open the chat with the selected part of the track attached. */
const messageAboutRegion = (region: Omit<ChatRegion, 'trackId' | 'projectId'>) => {
  const target = { type: 'project-track' as const, id: track.value.id, title: track.value.title };
  if ($q.screen.lt.sm) {
    // The chat would cover the editor on a phone; the Messages page is roomier.
    conversations.regionDraft = { key: `project-track.${track.value.id}`, region: { ...region, trackId: track.value.id, projectId: project.value.id } };
    void router.push({ name: 'messages', params: { type: target.type, id: target.id } });
    return;
  }
  conversations.messageAboutRegion(target, { ...region, trackId: track.value.id, projectId: project.value.id });
};

/** Show a part of the track a message pointed at. */
const showRegion = (region: ChatRegion) => {
  if (!editor.value?.highlight(region)) notify('That part of the track couldn\'t be shown.', 'info');
};

watch(
  () => conversations.regionFocus,
  (focus) => {
    if (!focus || String(focus.region.trackId) !== String(track.value.id)) return;
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
      setTimeout(() => showRegion({ start: Number(start), end: Number(end), stemId: stemId || null }), 300);
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

const loadStems = async () => {
  try {
    const list = (await loadProjectTrackStemsRequest(project.value, track.value).send()) as unknown as Stem[];
    // Oldest first, so stems keep their place after one is saved.
    stems.value = [...list].sort(
      (a, b) =>
        String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')) ||
        String(a.id).localeCompare(String(b.id), undefined, { numeric: true }),
    );
  } catch (e) {
    notify(errorMessage(e, 'The stems couldn\'t be loaded.'), 'error');
  } finally {
    loaded.value = true;
  }
};

/** Upload audio files as new stems and add them to the editor. */
const upload = async (files: File[]) => {
  for (const file of files) {
    uploading.value++;
    try {
      const { data } = await saveProjectTrackStemRequest(
        { src: file, title: file.name.replace(/\.[^.]+$/, ''), meta: { gain: 1 } } as UploadData,
        project.value,
        track.value,
      ).send();
      const stem = data as unknown as Stem;
      stems.value.push(stem);
      await editor.value?.addStem(stem);
    } catch (e) {
      notify(errorMessage(e, `"${file.name}" couldn't be uploaded.`), 'error');
    } finally {
      uploading.value--;
    }
  }
};

const onFilesPicked = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = '';
  if (files.length) void upload(files);
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
      await deleteProjectTrackStemRequest(String(stem.id), project.value, track.value).send();
      editor.value?.removeStem(stem.id);
      stems.value = stems.value.filter((s) => s.id !== stem.id);
      notify('Stem removed.', 'success');
    } catch (e) {
      notify(errorMessage(e, 'The stem couldn\'t be removed.'), 'error');
    }
  });
};

/** Rename a stem from the assets dialog. Its arrangement is kept. */
const renameStem = async (form: UploadData) => {
  const meta = editor.value?.snapshot()[String(form.id)];
  try {
    await saveProjectTrackStemRequest(
      { id: form.id, title: form.title, meta: (meta ?? form.meta) as UploadData['meta'] } as UploadData,
      project.value,
      track.value,
    ).send();
    if (form.id !== undefined) editor.value?.renameStem(form.id, form.title || '');
  } catch (e) {
    notify(errorMessage(e, 'The stem couldn\'t be renamed.'), 'error');
  }
};

/**
 * Save every stem's arrangement. With `withPreview`, or when the site
 * renders previews on every save, the mix is also saved as the preview.
 */
const save = async (withPreview = false) => {
  const ed = editor.value;
  if (!ed) return;

  ed.stop();
  saving.value = true;

  try {
    const metas = ed.snapshot();
    const form = {
      ...track.value,
      preview: undefined,
      stems: Object.entries(metas).map(([id, meta]) => ({ id, meta })) as unknown as StemMeta[],
    } as unknown as ProjectTrack;

    if (withPreview || conf.value.previews_on_save) {
      rendering.value = true;
      form.preview = await ed.render();
    }

    await saveProjectTrackRequest(form, project.value).send();

    // Keep the saved arrangement, so leaving and coming back shows it.
    stems.value = stems.value.map((s) => ({ ...s, meta: metas[String(s.id)] ?? s.meta }));
    ed.markSaved();
    notify(form.preview ? 'Saved, with a new preview.' : 'Saved.', 'success');
  } catch (e) {
    notify(errorMessage(e, 'The track couldn\'t be saved.'), 'error');
  } finally {
    saving.value = false;
    rendering.value = false;
  }
};

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

const who = (e: RealtimeMeta) => e.by?.name || 'A collaborator';
const findStem = (id: string | number) => stems.value.find((s) => String(s.id) === String(id));

useRealtimeChannel(
  () => (track.value?.id ? `project-track.${track.value.id}` : null),
  {
    'stems.updated': (e: RealtimeMeta & { stems: Record<string, StemMeta> }) => {
      for (const [id, meta] of Object.entries(e.stems || {})) editor.value?.applyRemote(id, meta);
    },
    'stem.added': async (e: RealtimeMeta & { stem_id: string | number }) => {
      if (findStem(e.stem_id)) return;
      try {
        const stem = (await loadProjectTrackStemRequest(e.stem_id, project.value, track.value).send()) as unknown as Stem;
        if (findStem(stem.id)) return;
        stems.value.push(stem);
        await editor.value?.addStem(stem);
        notify(`${who(e)} added "${stem.title || stem.name}".`, 'info');
      } catch {
        // It may have been removed already.
      }
    },
    'stem.updated': (e: RealtimeMeta & { stem_id: string | number; title?: string; meta?: StemMeta }) => {
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
      notify(`${who(e)} removed "${stem.title || stem.name}".`, 'info');
    },
    'track.saved': (e: RealtimeMeta & { title?: string; stems?: Record<string, StemMeta> | null }) => {
      if (e.title) track.value.title = e.title;
      for (const [id, meta] of Object.entries(e.stems || {})) {
        editor.value?.applyRemote(id, meta, true);
        const stem = findStem(id);
        if (stem) stem.meta = { ...stem.meta, ...meta };
      }
      notify(`${who(e)} saved the track.`, 'info');
    },
  },
);

const warnBeforeUnload = (e: BeforeUnloadEvent) => {
  if (!dirty.value) return;
  e.preventDefault();
};

onBeforeRouteLeave(() => {
  if (!dirty.value) return true;
  return new Promise<boolean>((resolve) => {
    $q.dialog({
      dark: true,
      title: 'Unsaved changes',
      message: 'You have changes that aren\'t saved. Leave without saving?',
      cancel: { label: 'Stay', flat: true },
      ok: { label: 'Leave', color: 'negative', unelevated: true },
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });
});

onMounted(() => {
  try {
    expanded.value = LocalStorage.getItem<boolean>('studio.actions.expanded') === true;
  } catch {
    expanded.value = false;
  }
  window.addEventListener('beforeunload', warnBeforeUnload);
  void loadStems();
});

onBeforeUnmount(() => window.removeEventListener('beforeunload', warnBeforeUnload));
</script>

<style lang="scss" scoped>
.expand-toggle :deep(.q-icon) {
  transition: transform 0.3s ease;
}

.expand-toggle--open :deep(.q-icon) {
  transform: rotate(180deg);
}
</style>
