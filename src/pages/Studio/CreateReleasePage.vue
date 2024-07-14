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
        <q-tab name="tracks" label="Tracks" :disable="!form.title" />
        <q-tab
          name="publish"
          label="Publish"
          v-if="
            !!form.title &&
            !!form.artist_id &&
            tracks.length >= 1 &&
            !!form.draft
          "
        />
      </q-tabs>

      <q-separator />
      <q-linear-progress
        color="primary"
        track-color="grey"
        :value="uploading.total / uploading.loaded"
        v-if="uploading.loaded && uploading.loaded <= 1"
      />

      <q-form @submit="save">
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
                              (!track.id || track.defaultStream)
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
              class="p-2 m-3 text-center text-green-800 border border-green-800 border-solid bg-green-50 rounded-xl"
            >
              <span class="text-lg">
                Once your release is published, it will become available to
                everyone, by publishing this release you acknowledge that you
                have read and accepted our
                <router-link
                  :to="{
                    name: 'home',
                  }"
                >
                  <span class="text-info">Terms of Service</span>
                </router-link>
                and our
                <router-link
                  :to="{
                    name: 'home',
                  }"
                >
                  <span class="text-info">Privacy Policy.</span>
                </router-link>
              </span>

              <template v-slot:action>
                <div class="flex justify-center w-full">
                  <q-btn
                    label="Publish Now"
                    class="font-semibold !flex-none rounded-xl"
                    icon="fas fa-check-circle"
                    :loading="saving"
                    @click="
                      () => {
                        form.draft = 0;
                        form.publish = 1;
                        save();
                      }
                    "
                  />
                </div>
              </template>
            </q-banner>
          </q-tab-panel>
        </q-tab-panels>

        <div
          class="justify-end gap-2 mt-4 text-center md:flex md:items-center md:col-span-2"
          v-if="tab !== 'publish'"
        >
          <q-btn
            no-caps
            outline
            type="submit"
            color="primary"
            class="mb-5 text-xl rounded-lg md:!mb-0"
            label="Cancel"
          />
          <q-btn
            no-caps
            type="submit"
            color="primary"
            class="mb-5 text-xl rounded-lg md:!mb-0"
            label="Save"
            :loading="saving"
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
import { genres } from 'src/utils/dummy';
import { useForm } from '@alova/scene-vue';
import {
  createReleaseRequest,
  loadProjectRequest,
  loadReleaseRequest,
  saveTrackRequest,
} from 'src/utils/requests/requests';
import { trackErrorStep } from 'src/utils/navigations';
import { useRoute, useRouter } from 'vue-router';
import { useBootstrapStore } from 'src/stores/bootstrap-store';
import { notify, subString } from 'src/utils/helpers';
import { allowedAudioExts } from 'src/utils/presets';

defineOptions({
  async preFetch({ currentRoute, store }) {
    const boot = useBootstrapStore(store);
    let tracks = [] as Track[];
    let release = {} as Release;
    let project = {} as Project;
    const id = currentRoute.params.release_id as string;
    const pid = currentRoute.params.project_id as string;

    // Load Release
    if (id) {
      release = await loadReleaseRequest(id, {
        with: 'artist,genre,tracks,project,streamUrl',
      }).send();

      tracks = release.tracks ?? [];
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

      if (project.tracks) {
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
    } as unknown as GenericData;
  },
});

const tab = ref<'basic' | 'meta' | 'tracks' | 'publish'>('basic');
const file = ref<File | File[]>();
const route = useRoute();
const router = useRouter();
const uploader = ref();
const fileInputRefs = ref<HTMLInputElement[]>([]);

const curr = useBootstrapStore().pageData.current as unknown as {
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
    draft: curr.release.draft ? 1 : 0,
    pline: curr.release.pline || '',
    privacy: curr.release.privacy || 'public',
    explicit: curr.release.explicit ? 1 : 0,
    genre_id: curr.release.genre_id || genres[0].id,
    contains_music: curr.release.contains_music,
  } as unknown as Release & UploadData,
});

onError(({ error }) => {
  Object.keys(error.errors).map((e) => {
    const i = e.split('tracks.')?.[1];
    if (i) {
      tracks.value[parseInt(i)].hasError = true;
    }
  });
});

onSuccess(({ data }) => {
  form.value.draft = data.data?.draft ? 1 : 0;
  form.value.publish = 0;
  tab.value = 'basic';
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
    genre_id: genres[0].id,
    release: form.value,
    audio: File,
  } as unknown as Track & UploadData,
});

onTrackError(({ error }: { error: ResponseBody<string[]> }) => {
  tab.value = trackErrorStep(error.errors as GenericData);
});

const tempFiles = ref<(File | undefined)[]>([]);
const streamUrls = ref<string[]>([]);

const setFile = (event: HTMLInputEvent, i: number) => {
  tempFiles.value[i] = event.target.files?.[0];
  tracks.value[i].audio = tempFiles.value[i];
  if (!streamUrls.value[i]) {
    streamUrls.value[i] = tracks.value[i].streamUrl;
  }
  tracks.value[i].streamUrl = URL.createObjectURL(tempFiles.value[i] as File);
};

const resetTrack = (i: number) => {
  delete tempFiles.value[i];
  tracks.value[i].audio = undefined;
  if (!!streamUrls.value[i]) {
    tracks.value[i].streamUrl = streamUrls.value[i];
    delete streamUrls.value[i];
  }
};

const processUpload = (files?: File[]) => {
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
