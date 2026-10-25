<template>
  <q-page padding>
    <div class="max-w-full mx-auto md:max-w-2xl lg:max-w-3xl">
      <q-btn
        dense
        no-caps
        icon="arrow_back"
        label="Return to Project"
        :to="{
          name: 'studio.project',
          params: { project_id: form.project_id },
        }"
        v-if="form.project_id"
      />
      <q-tabs
        dense
        no-caps
        class="text-grey"
        active-color="primary"
        indicator-color="primary"
        align="left"
        v-model="tab"
      >
        <q-tab name="basic" label="Basic Info" />
        <q-tab name="meta" label="Meta Data" />
        <q-tab name="tracks" label="Tracks" />
        <q-tab name="publish" label="Publish" />
      </q-tabs>

      <q-separator />
      <q-linear-progress
        color="primary"
        track-color="grey"
        :value="uploading.total / uploading.loaded"
        v-if="uploading.loaded && uploading.loaded <= 1"
      />

      <q-form @submit.prevent="next">
        <q-tab-panels v-model="tab" animated>
          <q-tab-panel name="basic">
            <ReleaseBasicInfoForm
              v-model:form="form"
              :errors="errors"
              :meta="{
                title: form.title,
                username: form.artist?.username,
                imageUrl: form.imageUrl,
              }"
              :show-version="!!form.project_id"
            />
          </q-tab-panel>
          <q-tab-panel name="meta">
            <ReleaseMetaDataForm v-model:form="form" :errors="errors" />
          </q-tab-panel>
          <q-tab-panel name="tracks">
            <div class="grid gap-y-4 md:grid-cols-2 md:gap-x-4">
              <div class="col-span-2" v-if="!form.project_id">
                <label class="block mb-2 text-xl text-gray-400">
                  Upload Tracks
                </label>
                <q-file
                  outlined
                  multiple
                  bottom-slots
                  ref="uploader"
                  color="primary"
                  class="custom-q-class no-fill"
                  label="Select Files"
                  input-class="custom-input-class"
                  max-files="1"
                  :accept="allowedAudioExts.join(', ')"
                  v-model="file"
                  @update:model-value="processUpload"
                >
                  <template v-slot:prepend>
                    <q-icon name="cloud_upload" @click.stop.prevent />
                  </template>
                  <template v-slot:append>
                    <q-btn
                      outline
                      color="primary"
                      icon-right="chevron_right"
                      label="Retry"
                      :loading="loading"
                      @click="processUpload()"
                      v-if="tError"
                    />
                  </template>
                </q-file>
              </div>

              <div class="col-span-2">
                <q-list bordered separator class="rounded-borders">
                  <q-expansion-item
                    expand-separator
                    :class="{ 'rounded ring-1 ring-red-600': track.hasError }"
                    :model-value="track.hasError"
                    :key="track.id + String(i)"
                    v-for="(track, i) in tracks"
                  >
                    <template v-slot:header>
                      <q-item-section avatar>
                        <q-avatar
                          icon="fas fa-compact-disc"
                          color="white"
                          text-color="dark"
                          class="bg-white !bg-contain !bg-no-repeat !bg-center"
                          :style="{
                            backgroundImage: `linear-gradient(#da000066, #f6f6f6d9), url(${track.imageUrl}) !important`,
                          }"
                        />
                      </q-item-section>

                      <q-item-section> {{ track.title }} </q-item-section>

                      <q-item-section side v-if="$route.params.release_id">
                        <div class="items-center row">
                          <ContentRemover
                            flat
                            dense
                            round
                            size="md"
                            icon="clear"
                            color="red"
                            :id="track.id"
                            :list="(() => tracks as unknown as GenericData[])()"
                            :base-url="`creator/releases/${$route.params.release_id}/tracks`"
                            :disabled="!!track.project_track_id"
                            @click.stop.prevent
                          />
                        </div>
                      </q-item-section>
                    </template>
                    <q-card>
                      <q-card-section>
                        <ReleaseBasicInfoForm
                          hide-privacy-options
                          show-player
                          type="track"
                          v-model:form="tracks[i]"
                          :index="i + 1"
                          :errors="errors"
                          :meta="{
                            title: track.title,
                            username: track.artist?.username,
                            imageUrl: track.imageUrl,
                          }"
                          @error="track.hasError = true"
                          @error-cleared="delete track.hasError"
                        >
                          <template #avatar-bottom v-if="streamUrls[i]">
                            <q-btn
                              flat
                              dense
                              round
                              icon="refresh"
                              class="m-2 absolute-top-right"
                              v-if="streamUrls[i]"
                              @click="resetTrack(i)"
                            />
                          </template>
                          <template
                            #avatar-center
                            v-if="
                              form.draft &&
                              track.project_track_id &&
                              (!track.id || track.audioMissing)
                            "
                          >
                            <q-btn
                              dense
                              no-caps
                              rounded
                              padding="xs none"
                              unelevated
                              icon="fas fa-file-audio"
                              class="w-full mt-2 overflow-hidden text-ellipsis"
                              color="primary"
                              :label="
                                subString(
                                  tempFiles[i]?.name || 'Change Audio',
                                  12,
                                )
                              "
                              @click="fileInputRefs[i].click()"
                            />
                            <input
                              type="file"
                              class="hidden"
                              :ref="
                                (e) =>
                                  (fileInputRefs[i] = e as HTMLInputElement)
                              "
                              :accept="allowedAudioExts.join(', ')"
                              @change="(e) => setFile(e as HTMLInputEvent, i)"
                            />
                          </template>
                        </ReleaseBasicInfoForm>
                      </q-card-section>
                    </q-card>
                  </q-expansion-item>
                </q-list>
              </div>
            </div>
          </q-tab-panel>

          <q-tab-panel name="publish">
            <q-banner
              rounded
              class="p-2 m-3 text-orange-900 border border-orange-800 border-solid bg-orange-50 rounded-xl"
              v-if="missing.length"
            >
              <div class="mb-1 text-lg font-semibold">
                This release can't be published yet
              </div>
              <div class="mb-2">
                Add the following, or save it as a draft and finish later:
              </div>
              <ul class="ml-5 list-disc">
                <li :key="item.label" v-for="item in missing">
                  <a class="underline cursor-pointer" @click="goTo(item.tab)">
                    {{ item.label }}
                  </a>
                </li>
              </ul>
            </q-banner>
            <q-banner
              rounded
              class="p-2 m-3 text-center text-green-800 border border-green-800 border-solid bg-green-50 rounded-xl"
              v-else-if="form.draft"
            >
              <span class="text-lg">
                Once your release is published, it will become available to
                everyone, by publishing this release you acknowledge that you
                have read and accepted our
                <router-link :to="{ name: 'home' }">
                  <span class="text-info">Terms of Service</span>
                </router-link>
                and our
                <router-link :to="{ name: 'home' }">
                  <span class="text-info">Privacy Policy.</span>
                </router-link>
              </span>

              <template v-slot:action>
                <div class="w-full mb-3 text-left" v-if="otherVersions.length">
                  <div class="mb-1 font-semibold">
                    Retire earlier versions when this one is published
                  </div>
                  <div class="mb-2 text-sm">
                    Retired releases are no longer listed or sold. People who
                    bought them keep them, and you can bring them back from
                    your releases.
                  </div>
                  <q-checkbox
                    dense
                    color="green-9"
                    class="w-full py-1"
                    :key="release.id"
                    :val="release.id"
                    :label="versionLabel(release)"
                    v-model="retire"
                    v-for="release in otherVersions"
                  />
                </div>
              </template>
            </q-banner>
            <div class="m-3 text-center text-lg" v-else>
              This release is published. Saving updates it for everyone.
            </div>

            <div class="flex justify-center gap-2 mt-4">
              <q-btn
                no-caps
                outline
                color="primary"
                class="text-xl rounded-lg !flex-none"
                label="Save Draft"
                :loading="saving && !form.publish"
                @click="saveDraft"
                v-if="form.draft && !missing.length"
              />
              <q-btn
                no-caps
                color="primary"
                class="text-xl rounded-lg !flex-none"
                :label="form.draft ? 'Save Draft' : 'Save Changes'"
                :loading="saving"
                @click="form.draft ? saveDraft() : saveRelease(false)"
                v-if="missing.length || !form.draft"
              />
              <q-btn
                no-caps
                color="primary"
                class="text-xl rounded-lg !flex-none"
                icon="fas fa-check-circle"
                label="Publish Now"
                :loading="saving && !!form.publish"
                @click="saveRelease(true)"
                v-else
              />
            </div>
          </q-tab-panel>
        </q-tab-panels>

        <div
          class="justify-end gap-2 mt-4 text-center md:flex md:items-center md:col-span-2"
          v-if="tab !== 'publish'"
        >
          <q-btn
            no-caps
            outline
            color="primary"
            class="mb-5 text-xl rounded-lg md:!mb-0"
            label="Back"
            @click="back"
            v-if="tab !== 'basic'"
          />
          <q-btn
            no-caps
            color="primary"
            class="mb-5 text-xl rounded-lg md:!mb-0"
            label="Next"
            @click="next"
          />
        </div>
      </q-form>
      <q-inner-loading
        class="bg-gray-800/70"
        :showing="!!form.publish && saving"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import ContentRemover from 'src/components/Utilities/ContentRemover.vue';
import ReleaseBasicInfoForm from 'src/components/Forms/ReleaseBasicInfoForm.vue';
import ReleaseMetaDataForm from 'src/components/Forms/ReleaseMetaDataForm.vue';
import {
  GenericData,
  HTMLInputEvent,
  Project,
  Release,
  ResponseBody,
  Track,
  UploadData,
} from 'src/utils/models';
import { computed, ref, watch } from 'vue';
import { useGenres } from 'src/composables/useGenres';
import { useForm, useWatcher } from 'alova/client';
import {
  createReleaseRequest,
  loadCreatorReleasesRequest,
  loadProjectRequest,
  loadReleaseRequest,
  saveTrackRequest,
} from 'src/utils/requests/requests';
import { releaseErrorStep, trackErrorStep } from 'src/utils/navigations';
import { useRoute, useRouter } from 'vue-router';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify, subString } from 'src/utils/helpers';
import { allowedAudioExts } from 'src/utils/presets';
import { getAudioDuration } from 'src/utils/requests/content';
import { date } from 'quasar';

defineOptions({
  async preFetch({ currentRoute, store }) {
    const boot = useBootstrapStore(store);
    let tracks = [] as Track[];
    let release = {} as Release;
    let project = {} as Project;
    const id = currentRoute.params.release_id as string;
    const pid = currentRoute.query.project_id as string;

    // Load Release
    if (id) {
      release = await loadReleaseRequest(id, {
        with: 'artist,genre,tracks,project,streamUrl',
      }).send();

      // The API sends stemsPrice and takes stems_price.
      tracks = (release.tracks ?? []).map((track) =>
        Object.assign(track, { stems_price: track.stemsPrice ?? 0 }),
      );
      release.draft = release.draft ? 1 : 0;
      release.explicit = release.explicit ? 1 : 0;
      release.contains_music = release.contains_music ? 1 : 0;
    }

    // Load Project
    if (pid) {
      project = await loadProjectRequest(pid, {
        with: 'tracks,ready,artists,streamUrl',
      }).send();

      release.title = project.title;
      release.draft = release.id ? (release.draft ? 1 : 0) : 1;
      release.imageUrl = project.imageUrl;
      release.description = project.description;
      release.project_id = project.id;

      if (project.tracks?.length) {
        release.artist = project.tracks[0].artist;
        release.artist_id = project.tracks[0].artist_id;

        tracks = project.tracks.map((track) => {
          return {
            slug: track.slug,
            title: track.title,
            artist: track.artist,
            duration: track.duration,
            imageUrl: project.imageUrl,
            streamUrl: track.preview as string,
            privacy: track.privacy,
            genre_id: track.genre_id,
            artist_id: track.artist_id,
            description: track.description,
            project_track_id: track.id,
          } as unknown as Track;
        });
      }
    }

    // Build Data
    boot.pageData.current = {
      tracks,
      release,
      project,
    };
  },
});

const { genres, ready: genresReady } = useGenres();
const tab = ref<'basic' | 'meta' | 'tracks' | 'publish'>('basic');
const file = ref<File | File[]>();
const route = useRoute();
const router = useRouter();
const uploader = ref();
const fileInputRefs = ref<HTMLInputElement[]>([]);

const curr = useBootstrapStore().pageData.current as {
  tracks: (Track & UploadData)[];
  project: Project;
  release: Release;
};

const tracks = ref<(Track & UploadData)[]>(curr.tracks || []);

const errors = computed(
  () =>
    ((tError.value || error.value) as unknown as ResponseBody<string>)
      ?.errors || {},
);

const {
  form,
  send: save,
  error,
  loading: saving,
  onError,
  onSuccess,
} = useForm(createReleaseRequest, {
  store: false,
  initialForm: {
    ...curr.release,
    slug: curr.release.slug || '',
    draft: curr.release.id && !curr.release.draft ? 0 : 1,
    pline: curr.release.pline || '',
    privacy: curr.release.privacy || 'public',
    explicit: curr.release.explicit ? 1 : 0,
    genre_id: curr.release.genre_id || genres.value[0]?.id,
    contains_music: curr.release.contains_music,
  } as unknown as Release & UploadData,
});

// Default to the first genre once the list arrives.
genresReady.then((list) => {
  form.value.genre_id ||= list[0]?.id;
  trackForm.value.genre_id ||= list[0]?.id;
});

// The project's other published releases, which this one can retire.
const { data: projectReleases } = useWatcher(
  () => loadCreatorReleasesRequest({ project_id: form.value.project_id ?? '', limit: 50 }),
  [() => form.value.project_id],
  {
    immediate: true,
    initialData: { data: [] },
    middleware: (_, next) => (form.value.project_id ? next() : undefined),
  },
);

const otherVersions = computed(() =>
  (projectReleases.value?.data ?? []).filter(
    (release) => !release.draft && !release.retired && release.id !== form.value.id,
  ),
);

const retire = ref<(string | number)[]>([]);

const versionLabel = (release: Release) =>
  [release.title, release.version, date.formatDate(release.releaseDate, 'MMM D, YYYY')]
    .filter(Boolean)
    .join(' · ');

const steps = ['basic', 'meta', 'tracks', 'publish'] as const;

const goTo = (step: (typeof steps)[number]) => {
  tab.value = step;
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const next = () => goTo(steps[Math.min(steps.indexOf(tab.value) + 1, steps.length - 1)]);

const back = () => goTo(steps[Math.max(steps.indexOf(tab.value) - 1, 0)]);

// What publishing needs, with the step where each is filled in.
const missing = computed(() =>
  [
    { label: 'Release title', tab: 'basic', ok: !!form.value.title },
    { label: 'Genre', tab: 'basic', ok: !!form.value.genre_id },
    { label: 'Artist', tab: 'basic', ok: !!form.value.artist_id },
    { label: 'Publisher', tab: 'meta', ok: !!form.value.publisher },
    { label: 'Composer', tab: 'meta', ok: !!form.value.composer },
    { label: 'Record label', tab: 'meta', ok: !!form.value.record_label },
    { label: 'P line', tab: 'meta', ok: !!form.value.pline },
    { label: 'At least one track', tab: 'tracks', ok: tracks.value.length > 0 },
  ].filter((item) => !item.ok) as { label: string; tab: typeof tab.value }[],
);

// The draft state to go back to when a save fails.
const previousDraft = ref(form.value.draft);

const saveDraft = () => {
  previousDraft.value = form.value.draft;
  form.value.draft = 1;
  form.value.publish = 0;
  save();
};

const saveRelease = (publish: boolean) => {
  previousDraft.value = form.value.draft;
  form.value.draft = 0;
  form.value.publish = publish ? 1 : 0;
  form.value.retire = publish ? retire.value : [];
  save();
};

onError(({ error }) => {
  tab.value = releaseErrorStep(error.errors ?? {});
  form.value.draft = previousDraft.value;

  Object.keys(error.errors).map((e) => {
    const i = e.split('tracks.')?.[1];
    if (i) {
      tracks.value[parseInt(i)].hasError = true;
    }
  });
});

onSuccess(({ data }) => {
  form.value.id = data.data.id;
  form.value.draft = data.data?.draft ? 1 : 0;
  form.value.publish = 0;
  form.value.retire = [];
  retire.value = [];
  notify(data.message, data.status);
  if (!route.params.release_id) {
    router.replace({ params: { release_id: data.data.id } });
  }
});

const {
  reset,
  send: saveTrack,
  form: trackForm,
  error: tError,
  onError: onTrackError,
  loading,
  uploading,
} = useForm(saveTrackRequest, {
  initialForm: {
    slug: String(Math.floor(Math.random() * 99999999)),
    privacy: 'public',
    explicit: 0,
    genre_id: genres.value[0]?.id,
    release: form.value,
    audio: File,
  } as unknown as Track & UploadData,
});

onTrackError(({ error }: { error: ResponseBody<string[]> }) => {
  tab.value = trackErrorStep(error.errors as GenericData);
});

const tempFiles = ref<(File | undefined)[]>([]);
const streamUrls = ref<string[]>([]);

const setFile = async (event: HTMLInputEvent, i: number) => {
  tempFiles.value[i] = event.target.files?.[0];
  tracks.value[i].audio = tempFiles.value[i];
  if (!streamUrls.value[i]) {
    streamUrls.value[i] = tracks.value[i].streamUrl;
  }
  tracks.value[i].streamUrl = URL.createObjectURL(tempFiles.value[i] as File);
  tracks.value[i].duration = await getAudioDuration(tempFiles.value[i]);
};

const resetTrack = (i: number) => {
  delete tempFiles.value[i];
  tracks.value[i].audio = undefined;
  if (streamUrls.value[i]) {
    tracks.value[i].streamUrl = streamUrls.value[i];
    delete streamUrls.value[i];
  }
};

const processUpload = async (files?: File[]) => {
  if (!files && trackForm.value.audio) {
    files = [trackForm.value.audio];
  }

  if (files?.length) {
    trackForm.value.slug =
      tracks.value.length < 1 ? form.value.slug : files[0].name.slug('-');
    trackForm.value.title =
      tracks.value.length < 1 ? form.value.title : files[0].name;
    trackForm.value.title = files[0].name;
    trackForm.value.audio = files[0];
    trackForm.value.genre_id = form.value.genre_id;
    trackForm.value.artist_id = form.value.artist_id;
    trackForm.value.release = form.value;
    trackForm.value.release_id = form.value.id;
    trackForm.value.duration = await getAudioDuration(files[0]);
    saveTrack().then(({ data }) => {
      if (data) {
        reset();
        uploader.value.removeAtIndex(0);
        tempFiles.value = [];
        data.explicit = data.explicit ? 1 : 0;
        data.contains_music = data.contains_music ? 1 : 0;
        tracks.value.push(data);
        router.push({
          name: 'studio.release.create',
          params: { release_id: data.release?.id },
        });
      }
    });
  }
};

watch(
  tracks,
  (tracks) => {
    if (form.value.tracks || form.value.project_id) {
      form.value.tracks = tracks;
    }
  },
  { deep: true, immediate: true },
);
</script>
